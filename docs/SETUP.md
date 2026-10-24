# Setup guide (Supabase · Resend · Vercel · domain)

Never paste passwords or secret keys into chat, issues or commits. Secrets are typed only into the provider dashboards or your own terminal.

## 0. Prerequisites
Node 20+, the [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase` or via Homebrew/Scoop), and GitHub access to this repo.

## 1. Supabase
1. Create an account at supabase.com → **New project**. Pick an **EU region** (e.g. Frankfurt or Stockholm). Save the database password in a password manager.
2. **Authentication → Providers → Email**: keep email+password on; **disable "Allow new users to sign up"** so nobody can self-register. Admins are created manually.
3. Link and push the schema (in your terminal, from this repo):
   ```bash
   supabase login
   supabase link --project-ref <YOUR-PROJECT-REF>
   supabase db push                # applies supabase/migrations
   ```
   Then open **SQL Editor**, paste `supabase/seed.sql`, and run it (verified services + opening hours).
4. **Create the owner's login:** Authentication → Users → *Add user* (email + password). Then in the SQL Editor:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'OWNER-EMAIL-HERE';
   ```
5. **Project Settings → API:** copy the *Project URL* and the *anon public* key (public by design; RLS protects data). The `service_role` key must never leave Supabase – Edge Functions receive it automatically.

## 2. Resend (email) and the domain
1. Create an account at resend.com → **Domains → Add Domain** → enter your domain (e.g. `rascobarturikampamo.fi`, or a subdomain such as `mail.rascobarturikampamo.fi`, which keeps website DNS separate).
2. Resend shows DNS records (SPF/`TXT`, DKIM/`CNAME` or `TXT`, optionally a return-path `MX`). Add them at **wherever the domain's DNS is managed** (your registrar or DNS host). This requires you to control the domain – log in to the registrar to confirm you own it. Add a DMARC record too, e.g. `_dmarc TXT "v=DMARC1; p=none; rua=mailto:YOUR-MAILBOX"` and tighten later.
3. Click **Verify** in Resend (can take minutes to hours). Until it is verified, Resend only delivers to your own account email.
4. **API Keys → Create** a key with *Sending access* restricted to that domain. Set it as a Supabase secret from your terminal (it is not shown again):
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxx SITE_URL=https://YOUR-SITE ALLOWED_ORIGINS=https://YOUR-SITE CRON_SECRET=$(openssl rand -hex 24)
   supabase functions deploy booking-api admin-api send-reminders
   ```
5. In the admin dashboard → **Settings → Email** set the **sender address** (must be on the verified domain, e.g. `varaus@yourdomain.fi`) and the **notification address** that receives new-booking emails.
6. Send a test booking and check **Admin → Email log** for `sent`/`failed`.

## 3. Reminders and automatic data deletion (optional but recommended)
Enable the `pg_cron` and `pg_net` extensions (Database → Extensions), then in the SQL Editor (replace the placeholders):
```sql
select cron.schedule('rasco-reminders', '*/15 * * * *', $$
  select net.http_post(url := 'https://<PROJECT-REF>.supabase.co/functions/v1/send-reminders',
                       headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')) $$);
select cron.schedule('rasco-purge', '17 3 * * *', 'select public.purge_old_appointments()');
```
Reminders only go out when *Reminder hours before* is set in Settings; purging only runs when *Retention days* is set.

## 4. Vercel
1. vercel.com → **Add New Project** → import the GitHub repo. Framework preset **Vite** (build `npm run build`, output `dist`; `vercel.json` handles SPA routing and security headers).
2. **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (values from step 1.5).
3. Deploy. Test on the `*.vercel.app` URL first and set `SITE_URL`/`ALLOWED_ORIGINS` (step 2.4) to it while testing.
4. **Domain:** Project → Settings → Domains → add `rascobarturikampamo.fi` and `www.…`; Vercel shows the DNS records to set. **Do not change DNS until the launch checklist is complete** – the old site stays live until then. Afterwards update `SITE_URL`/`ALLOWED_ORIGINS` and redeploy the functions.

## 5. Add logo and photos
Put the original logo at `public/brand/logo.png` (transparent PNG, ideally also keep the vector original) and gallery photos in `public/gallery/`, then list them in `public/gallery/manifest.json`:
```json
[{ "src": "/gallery/cut-01.jpg", "alt": "Fade haircut" }]
```
The gallery section is hidden while the list is empty.

## 6. Tests you can run before any account exists
`npm run test:db` (needs a local PostgreSQL) and `deno test supabase/functions/_shared/email.test.ts`.
