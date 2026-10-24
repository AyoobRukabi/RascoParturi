-- Rasco Parturi-Kampaamo: booking schema
-- Design rules:
--   * Customers never touch tables. All customer actions go through Edge Functions (service_role)
--     that call the SECURITY DEFINER functions below.
--   * Business rules the owner has not confirmed are NULL in `settings`; online booking cannot be
--     enabled until every required rule is set (see booking_missing_items()).
--   * Double bookings are prevented by an exclusion constraint, not by application code.

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Settings (single row)
-- ---------------------------------------------------------------------------
create table public.settings (
  id boolean primary key default true check (id),

  -- Business details. Only values verified from the existing website are pre-filled.
  business_name text not null default 'Rasco Parturi-Kampaamo',  -- provisional until spelling is confirmed
  address text default 'Helsinginkatu 4 b, 00500 Helsinki',
  phone text default '+358458596596',
  public_email text,
  instagram_url text,
  tiktok_url text,
  google_maps_url text,

  -- Legal details (never invented; privacy page shows placeholders until set)
  legal_name text,
  business_id text,                 -- Y-tunnus
  privacy_contact_email text,
  legal_confirmed boolean not null default false,

  timezone text not null default 'Europe/Helsinki',

  -- Email
  sender_email text,                -- must be on a Resend-verified domain
  notification_email text,          -- receives "new booking" emails

  -- Booking rules: NULL = not confirmed by the owner yet
  max_days_ahead integer check (max_days_ahead between 1 and 365),
  min_notice_minutes integer check (min_notice_minutes >= 0),
  slot_interval_minutes integer check (slot_interval_minutes between 5 and 240),
  buffer_minutes integer check (buffer_minutes between 0 and 240),
  cancel_deadline_hours integer check (cancel_deadline_hours >= 0),  -- 0 = until start time
  reschedule_allowed boolean,
  reschedule_deadline_hours integer check (reschedule_deadline_hours >= 0),
  max_reschedules integer check (max_reschedules >= 0),               -- NULL = unlimited
  allow_multi_service boolean,
  allow_any_barber boolean,
  max_active_per_email integer check (max_active_per_email >= 1),     -- NULL = unlimited (anti-abuse)
  reminder_hours_before integer check (reminder_hours_before > 0),    -- NULL = no reminder email
  retention_days integer check (retention_days >= 30),                -- NULL = keep until deleted by owner

  booking_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.settings default values;

-- Shop opening hours: shown on the website only. Barber availability comes from working_hours.
create table public.opening_hours (
  weekday smallint primary key check (weekday between 0 and 6),   -- 0 = Sunday
  open_time time,
  close_time time,
  check ((open_time is null and close_time is null) or close_time > open_time)
);

-- ---------------------------------------------------------------------------
-- Barbers and calendars
-- ---------------------------------------------------------------------------
create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(display_name) between 1 and 80),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_fi text not null,
  name_en text,
  description_fi text,
  description_en text,
  category text,
  price_cents integer not null check (price_cents >= 0),
  duration_minutes integer check (duration_minutes between 5 and 480),   -- NULL = not confirmed
  active boolean not null default true,
  bookable_online boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  -- A service can only be booked online once its duration is known.
  check (not bookable_online or duration_minutes is not null)
);

create table public.barber_services (
  barber_id uuid not null references public.barbers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (barber_id, service_id)
);

create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time),
  exclude using gist (
    barber_id with =, weekday with =,
    tsrange(timestamp '2000-01-01' + start_time, timestamp '2000-01-01' + end_time) with &&
  )
);

create table public.barber_breaks (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  label text,
  check (end_time > start_time)
);

