import type { OpeningHour, Service } from "./types";
import { trimTime } from "./time";

export const serviceName = (s: Pick<Service, "name_fi" | "name_en">, lng: string) => (lng === "en" && s.name_en ? s.name_en : s.name_fi);
export const serviceDesc = (s: Service, lng: string) => (lng === "en" ? s.description_en ?? s.description_fi : s.description_fi);

// Is the shop open right now (shop-local time)? Based on the public opening hours, not on barber calendars.
export function isOpenNow(hours: OpeningHour[], tz: string, now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const cur = `${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`;
  const h = hours.find((x) => x.weekday === wd);
  return Boolean(h?.open && h.close && cur >= trimTime(h.open) && cur < trimTime(h.close));
}

export const directionsUrl = (address: string, custom?: string | null) =>
  custom ?? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
export const appleMapsUrl = (address: string) => `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
