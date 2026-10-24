\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
create schema t;

create function t.expect_err(q text, expected text) returns void language plpgsql as $$
begin
  execute q;
  raise exception 'EXPECTED ERROR "%" BUT SUCCEEDED: %', expected, q;
exception when others then
  if sqlerrm like 'EXPECTED ERROR%' then raise; end if;
  if sqlerrm not like '%' || expected || '%' then
    raise exception 'WRONG ERROR for [%]: got "%", wanted "%"', q, sqlerrm, expected;
  end if;
end $$;

create function t.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;

-- ---- Seed sanity -----------------------------------------------------------------------
select t.check((select count(*) from services) = 7, 'seven verified services seeded');
select t.check((select count(*) from services where bookable_online) = 0, 'no service bookable before durations confirmed');
select t.check((select booking_enabled from settings) = false, 'booking disabled by default');
select t.expect_err($q$update settings set booking_enabled = true$q$, 'booking_not_ready');
select t.expect_err($q$update services set bookable_online = true where slug='koneajo'$q$, 'violates check constraint');

-- ---- Owner configures the business (test values only) ------------------------------------
insert into barbers (display_name, sort_order) values ('Barber A', 1), ('Barber B', 2);
update services set duration_minutes = 30, bookable_online = true where slug in ('parturileikkaus','koneajo');
update services set duration_minutes = 15, bookable_online = true where slug = 'parran-muotoilu';
insert into barber_services select b.id, s.id from barbers b, services s where s.bookable_online;
insert into working_hours (barber_id, weekday, start_time, end_time)
  select b.id, d, '10:00', '19:00' from barbers b, generate_series(1, 6) d;
insert into barber_breaks (barber_id, weekday, start_time, end_time, label)
  select id, d, '13:00', '14:00', 'lunch' from barbers, generate_series(1,6) d where display_name = 'Barber A';
select t.expect_err($q$insert into working_hours (barber_id, weekday, start_time, end_time)
  select id, 1, '12:00', '15:00' from barbers where display_name='Barber A'$q$, 'conflicting key');

update settings set max_days_ahead = 30, min_notice_minutes = 60, slot_interval_minutes = 15, buffer_minutes = 10,
  cancel_deadline_hours = 24, reschedule_allowed = true, reschedule_deadline_hours = 24,
  allow_multi_service = true, allow_any_barber = true,
  sender_email = 'test@example.test', notification_email = 'owner@example.test';
select t.expect_err($q$update settings set booking_enabled = true$q$, 'legal_details');
update settings set legal_name = 'Test Oy', business_id = '0000000-0', legal_confirmed = true, booking_enabled = true;
select t.check((select booking_enabled from settings), 'booking enabled once everything is confirmed');
select t.expect_err($q$update settings set cancel_deadline_hours = null$q$, 'booking_not_ready');

-- A Wednesday at least 3 days ahead
create table t.ctx as
  select (select d from generate_series((now() at time zone 'Europe/Helsinki')::date + 3,
                                         (now() at time zone 'Europe/Helsinki')::date + 9, interval '1 day') d
          where extract(dow from d) = 3 limit 1)::date as day,
         (select id from barbers where display_name = 'Barber A') as a,
         (select id from barbers where display_name = 'Barber B') as b,
         (select id from services where slug = 'parturileikkaus') as cut,
         (select id from services where slug = 'parran-muotoilu') as beard;

create function t.at(h text) returns timestamptz language sql as
  $$ select ((select day from t.ctx) + h::time) at time zone 'Europe/Helsinki' $$;

-- ---- Availability ------------------------------------------------------------------------
select t.check((select min(slot_start) from available_slots((select a from t.ctx), array[(select cut from t.ctx)], (select day from t.ctx))) = t.at('10:00'),
  'first slot for Barber A is 10:00 local time');
select t.check((select max(slot_start) from available_slots((select b from t.ctx), array[(select cut from t.ctx)], (select day from t.ctx))) = t.at('18:30'),
  'last 30-min slot ends exactly at closing (18:30)');