-- Holidays / unavailable dates. barber_id NULL = whole shop closed.
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references public.barbers(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (ends_at > starts_at)
);

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  buffer_minutes integer not null default 0 check (buffer_minutes >= 0),
  occupied tstzrange not null,   -- [starts_at, ends_at + buffer); maintained by trigger
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  source text not null check (source in ('online', 'admin')),
  customer_name text not null check (length(customer_name) between 1 and 100),
  customer_phone text not null check (length(customer_phone) between 5 and 30),
  customer_email text check (length(customer_email) <= 254),
  locale text not null default 'fi' check (locale in ('fi', 'en')),
  notes text check (length(notes) <= 500),
  total_price_cents integer not null check (total_price_cents >= 0),
  total_duration_minutes integer not null check (total_duration_minutes > 0),
  manage_token_hash bytea unique,      -- sha256 of the emailed token; the token itself is never stored
  reschedule_count integer not null default 0,
  cancelled_at timestamptz,
  cancelled_by text check (cancelled_by in ('customer', 'admin')),
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Online customers must give an email (confirmation + manage link). Phone/walk-in bookings made by
  -- the barber may have none.
  check (source = 'admin' or customer_email is not null),
  -- THE double-booking guard: one barber cannot have two overlapping confirmed appointments.
  constraint appointments_no_overlap exclude using gist (
    barber_id with =, occupied with &&
  ) where (status = 'confirmed')
);
create index appointments_starts_at_idx on public.appointments (starts_at);
create index appointments_email_idx on public.appointments (lower(customer_email));

create table public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  position integer not null default 0,
  -- Snapshots: later price/name/duration edits must not rewrite history.
  name_fi text not null,
  name_en text,
  price_cents integer not null,
  duration_minutes integer not null
);
create index appointment_services_appt_idx on public.appointment_services (appointment_id);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  kind text not null,
  recipient text not null,
  status text not null check (status in ('sent', 'failed')),
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);

create or replace function public.appointments_before_write() returns trigger
language plpgsql as $$
begin
  new.occupied := tstzrange(new.starts_at, new.ends_at + make_interval(mins => new.buffer_minutes));
  new.updated_at := now();
  return new;
end $$;
create trigger appointments_before_write before insert or update on public.appointments
  for each row execute function public.appointments_before_write();

-- ---------------------------------------------------------------------------
-- Row Level Security: only admins touch tables directly; anon gets nothing.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

