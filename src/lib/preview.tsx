// DESIGN PREVIEW MODE — not the real booking system.
// Routes under /preview render the real pages/components with sample data and a simulated backend so the
// design can be reviewed without Supabase. Everything here is clearly labelled in the UI, performs no network
// calls, creates no bookings and sends no email. It is enabled only in development or when
// VITE_ENABLE_PREVIEW=true, so it cannot appear on the production site by accident.
import { createContext, useContext, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import type { Catalog, ManagedBooking } from "./types";
import { addDays, todayInTz, weekdayOf } from "./time";

export const PREVIEW_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_PREVIEW === "true";

const PreviewContext = createContext(false);
export const PreviewProvider = ({ children }: { children: ReactNode }) => <PreviewContext.Provider value>{children}</PreviewContext.Provider>;
export const usePreview = () => useContext(PreviewContext);

/** Link that stays inside /preview while reviewing the design. */
export function AppLink({ to, ...p }: LinkProps & { to: string }) {
  const preview = usePreview();
  return <Link to={preview ? `/preview${to === "/" ? "" : to}` : to} {...p} />;
}
export const useAppPath = () => { const p = usePreview(); return (to: string) => (p ? `/preview${to === "/" ? "" : to}` : to); };

// Verified facts (address, phone, opening hours, service names and prices) come from the old website.
// Durations and barber names below are SAMPLE values for layout review only.
export const SAMPLE_CATALOG: Catalog = {
  settings: {
    business_name: "Rasco Parturi-Kampaamo", address: "Helsinginkatu 4 b, 00500 Helsinki", phone: "+358458596596", public_email: null,
    instagram_url: "https://instagram.com/", tiktok_url: "https://tiktok.com/", google_maps_url: null,
    legal_name: null, business_id: null, privacy_contact_email: null, timezone: "Europe/Helsinki", booking_enabled: true,
    allow_multi_service: true, allow_any_barber: true, max_days_ahead: 30, cancel_deadline_hours: 24, reschedule_allowed: true,
    reschedule_deadline_hours: 24, retention_days: null,
  },
  barbers: [
    { id: "sample-a", name: "Sample barber A", service_ids: ["s1", "s2", "s3", "s4", "s5", "s6", "s7"] },
    { id: "sample-b", name: "Sample barber B", service_ids: ["s1", "s2", "s3", "s4", "s5", "s6", "s7"] },
  ],
  services: [
    ["s1", "parturileikkaus", "Parturileikkaus", "Barber haircut", 1500, 30],
    ["s2", "koneajo", "Koneajo", "Clipper cut", 1500, 20],
    ["s3", "lasten", "Lasten hiustenleikkaus", "Children's haircut", 1500, 30],
    ["s4", "kampaamo", "Kampaamoleikkaus", "Hairdresser cut", 3000, 45],
    ["s5", "elakelaiset", "Parturileikkaus - eläkeläiset", "Barber haircut - pensioners", 1500, 30],
    ["s6", "muotoilu", "Parran muotoilu", "Beard shaping", 1500, 20],
    ["s7", "siistiminen", "Parran siistiminen / koneajo", "Beard trim / clipper", 1500, 15],
  ].map(([id, slug, fi, en, price, dur]) => ({
    id: id as string, slug: slug as string, name_fi: fi as string, name_en: en as string, description_fi: null, description_en: null,
    category: null, price_cents: price as number, duration_minutes: dur as number, bookable_online: true,
  })),
  opening_hours: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, open: "10:00:00", close: "19:00:00" })).concat([{ weekday: 0, open: "12:00:00", close: "18:00:00" }]),
};

// Deterministic sample availability: closed Sundays, a few days "full", some slots "taken".
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
export function sampleDates(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (weekdayOf(d) !== 0 && hash(d) % 5 !== 0) out.push(d);
  return out;
}
export function sampleTimes(date: string): string[] {
  const out: string[] = [];
  for (let m = 10 * 60; m <= 18 * 60 + 30; m += 30) if (hash(`${date}${m}`) % 3 !== 0) out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  return out;
}
/** "10:30" on a Helsinki-local date -> ISO instant (sample data only; ignores DST edge cases). */
export function localToIso(date: string, time: string, tz = "Europe/Helsinki"): string {
  const guess = Date.parse(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(guess));
  const n = (k: string) => Number(parts.find((p) => p.type === k)!.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour") % 24, n("minute"));
  return new Date(guess - (asUtc - guess)).toISOString();
}

export function sampleManagedBooking(): ManagedBooking {
  const day = addDays(todayInTz("Europe/Helsinki"), 6);
  const start = localToIso(day, "14:30");
  return {
    id: "preview", status: "confirmed", starts_at: start, ends_at: new Date(new Date(start).getTime() + 50 * 60000).toISOString(),
    barber: "Sample barber A", barber_id: "sample-a", customer_name: "Sample Customer", locale: "fi", total_price_cents: 3000, total_duration_minutes: 50,
    services: [{ name_fi: "Parturileikkaus", name_en: "Barber haircut", price_cents: 1500, duration_minutes: 30 }, { name_fi: "Parran muotoilu", name_en: "Beard shaping", price_cents: 1500, duration_minutes: 20 }],
    can_cancel: true, can_reschedule: true, cancel_deadline_hours: 24, reschedule_deadline_hours: 24, timezone: "Europe/Helsinki",
  };
}