select t.check(not exists (select 1 from available_slots((select a from t.ctx), array[(select cut from t.ctx)], (select day from t.ctx))
  where slot_start >= t.at('12:45') and slot_start < t.at('14:00')), 'no slots overlapping Barber A lunch break');
select t.check(exists (select 1 from available_slots((select b from t.ctx), array[(select cut from t.ctx)], (select day from t.ctx)) where slot_start = t.at('13:00')),
  'Barber B (no break) is bookable at 13:00');
select t.check((select max(slot_start) from available_slots((select b from t.ctx), array[(select cut from t.ctx),(select beard from t.ctx)], (select day from t.ctx))) = t.at('18:15'),
  'multi-service: total duration 45 min is checked against closing time');
select t.check((select count(*) from available_slots(null, array[(select cut from t.ctx)], (select day from t.ctx)) where slot_start = t.at('13:00')) = 1
  and (select barber_ids from available_slots(null, array[(select cut from t.ctx)], (select day from t.ctx)) where slot_start = t.at('13:00')) = array[(select b from t.ctx)],
  'any-barber: 13:00 is offered, and only Barber B is free');
select t.check(not exists (select 1 from available_slots((select a from t.ctx), array[(select cut from t.ctx)], (select day from t.ctx) - 10)), 'no slots in the past');
select t.check(not exists (select 1 from available_slots((select a from t.ctx), array[(select cut from t.ctx)], current_date + 31)), 'no slots beyond max_days_ahead');
select t.expect_err($q$select * from available_slots(null, array[gen_random_uuid()], current_date)$q$, 'unknown_service');

-- ---- Booking + overlap prevention ----------------------------------------------------------
create table t.first as
  select * from create_booking((select a from t.ctx), array[(select cut from t.ctx)], t.at('10:00'),
                               'Test Customer', '+358 40 1234567', 'Customer@Example.test', 'en');
select t.check((select ends_at from t.first) = t.at('10:30'), 'booking created with correct end time');
select t.check(length((select manage_token from t.first)) = 64, 'token has 256 bits of entropy (64 hex chars)');
select t.check((select count(*) from appointments where manage_token_hash = public.token_hash((select manage_token from t.first))) = 1
  and not exists (select 1 from appointments where encode(manage_token_hash,'hex') = (select manage_token from t.first)),
  'only a hash of the token is stored');
select t.check((select customer_email from appointments limit 1) = 'customer@example.test', 'email normalised to lower case');
select t.check((select min(slot_start) from available_slots((select a from t.ctx), array[(select cut from t.ctx)], (select day from t.ctx))) = t.at('10:45'),
  'buffer respected: next free slot after 10:00-10:30 (+10 min buffer) is 10:45');
select t.expect_err(format($q$select * from create_booking(%L, array[%L::uuid], %L, 'X Y', '040123456', 'x@y.test', 'fi')$q$,
  (select a from t.ctx), (select cut from t.ctx), t.at('10:00')), 'slot_unavailable');
select t.expect_err(format($q$select * from create_booking(%L, array[%L::uuid], %L, 'X Y', '040123456', 'x@y.test', 'fi')$q$,
  (select a from t.ctx), (select cut from t.ctx), t.at('10:15')), 'slot_unavailable');
select t.expect_err(format($q$insert into appointments (barber_id, starts_at, ends_at, source, customer_name, customer_phone, customer_email, total_price_cents, total_duration_minutes)
  values (%L, %L, %L, 'online', 'Raw', '040123456', 'raw@x.test', 0, 15)$q$, (select a from t.ctx), t.at('10:20'), t.at('10:35')), 'appointments_no_overlap');
select t.expect_err(format($q$select * from create_booking(%L, array[%L::uuid], %L, 'X Y', '040123456', 'x@y.test', 'fi')$q$,
  (select a from t.ctx), (select cut from t.ctx), t.at('13:00')), 'slot_unavailable');  -- inside lunch break