do $$
declare t text;
begin
  foreach t in array array['settings','opening_hours','barbers','admins','services','barber_services',
    'working_hours','barber_breaks','time_off','appointments','appointment_services','email_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
                   t || '_admin_all', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.local_ts(p_date date, p_time time) returns timestamptz
language sql stable set search_path = public, pg_temp as $$
  select (p_date + p_time) at time zone (select timezone from public.settings);
$$;

-- Everything the owner still has to confirm before online booking may be switched on.
create or replace function public.booking_missing_items(s public.settings) returns text[]
language plpgsql stable set search_path = public, pg_temp as $$
declare m text[] := '{}';
begin
  if s.max_days_ahead is null then m := array_append(m, 'max_days_ahead'); end if;
  if s.min_notice_minutes is null then m := array_append(m, 'min_notice_minutes'); end if;
  if s.slot_interval_minutes is null then m := array_append(m, 'slot_interval_minutes'); end if;
  if s.buffer_minutes is null then m := array_append(m, 'buffer_minutes'); end if;
  if s.cancel_deadline_hours is null then m := array_append(m, 'cancel_deadline_hours'); end if;
  if s.reschedule_allowed is null then m := array_append(m, 'reschedule_allowed'); end if;
  if s.reschedule_allowed and s.reschedule_deadline_hours is null then m := array_append(m, 'reschedule_deadline_hours'); end if;
  if s.allow_multi_service is null then m := array_append(m, 'allow_multi_service'); end if;
  if s.allow_any_barber is null then m := array_append(m, 'allow_any_barber'); end if;
  if s.sender_email is null then m := array_append(m, 'sender_email'); end if;
  if s.notification_email is null then m := array_append(m, 'notification_email'); end if;
  if not s.legal_confirmed or s.legal_name is null or s.business_id is null then m := array_append(m, 'legal_details'); end if;
  if not exists (select 1 from public.services where active and bookable_online) then m := array_append(m, 'bookable_service'); end if;
  if not exists (select 1 from public.barbers b where b.active
                 and exists (select 1 from public.working_hours w where w.barber_id = b.id)
                 and exists (select 1 from public.barber_services bs where bs.barber_id = b.id))
  then m := array_append(m, 'barber_with_hours_and_services'); end if;
  return m;
end $$;

-- Admin dashboard: what is still missing before online booking can be enabled.
create or replace function public.booking_readiness() returns text[]
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare s public.settings;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into s from public.settings;
  return public.booking_missing_items(s);
end $$;
revoke all on function public.booking_readiness() from public, anon;
grant execute on function public.booking_readiness() to authenticated, service_role;

create or replace function public.settings_guard() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare m text[];
begin
  new.updated_at := now();
  if new.booking_enabled then
    m := public.booking_missing_items(new);
    if array_length(m, 1) is not null then
      raise exception 'booking_not_ready: %', array_to_string(m, ', ');
    end if;
  end if;
  return new;
end $$;
create trigger settings_guard before insert or update on public.settings
  for each row execute function public.settings_guard();

-- Resolve and validate a set of services into total duration/price.
create or replace function public.service_bundle(p_service_ids uuid[], p_online boolean)
returns table (total_duration integer, total_price integer)
language plpgsql stable set search_path = public, pg_temp as $$
declare s public.settings; n integer; found_n integer; bad integer;
begin
  select * into s from public.settings;
  n := coalesce(array_length(p_service_ids, 1), 0);
  if n = 0 then raise exception 'no_services'; end if;
  if (select count(distinct x) from unnest(p_service_ids) x) <> n then raise exception 'duplicate_services'; end if;
  if p_online and n > 1 and s.allow_multi_service is not true then raise exception 'multi_service_disabled'; end if;
  select count(*), count(*) filter (where not active or duration_minutes is null or (p_online and not bookable_online))
    into found_n, bad from public.services where id = any (p_service_ids);
  if found_n <> n then raise exception 'unknown_service'; end if;
  if bad > 0 then raise exception 'service_not_bookable'; end if;
  return query select sum(duration_minutes)::integer, sum(price_cents)::integer
    from public.services where id = any (p_service_ids);
end $$;

-- ---------------------------------------------------------------------------
-- Availability
-- ---------------------------------------------------------------------------
-- Internal: free start times for one local date. One row per (barber, start).
create or replace function public.compute_slots(
  p_barber uuid, p_duration integer, p_buffer integer, p_service_ids uuid[],
  p_date date, p_exclude uuid default null, p_enforce_notice boolean default true
) returns table (barber_id uuid, slot_start timestamptz)
language plpgsql stable set search_path = public, pg_temp as $$
declare s public.settings; wd integer; step integer;
begin
  select * into s from public.settings;
  wd := extract(dow from p_date)::integer;
  step := coalesce(s.slot_interval_minutes, 15);
  return query
  with cand_barbers as (
    select b.id from public.barbers b
    where b.active and (p_barber is null or b.id = p_barber)
      and not exists (
        select 1 from unnest(coalesce(p_service_ids, '{}')) sid
        where not exists (select 1 from public.barber_services bs where bs.barber_id = b.id and bs.service_id = sid))
  ), cand as (
    select w.barber_id as bid, g as st
    from public.working_hours w
    join cand_barbers cb on cb.id = w.barber_id
    cross join lateral generate_series(
      public.local_ts(p_date, w.start_time),
      public.local_ts(p_date, w.end_time) - make_interval(mins => p_duration),
      make_interval(mins => step)) g
    where w.weekday = wd
  )
  select c.bid, c.st from cand c
  where (not p_enforce_notice or c.st >= now() + make_interval(mins => coalesce(s.min_notice_minutes, 0)))
    and not exists (
      select 1 from public.barber_breaks bb
      where bb.barber_id = c.bid and bb.weekday = wd
        and tstzrange(public.local_ts(p_date, bb.start_time), public.local_ts(p_date, bb.end_time))
            && tstzrange(c.st, c.st + make_interval(mins => p_duration)))
    and not exists (
      select 1 from public.time_off t
      where (t.barber_id is null or t.barber_id = c.bid)
        and tstzrange(t.starts_at, t.ends_at) && tstzrange(c.st, c.st + make_interval(mins => p_duration)))
    and not exists (
      select 1 from public.appointments a
      where a.barber_id = c.bid and a.status = 'confirmed'
        and (p_exclude is null or a.id <> p_exclude)
        and a.occupied && tstzrange(c.st, c.st + make_interval(mins => p_duration + p_buffer)))
  order by c.st, c.bid;
end $$;

-- Public: free start times for a date. With p_barber NULL ("any barber") the barber_ids list shows who is free.
create or replace function public.available_slots(p_barber uuid, p_service_ids uuid[], p_date date)
returns table (slot_start timestamptz, barber_ids uuid[])
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare s public.settings; b record; today date;
begin
  select * into s from public.settings;
  if not s.booking_enabled then return; end if;
  if p_barber is null and s.allow_any_barber is not true then raise exception 'any_barber_disabled'; end if;
  today := (now() at time zone s.timezone)::date;
  if p_date < today or p_date > today + s.max_days_ahead then return; end if;
  select * into b from public.service_bundle(p_service_ids, true);
  return query
    select cs.slot_start, array_agg(cs.barber_id order by cs.barber_id)
    from public.compute_slots(p_barber, b.total_duration, s.buffer_minutes, p_service_ids, p_date) cs
    group by cs.slot_start order by cs.slot_start;
end $$;

-- Public: which dates in a range have at least one free slot (for the calendar picker).
create or replace function public.available_dates(p_barber uuid, p_service_ids uuid[], p_from date, p_to date)
returns date[]
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare d date; res date[] := '{}';
begin
  if p_to - p_from > 62 then raise exception 'range_too_large'; end if;
  for d in select generate_series(p_from, p_to, interval '1 day')::date loop
    if exists (select 1 from public.available_slots(p_barber, p_service_ids, d)) then res := res || d; end if;
  end loop;
  return res;
end $$;

-- ---------------------------------------------------------------------------
-- Booking mutations (service_role only; called by Edge Functions)
-- ---------------------------------------------------------------------------
create or replace function public.new_manage_token() returns text
language sql volatile as $$
  select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
$$;

create or replace function public.token_hash(p_token text) returns bytea
language sql immutable as $$ select sha256(convert_to(p_token, 'utf8')); $$;

-- Create a booking. Online: slot is re-validated server-side and "any barber" is resolved here.
-- Admin: any time, explicit barber, email optional, optional duration override; overlaps still rejected.
create or replace function public.create_booking(
  p_barber uuid, p_service_ids uuid[], p_start timestamptz,
  p_name text, p_phone text, p_email text, p_locale text,
  p_source text default 'online', p_notes text default null, p_duration_override integer default null
) returns table (appointment_id uuid, manage_token text, barber_id uuid, starts_at timestamptz, ends_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  s public.settings; bundle record; dur integer; price integer; buf integer;
  d date; cand uuid[]; bid uuid; new_id uuid; tok text; online boolean := (p_source = 'online');
begin
  select * into s from public.settings;
  p_name := btrim(p_name); p_phone := btrim(p_phone); p_email := nullif(lower(btrim(coalesce(p_email, ''))), '');
  if p_name is null or length(p_name) not between 1 and 100 then raise exception 'invalid_name'; end if;
  if p_phone !~ '^[+0-9 ()-]{5,30}$' then raise exception 'invalid_phone'; end if;
  if p_email is not null and (p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 254) then raise exception 'invalid_email'; end if;
  if online and p_email is null then raise exception 'invalid_email'; end if;
  if p_locale not in ('fi', 'en') then p_locale := 'fi'; end if;
  if p_source not in ('online', 'admin') then raise exception 'invalid_source'; end if;

  select * into bundle from public.service_bundle(p_service_ids, online);
  dur := coalesce(p_duration_override, bundle.total_duration);
  price := bundle.total_price;
  buf := case when online then s.buffer_minutes else coalesce(s.buffer_minutes, 0) end;

  if online then
    if not s.booking_enabled then raise exception 'booking_disabled'; end if;
    if p_barber is null and s.allow_any_barber is not true then raise exception 'any_barber_disabled'; end if;
    if s.max_active_per_email is not null and (
       select count(*) from public.appointments a
       where a.status = 'confirmed' and a.starts_at > now() and lower(a.customer_email) = p_email) >= s.max_active_per_email
    then raise exception 'too_many_bookings'; end if;
    d := (p_start at time zone s.timezone)::date;
    select array_agg(distinct cs.barber_id) into cand
    from public.compute_slots(p_barber, dur, buf, p_service_ids, d) cs
    where cs.slot_start = p_start
      and d between (now() at time zone s.timezone)::date and (now() at time zone s.timezone)::date + s.max_days_ahead;
  else
    if p_barber is null then raise exception 'barber_required'; end if;
    cand := array[p_barber];
  end if;
  if cand is null then raise exception 'slot_unavailable'; end if;

  d := (p_start at time zone s.timezone)::date;
  tok := public.new_manage_token();
  -- "Any barber": try the least busy candidate first; the exclusion constraint settles races.
  for bid in
    select c from unnest(cand) c
    order by (select count(*) from public.appointments a
              where a.barber_id = c and a.status = 'confirmed' and (a.starts_at at time zone s.timezone)::date = d), c
  loop
    begin
      insert into public.appointments (barber_id, starts_at, ends_at, buffer_minutes, source, customer_name,
        customer_phone, customer_email, locale, notes, total_price_cents, total_duration_minutes, manage_token_hash)
      values (bid, p_start, p_start + make_interval(mins => dur), buf, p_source, p_name, p_phone, p_email,
        p_locale, left(p_notes, 500), price, dur, public.token_hash(tok))
      returning id into new_id;
      insert into public.appointment_services (appointment_id, service_id, position, name_fi, name_en, price_cents, duration_minutes)
      select new_id, sv.id, array_position(p_service_ids, sv.id), sv.name_fi, sv.name_en, sv.price_cents, sv.duration_minutes
      from public.services sv where sv.id = any (p_service_ids);
      return query select new_id, tok, bid, p_start, p_start + make_interval(mins => dur);
      return;
    exception when exclusion_violation then
      null;  -- someone else took this barber at this time; try the next candidate
    end;
  end loop;
  raise exception 'slot_unavailable';
end $$;

-- Customer view of a booking via the emailed token.
create or replace function public.get_booking(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare a public.appointments; s public.settings; can_cancel boolean; can_resched boolean;
begin
  select * into s from public.settings;
  select * into a from public.appointments where manage_token_hash = public.token_hash(p_token);
  if not found or a.ends_at < now() then raise exception 'booking_not_found'; end if;
  can_cancel := a.status = 'confirmed' and now() <= a.starts_at - make_interval(hours => coalesce(s.cancel_deadline_hours, 0));
  can_resched := a.status = 'confirmed' and s.reschedule_allowed is true
    and now() <= a.starts_at - make_interval(hours => coalesce(s.reschedule_deadline_hours, 0))
    and (s.max_reschedules is null or a.reschedule_count < s.max_reschedules);
  return jsonb_build_object(
    'id', a.id, 'status', a.status, 'starts_at', a.starts_at, 'ends_at', a.ends_at,
    'barber', (select display_name from public.barbers where id = a.barber_id), 'barber_id', a.barber_id,
    'customer_name', a.customer_name, 'locale', a.locale,
    'total_price_cents', a.total_price_cents, 'total_duration_minutes', a.total_duration_minutes,
    'services', (select coalesce(jsonb_agg(jsonb_build_object('name_fi', x.name_fi, 'name_en', x.name_en,
        'price_cents', x.price_cents, 'duration_minutes', x.duration_minutes) order by x.position), '[]')
        from public.appointment_services x where x.appointment_id = a.id),
    'can_cancel', can_cancel, 'can_reschedule', can_resched,
    'cancel_deadline_hours', s.cancel_deadline_hours, 'reschedule_deadline_hours', s.reschedule_deadline_hours,
    'timezone', s.timezone);
end $$;

-- Free slots for rescheduling an existing booking (same barber, same duration).
create or replace function public.reschedule_slots(p_token text, p_date date)
returns table (slot_start timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare a public.appointments; s public.settings; today date;
begin
  select * into s from public.settings;
  select * into a from public.appointments where manage_token_hash = public.token_hash(p_token) and status = 'confirmed';
  if not found or a.ends_at < now() then raise exception 'booking_not_found'; end if;
  today := (now() at time zone s.timezone)::date;
  if p_date < today or p_date > today + coalesce(s.max_days_ahead, 0) then return; end if;
  return query select cs.slot_start from public.compute_slots(a.barber_id, a.total_duration_minutes,
    a.buffer_minutes, '{}', p_date, a.id) cs order by cs.slot_start;
end $$;

create or replace function public.reschedule_dates(p_token text, p_from date, p_to date) returns date[]
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare d date; res date[] := '{}';
begin
  if p_to - p_from > 62 then raise exception 'range_too_large'; end if;
  for d in select generate_series(p_from, p_to, interval '1 day')::date loop
    if exists (select 1 from public.reschedule_slots(p_token, d)) then res := res || d; end if;
  end loop;
  return res;
end $$;

create or replace function public.cancel_booking(p_token text)
returns table (appointment_id uuid, barber_id uuid, starts_at timestamptz, customer_email text, locale text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.appointments; s public.settings;
begin
  select * into s from public.settings;
  select * into a from public.appointments where manage_token_hash = public.token_hash(p_token) for update;
  if not found or a.ends_at < now() then raise exception 'booking_not_found'; end if;
  if a.status <> 'confirmed' then raise exception 'not_confirmed'; end if;
  if now() > a.starts_at - make_interval(hours => coalesce(s.cancel_deadline_hours, 0)) then raise exception 'deadline_passed'; end if;
  update public.appointments set status = 'cancelled', cancelled_at = now(), cancelled_by = 'customer' where id = a.id;
  return query select a.id, a.barber_id, a.starts_at, a.customer_email, a.locale;
end $$;

create or replace function public.reschedule_booking(p_token text, p_new_start timestamptz)
returns table (appointment_id uuid, barber_id uuid, old_starts_at timestamptz, starts_at timestamptz, ends_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.appointments; s public.settings; d date; ok boolean; new_end timestamptz;
begin
  select * into s from public.settings;
  select * into a from public.appointments where manage_token_hash = public.token_hash(p_token) for update;
  if not found or a.ends_at < now() then raise exception 'booking_not_found'; end if;
  if a.status <> 'confirmed' then raise exception 'not_confirmed'; end if;
  if s.reschedule_allowed is not true then raise exception 'reschedule_disabled'; end if;
  if now() > a.starts_at - make_interval(hours => coalesce(s.reschedule_deadline_hours, 0)) then raise exception 'deadline_passed'; end if;
  if s.max_reschedules is not null and a.reschedule_count >= s.max_reschedules then raise exception 'reschedule_limit'; end if;
  d := (p_new_start at time zone s.timezone)::date;
  if d > (now() at time zone s.timezone)::date + s.max_days_ahead then raise exception 'slot_unavailable'; end if;
  select exists (select 1 from public.compute_slots(a.barber_id, a.total_duration_minutes, a.buffer_minutes, '{}', d, a.id) cs
                 where cs.slot_start = p_new_start) into ok;
  if not ok then raise exception 'slot_unavailable'; end if;
  new_end := p_new_start + make_interval(mins => a.total_duration_minutes);
  begin
    update public.appointments set starts_at = p_new_start, ends_at = new_end,
      reschedule_count = reschedule_count + 1, reminder_sent_at = null where id = a.id;
  exception when exclusion_violation then raise exception 'slot_unavailable';
  end;
  return query select a.id, a.barber_id, a.starts_at, p_new_start, new_end;
end $$;

-- Admin variants (no deadlines, no working-hours check; overlaps are still rejected).
create or replace function public.admin_cancel_booking(p_id uuid)
returns table (appointment_id uuid, starts_at timestamptz, customer_email text, locale text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.appointments;
begin
  select * into a from public.appointments where id = p_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if a.status <> 'confirmed' then raise exception 'not_confirmed'; end if;
  update public.appointments set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin' where id = p_id;
  return query select a.id, a.starts_at, a.customer_email, a.locale;
end $$;

create or replace function public.admin_reschedule_booking(p_id uuid, p_new_start timestamptz, p_new_barber uuid default null)
returns table (appointment_id uuid, old_starts_at timestamptz, starts_at timestamptz, ends_at timestamptz,
               customer_email text, locale text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.appointments; new_end timestamptz;
begin
  select * into a from public.appointments where id = p_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if a.status <> 'confirmed' then raise exception 'not_confirmed'; end if;
  new_end := p_new_start + make_interval(mins => a.total_duration_minutes);
  begin
    update public.appointments set starts_at = p_new_start, ends_at = new_end,
      barber_id = coalesce(p_new_barber, barber_id), reschedule_count = reschedule_count + 1, reminder_sent_at = null
    where id = p_id;
  exception when exclusion_violation then raise exception 'slot_unavailable';
  end;
  return query select a.id, a.starts_at, p_new_start, new_end, a.customer_email, a.locale;
end $$;

-- ---------------------------------------------------------------------------
-- Public catalog (one call for the website: shop info, barbers, services, hours)
-- ---------------------------------------------------------------------------
create or replace function public.public_catalog() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'settings', (select jsonb_build_object(
        'business_name', business_name, 'address', address, 'phone', phone, 'public_email', public_email,
        'instagram_url', instagram_url, 'tiktok_url', tiktok_url, 'google_maps_url', google_maps_url,
        'legal_name', legal_name, 'business_id', business_id, 'privacy_contact_email', privacy_contact_email,
        'timezone', timezone, 'booking_enabled', booking_enabled, 'allow_multi_service', allow_multi_service,
        'allow_any_barber', allow_any_barber, 'max_days_ahead', max_days_ahead,
        'cancel_deadline_hours', cancel_deadline_hours, 'reschedule_allowed', reschedule_allowed,
        'reschedule_deadline_hours', reschedule_deadline_hours, 'retention_days', retention_days)
      from public.settings),
    'barbers', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.display_name,
        'service_ids', (select coalesce(jsonb_agg(bs.service_id), '[]') from public.barber_services bs where bs.barber_id = b.id))
        order by b.sort_order, b.display_name), '[]') from public.barbers b where b.active),
    'services', (select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'slug', v.slug, 'name_fi', v.name_fi,
        'name_en', v.name_en, 'description_fi', v.description_fi, 'description_en', v.description_en,
        'category', v.category, 'price_cents', v.price_cents, 'duration_minutes', v.duration_minutes,
        'bookable_online', v.bookable_online) order by v.sort_order, v.name_fi), '[]')
        from public.services v where v.active),
    'opening_hours', (select coalesce(jsonb_agg(jsonb_build_object('weekday', weekday, 'open', open_time, 'close', close_time)
        order by (weekday + 6) % 7), '[]') from public.opening_hours)
  );
