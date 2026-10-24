# Launch checklist and open blockers

Production booking stays **disabled** until every item below is done. The admin dashboard (Settings → *Launch readiness*) lists what the database still considers missing and refuses to enable booking while anything is open.

## A. Business decisions only the owner can confirm
| # | Item | Where it is set | Status |
|---|------|-----------------|--------|
| 1 | Number of barbers and their names; each barber's weekly working hours, breaks and holidays | Admin → Barbers | ⛔ unknown |
| 2 | Which services each barber offers | Admin → Barbers | ⛔ |
| 3 | **Duration of every service** (all 7 seeded services have none; a service can't be bookable online without one) | Admin → Services | ⛔ |
| 4 | The rest of the service list (the old site's list continued past the 7 seen) and English names/descriptions | Admin → Services | ⛔ |
| 5 | Can customers combine services in one visit? | Settings → Booking rules | ⛔ |
| 6 | Allow "any available barber"? | Settings | ⛔ |
| 7 | How far ahead can people book; minimum notice; slot interval; buffer between clients | Settings | ⛔ |
| 8 | Cancellation deadline; whether rescheduling is allowed, its deadline and limit | Settings | ⛔ |
| 9 | Optional: reminder timing, max upcoming bookings per email; data retention period (needed for the privacy text) | Settings | ⛔ / optional |
| 10 | Official business name spelling/branding ("Parturi-Kampaamo" vs "Parturi-Kampamo") — currently provisional "Rasco Parturi-Kampaamo" | Settings → Business | ⛔ |
| 11 | Whether the public email shown on the old site (`ahmedrasco32@gmail.com`, not pre-filled) should be shown publicly; Instagram/TikTok URLs (old site showed icons only) | Settings → Business | ⛔ |

## B. Legal
* Official legal name, **Y-tunnus**, privacy contact email → Settings → Legal; tick *legal details confirmed* only after review.
* The privacy page (`/privacy`) is a structured **draft**. Have it reviewed (data controller, retention, processors Supabase/Resend/Vercel, DPAs, hosting regions, any non-EU transfers) before launch. No compliance claim is made here.
* Customers must tick a consent/acknowledgement box before booking (implemented).

## C. Accounts and infrastructure (see [SETUP.md](SETUP.md))
* [ ] Supabase project (EU region), migrations applied, seed run, signups disabled, owner admin created
* [ ] Domain ownership verified; Resend domain verified (SPF, DKIM, DMARC); sender + notification emails set
* [ ] Edge Functions deployed with secrets; reminders/purge cron (optional)
* [ ] Vercel project + env vars; staging URL tested
* [ ] Domain DNS switched to Vercel (only after everything else)

## D. Assets (original files needed — screenshots are not suitable for production)
* Logo: the round badge **and** the "RASCO PARTURI-KAMPAMO" wordmark with barber pole/scissors/moustache — vector (SVG/PDF/AI) or PNG ≥ 1000 px wide with transparent background.
* The 10 gallery photos at original resolution (JPG/HEIC straight from the phone/camera), plus permission to publish people shown.
* One or two good exterior/interior photos of the shop for the hero.

## E. End-to-end test before go-live (on staging)
1. Book as a customer (single service, multiple services, specific barber, any barber); verify the email arrives, the .ics opens, times are correct in Helsinki time.
2. Open the manage link: cancel (inside/outside the deadline), reschedule (inside/outside), check emails to customer and shop.
3. Try two browsers booking the same slot simultaneously.
4. Admin: create phone/walk-in booking (with and without email), move, cancel, mark completed; add break/holiday and confirm slots disappear.
5. Check mobile (iPhone Safari, Android Chrome) and keyboard-only use; run Lighthouse.
6. Verify an unauthenticated user cannot read appointments (try the REST API with the anon key).