select t.expect_err(format($q$select * from create_booking(%L, array[%L::uuid], %L, 'X Y', '040123456', 'bad-email', 'fi')$q$,
  (select a from t.ctx), (select cut from t.ctx), t.at('11:00')), 'invalid_email');
select t.expect_err(format($q$select * from create_booking(%L, array[%L::uuid], %L, 'X Y', '040123456', null, 'fi')$q$,
  (select a from t.ctx), (select cut from t.ctx), t.at('11:00')), 'invalid_email');

-- "Any barber" fills the other barber, then runs out
create table t.any1 as select * from create_booking(null, array[(select cut from t.ctx)], t.at('10:00'), 'Any One', '040123456', 'any1@x.test', 'fi');
select t.check((select barber_id from t.any1) = (select b from t.ctx), 'any-barber booking assigned to the free barber');
select t.expect_err(format($q$select * from create_booking(null, array[%L::uuid], %L, 'Any Two', '040123456', 'any2@x.test', 'fi')$q$,
  (select cut from t.ctx), t.at('10:00')), 'slot_unavailable');

-- Multi-service booking totals
create table t.multi as select * from create_booking((select b from t.ctx), array[(select cut from t.ctx),(select beard from t.ctx)], t.at('15:00'),
  'Multi Service', '040123456', 'multi@x.test', 'fi');
select t.check((select total_duration_minutes from appointments where id = (select appointment_id from t.multi)) = 45
  and (select total_price_cents from appointments where id = (select appointment_id from t.multi)) = 3000
  and (select count(*) from appointment_services where appointment_id = (select appointment_id from t.multi)) = 2,
  'multi-service booking: 45 min, 30 EUR, two snapshot lines');
update settings set allow_multi_service = false;
select t.expect_err(format($q$select * from create_booking(%L, array[%L::uuid, %L::uuid], %L, 'M S', '040123456', 'm@x.test', 'fi')$q$,
  (select b from t.ctx), (select cut from t.ctx), (select beard from t.ctx), t.at('16:00')), 'multi_service_disabled');
update settings set allow_multi_service = true;

-- Snapshot survives a price change
update services set price_cents = 9999 where id = (select cut from t.ctx);
select t.check((select price_cents from appointment_services where appointment_id = (select appointment_id from t.first)) = 1500, 'price edits do not rewrite past bookings');
update services set price_cents = 1500 where id = (select cut from t.ctx);

-- ---- Manage link: view / cancel / reschedule -----------------------------------------------
select t.check((get_booking((select manage_token from t.first))->>'status') = 'confirmed', 'get_booking works with the token');
select t.check((get_booking((select manage_token from t.first))->>'can_cancel')::boolean, 'can_cancel true outside the deadline');
select t.expect_err($q$select get_booking('not-a-real-token')$q$, 'booking_not_found');

-- reschedule: shift by 15 minutes (overlaps own old slot -> must be allowed)
select * from reschedule_booking((select manage_token from t.first), t.at('10:15'));
select t.check((select starts_at from appointments where id = (select appointment_id from t.first)) = t.at('10:15'), 'reschedule into a slot overlapping its own old time works');
select t.check((select reschedule_count from appointments where id = (select appointment_id from t.first)) = 1, 'reschedule counted');
select t.expect_err(format($q$select * from reschedule_booking(%L, %L)$q$, (select manage_token from t.first), t.at('13:00')), 'slot_unavailable');  -- A is at lunch

-- cancel + slot is released
select * from cancel_booking((select manage_token from t.first));
select t.check((select status from appointments where id = (select appointment_id from t.first)) = 'cancelled', 'customer cancellation works');
select t.check(exists (select 1 from available_slots((select a from t.ctx), array[(select cut from t.ctx)], (select day from t.ctx)) where slot_start = t.at('10:00')),
  'cancelled slot is bookable again');
select t.expect_err(format($q$select * from cancel_booking(%L)$q$, (select manage_token from t.first)), 'not_confirmed');
select t.expect_err(format($q$select * from reschedule_booking(%L, %L)$q$, (select manage_token from t.first), t.at('11:00')), 'not_confirmed');

