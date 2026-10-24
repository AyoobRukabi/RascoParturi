// Run with: deno test supabase/functions/_shared/email.test.ts
import { buildEmail, buildIcs, type Booking, type Settings } from "./email.ts";

const settings: Settings = {
  business_name: "Test Shop", address: "Testikatu 1, Helsinki", phone: "+358401234567", timezone: "Europe/Helsinki",
  sender_email: "noreply@example.test", notification_email: "owner@example.test",
  cancel_deadline_hours: 24, reschedule_allowed: true, reschedule_deadline_hours: 24,
};
const booking: Booking = {
  id: "11111111-1111-1111-1111-111111111111", starts_at: "2026-11-04T08:00:00Z", ends_at: "2026-11-04T08:30:00Z", locale: "fi",
  customer_name: "<script>alert(1)</script> Matti", customer_email: "m@example.test", customer_phone: "+358401112222", barber: "Barber A",
  services: [{ name: "Parturileikkaus" }], total_price_cents: 1500, token: "a".repeat(64),
};
const assert = (c: unknown, m: string) => { if (!c) throw new Error(m); };

Deno.test("confirmation (fi) contains manage link, time in Helsinki time and escapes HTML", () => {
  const m = buildEmail("confirmation", booking, settings, "https://shop.example");
  assert(m.html.includes(`https://shop.example/booking/${"a".repeat(64)}`), "manage link");
  assert(m.html.includes("10.00"), "08:00Z shown as 10:00 Helsinki time");
  assert(!m.html.includes("<script>"), "customer name must be escaped");
  assert(m.html.includes("&lt;script&gt;"), "escaped name present");
  assert(m.subject.startsWith("Varauksesi on vahvistettu"), "Finnish subject");
  assert(m.text.includes("/booking/"), "text version has link");
});

Deno.test("confirmation (en) is in English", () => {
  const m = buildEmail("confirmation", { ...booking, locale: "en" }, settings, "https://shop.example");
  assert(m.subject.startsWith("Your booking is confirmed"), "English subject");
});

Deno.test("reminder and admin-reschedule emails never contain a manage link (token is not stored)", () => {
  const { token: _t, ...noToken } = booking;
  assert(!buildEmail("reminder", noToken, settings, "https://shop.example").html.includes("/booking/"), "reminder link");
  assert(!buildEmail("rescheduled", noToken, settings, "https://shop.example").html.includes("/booking/"), "rescheduled link");
});

Deno.test("shop notification goes out in Finnish with customer contact details", () => {
  const m = buildEmail("shop_new", { ...booking, locale: "en" }, settings, "https://shop.example");
  assert(m.subject.startsWith("Uusi varaus"), "Finnish shop subject");
  assert(m.html.includes("+358401112222"), "phone included");
});

Deno.test("ics has UTC times and CRLF line endings", () => {
  const ics = buildIcs(booking, settings);
  assert(ics.includes("DTSTART:20261104T080000Z"), "dtstart");
  assert(ics.includes("DTEND:20261104T083000Z"), "dtend");
  assert(ics.includes("\r\n"), "crlf");
});
