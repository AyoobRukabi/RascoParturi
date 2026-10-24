# Design system and visual review

## Direction
**Editorial barber shop, built from the existing brand** (black, royal-blue ring, red/white/blue barber pole, heavy condensed "RASCO" wordmark). Not black-and-gold: the brand already owns blue, so blue is the single accent and red appears only inside the pole motif.

* **Foundation:** warm black `#0b0b0c`, warm white text `#f3efe7`, hairline borders instead of boxed cards, crisp 2–6 px corners.
* **Type:** *Barlow Condensed* (uppercase display, echoes the wordmark) · *Instrument Serif Italic* (one accent phrase per page) · *Inter* (body). All self-hosted via Fontsource, so no Google Fonts requests.
* **Signature device:** the barber-pole ribbon under the header/footer and the animated pole illustration in the hero. Pure SVG/CSS, no assets.
* **Layout:** large type, generous spacing, asymmetric 12-column sections, price list with dotted leaders (reads like a barber's board), sticky headings on desktop.
* **Motion:** hero rise-in, fade-up on scroll (`Reveal`), slow pole scroll. All disabled under `prefers-reduced-motion`.
* **Mobile first:** pinned booking action bar showing running total, full-screen menu, language switcher always visible, scroll-padding so focused fields are never hidden behind pinned bars.

Tokens live in `src/index.css` (`@theme`): colours, fonts, radii, easing; type scale classes `.t-hero`, `.t-h2`, `.t-lead`, `.t-serif`, `.eyebrow`; layout helpers `.container-x`, `.section-y`.
Components: `src/components/ui/*` (shadcn-style, hand-written), `Pole`, `Reveal`, `Photo`, `MonthPicker`, `ServiceList`, `OpeningHours`, `Gallery`, `Reviews`.

## What is real and what is a placeholder
| Element | Source |
|---|---|
| Address, phone, opening hours, 7 services + prices, tagline, three value points | **Verified** from the old site |
| Headlines ("Siistit häivytykset. Helppo varaus."), CTA copy, About text | **Draft copy** for the owner to approve; no claims beyond the old site's own |
| Photography | **None used.** Photo slots read `public/brand/hero.jpg`, `public/brand/shop.jpg`, `public/gallery/manifest.json`; missing files render nothing on the live site (a labelled placeholder in design preview) |
| Reviews | **None invented.** `public/reviews.json` (`[{ "author", "text", "rating?", "source?", "url?" }]`) — section hidden until the owner supplies genuine reviews |
| Social links | Shown only when set in Admin → Settings (icons were on the old site, URLs unknown) |
| Logo | Wordmark recreated in type until `public/brand/logo.png` is supplied |

## Design preview vs. the real booking system
`/preview/*` renders the **same pages and components** as the live site, fed with **sample data and a simulated backend** (`src/lib/preview.tsx`, `src/lib/backend.tsx`):
* Always shows a "DESIGN PREVIEW — nothing is booked and no email is sent" banner; the confirmation page repeats it.
* Durations and the two barber names are samples; prices, names and hours are the verified ones.
* Enabled only in development (`npm run dev`) or if `VITE_ENABLE_PREVIEW=true`. A normal production build contains no preview routes or sample data.
* The real flow lives at `/book` and `/booking/:token` and talks to Supabase/Edge Functions (see README). It needs the backend set up to work.
* Review states from the banner's *Preview pages* menu: booking loading / no availability / slot-taken error; manage page past-deadline / cancelled / invalid link. Also `?state=…` on `/preview/book` and `/preview/booking/preview`.

## Booking flow
Service (multi-select when allowed) → Barber (skipped automatically when only one qualifies; "any available" when enabled) → Date & time (month grid + time groups morning/afternoon/evening; "earliest available day" shortcut) → Details (name, phone, email, notes, consent; inline validation, honeypot) → Review (each block editable) → Confirmation. Date and time share one screen so mobile users stay in one scroll.
States covered: loading skeletons, empty ("no free times", "no services"), validation errors, slot-taken recovery (returns to time selection), submitting, success, email-failed warning.

## Not yet restyled
The admin dashboard inherits the new tokens (colours, type, buttons, forms) but its layouts are unchanged and it has no design-preview mode (it needs authentication). A dedicated admin visual pass is the next design step.