-- deadlines: a booking 3 hours from now is inside the 24 h cancel/reschedule deadline
create table t.soon as select * from create_booking((select a from t.ctx), array[(select cut from t.ctx)],
  date_trunc('hour', now()) + interval '4 hours', 'Soon Customer', '040123456', 'soon@x.test', 'fi', 'admin');
select t.check(not (get_booking((select manage_token from t.soon))->>'can_cancel')::boolean, 'can_cancel false inside deadline');
select t.check(not (get_booking((select manage_token from t.soon))->>'can_reschedule')::boolean, 'can_reschedule false inside deadline');
select t.expect_err(format($q$select * from cancel_booking(%L)$q$, (select manage_token from t.soon)), 'deadline_passed');
select t.expect_err(format($q$select * from reschedule_booking(%L, %L)$q$, (select manage_token from t.soon), t.at('11:00')), 'deadline_passed');
update settings set cancel_deadline_hours = 0;
select t.check((get_booking((select manage_token from t.soon))->>'can_cancel')::boolean, 'deadline is configurable (0 = until start)');
update settings set cancel_deadline_hours = 24;

select t.check(array_length(reschedule_dates((select manage_token from t.multi), (select day from t.ctx) - 1, (select day from t.ctx) + 1), 1) >= 1
  and (select day from t.ctx) = any (reschedule_dates((select manage_token from t.multi), (select day from t.ctx) - 1, (select day from t.ctx) + 1)), 'reschedule_dates lists days with free slots');

-- reschedule rules
update settings set reschedule_allowed = false;
select t.expect_err(format($q$select * from reschedule_booking(%L, %L)$q$, (select manage_token from t.multi), t.at('16:00')), 'reschedule_disabled');
update settings set reschedule_allowed = true, max_reschedules = 1;
select * from reschedule_booking((select manage_token from t.multi), t.at('16:00'));
select t.expect_err(format($q$select * from reschedule_booking(%L, %L)$q$, (select manage_token from t.multi), t.at('17:00')), 'reschedule_limit');
update settings set max_reschedules = null;

-- admin: walk-in without email, cancel, reschedule; overlaps still rejected
create table t.walkin as select * from create_booking((select a from t.ctx), array[(select cut from t.ctx)], t.at('17:00'),
  'Walk In', '040123456', null, 'fi', 'admin');
select t.check((select customer_email from appointments where id = (select appointment_id from t.walkin)) is null, 'admin booking may omit email');
select t.expect_err(format($q$select * from create_booking(%L, array[%L::uuid], %L, 'Walk In 2', '040123456', null, 'fi', 'admin')$q$,
  (select a from t.ctx), (select cut from t.ctx), t.at('17:10')), 'slot_unavailable');
select * from admin_reschedule_booking((select appointment_id from t.walkin), t.at('18:00'));
select t.check((select starts_at from appointments where id = (select appointment_id from t.walkin)) = t.at('18:00'), 'admin reschedule');
select * from create_booking((select a from t.ctx), array[(select cut from t.ctx)], t.at('12:00'), 'Blocker', '040123456', 'blocker@x.test', 'fi');
select t.expect_err(format($q$select * from admin_reschedule_booking(%L, %L)$q$, (select appointment_id from t.walkin), t.at('12:20')), 'slot_unavailable');
select * from admin_cancel_booking((select appointment_id from t.walkin));
select t.check((select cancelled_by from appointments where id = (select appointment_id from t.walkin)) = 'admin', 'admin cancel recorded');

-- days off
insert into time_off (barber_id, starts_at, ends_at, reason) values ((select a from t.ctx), t.at('00:00'), t.at('00:00') + interval '1 day', 'holiday');
select t.check(not exists (select 1 from available_slots((select a from t.ctx), array[(select cut from t.ctx)], (select day from t.ctx))), 'barber time off removes all their slots');
select t.check(exists (select 1 from available_slots((select b from t.ctx), array[(select cut from t.ctx)], (select day from t.ctx))), 'other barber unaffected by time off');
insert into time_off (barber_id, starts_at, ends_at, reason) values (null, t.at('00:00'), t.at('00:00') + interval '1 day', 'shop closed');
select t.check(not exists (select 1 from available_slots(null, array[(select cut from t.ctx)], (select day from t.ctx))), 'shop-wide closure removes all slots');
delete from time_off;

