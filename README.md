# Rasco Parturi-Kampaamo – website and booking system

Premium, bilingual (Finnish default / English) website for a Helsinki barber shop with a real online booking system.
Customers book **without an account**; the barber manages everything in an authenticated admin dashboard.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS 4 · shadcn-style UI components · Supabase (Postgres, Auth, Edge Functions) · Resend (email only) · Vercel.

> **Status: feature-complete, NOT ready to launch.** Several business rules and legal details are still unconfirmed and are deliberately
> left empty/configurable. Online booking cannot be switched on until they are set — see [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md).

## What is verified vs. configurable

Only facts verified from the owner's screenshots of the old site are pre-filled: address, phone, opening hours, and seven services with prices
(durations are **empty** on purpose). Everything else (booking rules, durations, barbers and their hours, sender email, legal name, Y-tunnus,
retention) is `NULL` until the owner enters it in **Admin → Settings**. The database refuses to enable online booking while anything required is missing.

## How it works

* **No double bookings:** a PostgreSQL exclusion constraint (`appointments_no_overlap`) makes it impossible for one barber to have two overlapping
  confirmed appointments, even under simultaneous requests (tested with 12 parallel bookings for one slot → exactly one wins). Buffers are part of the blocked range.
* **Availability** is computed in SQL from each barber's working hours, breaks, time off, existing appointments, minimum notice, and total duration of **all selected services**.
* **Customer links:** each booking gets a random 256-bit token emailed to the customer; only its SHA-256 hash is stored. The link allows viewing, cancelling and rescheduling within the configurable deadlines.
* **Customers never touch tables.** Public access is limited to a read-only catalog + availability RPCs; every mutation goes through the `booking-api` Edge Function. RLS restricts all tables to admins.
* **Email only** (Resend): confirmation (+ calendar file), reschedule, cancellation, optional reminder, and a notification to the shop. No SMS, no online payments.

```
src/                    React app (public site, booking flow, manage link page, admin dashboard – code-split)
supabase/migrations/    Schema, RLS, availability + booking functions
supabase/seed.sql       Verified services/opening hours only
supabase/functions/     booking-api (public), admin-api (admin), send-reminders (cron)
supabase/tests/         Database test-suite (runs on a throw-away local PostgreSQL)
docs/                   Setup guide, launch checklist, security notes
```

## Develop locally

```bash
npm install
cp .env.example .env        # fill in once a Supabase project exists (see docs/SETUP.md)
npm run dev                 # http://localhost:5173
npm run typecheck && npm run build
npm run test:db             # DB logic: overlaps, rules, tokens, RLS, concurrency (needs local PostgreSQL 14+)
deno test supabase/functions/_shared/email.test.ts   # email templates
```

Without Supabase credentials the site renders and shows a clear "not configured" notice instead of fake data.

## Not done yet / known limitations

* Needs a real Supabase + Resend + Vercel setup and an end-to-end test against them before launch (not possible from the sandbox this was built in).
* Original logo and gallery photos were not retrievable (the old site was unreachable). The header uses a text wordmark until `public/brand/logo.png` and `public/gallery/*` are provided (see checklist).
* Admin calendar is a per-barber day agenda (not an hour grid); week view and drag-and-drop are future improvements.
* Bot protection is limited to a honeypot, rate limits and an optional per-email cap; add Cloudflare Turnstile if abuse appears (see docs/SECURITY.md).
* The privacy policy is a structured **draft for legal review**, not legal advice or a compliance claim.
