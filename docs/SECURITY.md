# Security notes

* **Data access:** RLS is enabled on every table; the only policy allows users listed in `admins`. `anon` can call only `public_catalog`, `available_slots`, `available_dates` (no personal data).
  All booking mutations are `SECURITY DEFINER` functions executable by `service_role` only and are reached through the `booking-api` Edge Function. Verified by tests (`npm run test:db`).
* **Manage links:** 256-bit random token; only the SHA-256 hash is stored; the link works until the appointment ends. API calls carry the token in POST bodies, not query strings. Reminder emails and admin-made changes do not include the link (the token cannot be recovered) and point to the original confirmation email.
* **Admin:** Supabase Auth password login; public sign-ups disabled; `admin-api` verifies the JWT and the `admins` row server-side.
* **Abuse:** honeypot field, per-IP rate limits in the Edge Function (best effort per instance), optional per-email cap of upcoming bookings (`max_active_per_email`). If spam appears, add Cloudflare Turnstile or hCaptcha in front of `create`, and consider a shared rate-limit store.
* **Headers:** `vercel.json` sets nosniff, frame denial, referrer and permissions policies. Add a Content-Security-Policy once the final asset hosts are known.
* **Privacy:** no analytics or tracking cookies; fonts are self-hosted (no Google Fonts requests). Email log stores recipient and delivery status, not message bodies.
* **Secrets:** `RESEND_API_KEY`, `CRON_SECRET` live only in Supabase secrets; the repo contains no secrets (`.env` is git-ignored).