-- booking can be switched off
update settings set booking_enabled = false;
select t.check(not exists (select 1 from available_slots((select b from t.ctx), array[(select cut from t.ctx)], (select day from t.ctx))), 'no slots while booking is disabled');
select t.expect_err(format($q$select * from create_booking(%L, array[%L::uuid], %L, 'X Y', '040123456', 'x@y.test', 'fi')$q$,
  (select b from t.ctx), (select cut from t.ctx), t.at('11:00')), 'booking_disabled');
update settings set booking_enabled = true;

-- anti-abuse limit
update settings set max_active_per_email = 1;
select * from create_booking((select b from t.ctx), array[(select cut from t.ctx)], t.at('11:00'), 'Limit', '040123456', 'limit@x.test', 'fi');
select t.expect_err(format($q$select * from create_booking(%L, array[%L::uuid], %L, 'Limit', '040123456', 'limit@x.test', 'fi')$q$,
  (select b from t.ctx), (select cut from t.ctx), t.at('12:00')), 'too_many_bookings');
update settings set max_active_per_email = null;

-- ---- Row Level Security / privileges ---------------------------------------------------------
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'admin@x.test'),
                                          ('00000000-0000-0000-0000-0000000000b2', 'rando@x.test');
insert into admins (user_id) values ('00000000-0000-0000-0000-0000000000a1');

grant usage on schema t to public;
grant select on all tables in schema t to public;
grant execute on all functions in schema t to public;
set role anon;
select t.check((select count(*) from appointments) = 0, 'anon cannot read appointments');
select t.check((select count(*) from settings) = 0, 'anon cannot read raw settings');
select t.check((public_catalog()->'settings'->>'sender_email') is null, 'public catalog does not leak sender/notification email');
select t.check(jsonb_array_length(public_catalog()->'services') = 7, 'anon can read public catalog');
select t.expect_err($q$select * from create_booking(null, '{}', now(), 'a', 'b', 'c', 'fi')$q$, 'permission denied');
select t.expect_err($q$select * from get_booking('x')$q$, 'permission denied');
select t.expect_err($q$select * from cancel_booking('x')$q$, 'permission denied');
select t.expect_err($q$insert into appointments (barber_id, starts_at, ends_at, source, customer_name, customer_phone, customer_email, total_price_cents, total_duration_minutes) values (gen_random_uuid(), now(), now() + interval '1 hour', 'online', 'x', '040123456', 'x@x.test', 0, 60)$q$, 'row-level security');
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select t.check((select count(*) from appointments) = 0, 'non-admin authenticated user cannot read appointments');
do $$ declare n integer; begin
  update services set price_cents = 1; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAILED: non-admin modified % service rows', n; end if;
  raise notice 'ok - non-admin authenticated user cannot modify services';
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select t.check((select count(*) from appointments) > 0, 'admin can read appointments');
update services set price_cents = 1500 where slug = 'koneajo';
select t.check((select count(*) from settings) = 1, 'admin can read settings');
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select t.check(booking_readiness() is not null, 'admin can read launch readiness');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
select t.expect_err($q$select booking_readiness()$q$, 'forbidden');
reset role;

-- ---- Retention ---------------------------------------------------------------------------------
update appointments set starts_at = now() - interval '400 days', ends_at = now() - interval '400 days' + interval '30 minutes' where id = (select appointment_id from t.walkin);
select t.check(purge_old_appointments() = 0, 'retention off by default: nothing purged');
update settings set retention_days = 365;
select t.check(purge_old_appointments() = 1, 'retention purges appointments older than the configured period');

\echo ALL DB TESTS PASSED