$$;

-- Reminder + retention helpers (called by scheduled Edge Function / pg_cron)
create or replace function public.due_reminders() returns setof public.appointments
language sql stable security definer set search_path = public, pg_temp as $$
  select a.* from public.appointments a, public.settings s
  where s.reminder_hours_before is not null and a.status = 'confirmed' and a.reminder_sent_at is null
    and a.customer_email is not null and a.starts_at > now()
    and a.starts_at <= now() + make_interval(hours => s.reminder_hours_before);
$$;

create or replace function public.purge_old_appointments() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer; days integer;
begin
  select retention_days into days from public.settings;
  if days is null then return 0; end if;
  delete from public.appointments where ends_at < now() - make_interval(days => days);
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Privileges: lock down functions, then open only what is intended.
-- ---------------------------------------------------------------------------
revoke all on function
  public.compute_slots(uuid, integer, integer, uuid[], date, uuid, boolean),
  public.service_bundle(uuid[], boolean),
  public.create_booking(uuid, uuid[], timestamptz, text, text, text, text, text, text, integer),
  public.get_booking(text), public.reschedule_slots(text, date), public.reschedule_dates(text, date, date), public.cancel_booking(text),
  public.reschedule_booking(text, timestamptz), public.admin_cancel_booking(uuid),
  public.admin_reschedule_booking(uuid, timestamptz, uuid), public.due_reminders(), public.purge_old_appointments(),
  public.new_manage_token(), public.token_hash(text)
from public, anon, authenticated;
grant execute on function
  public.create_booking(uuid, uuid[], timestamptz, text, text, text, text, text, text, integer),
  public.get_booking(text), public.reschedule_slots(text, date), public.reschedule_dates(text, date, date), public.cancel_booking(text),
  public.reschedule_booking(text, timestamptz), public.admin_cancel_booking(uuid),
  public.admin_reschedule_booking(uuid, timestamptz, uuid), public.due_reminders(), public.purge_old_appointments()
to service_role;

revoke all on function public.available_slots(uuid, uuid[], date), public.available_dates(uuid, uuid[], date, date),
  public.public_catalog() from public;
grant execute on function public.available_slots(uuid, uuid[], date), public.available_dates(uuid, uuid[], date, date),
  public.public_catalog() to anon, authenticated, service_role;
