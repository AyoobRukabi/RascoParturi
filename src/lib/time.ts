// Date helpers. All business dates are interpreted in the shop's time zone (settings.timezone), never the browser's.

export const ymdInTz = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d); // YYYY-MM-DD
export const todayInTz = (tz: string) => ymdInTz(new Date(), tz);

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export const weekdayOf = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay(); // 0 = Sunday

export const locTag = (lng: string) => (lng === "fi" ? "fi-FI" : "en-GB");

export function fmtDate(iso: string, lng: string, tz: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat(locTag(lng), { ...opts, timeZone: tz }).format(new Date(iso));
}
// Always HH:MM with a colon (same as the shop's opening hours), in both languages.
export const fmtTime = (iso: string, _lng: string, tz: string) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz, hour12: false }).format(new Date(iso));

export function fmtYmd(ymd: string, lng: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locTag(lng), { ...opts, timeZone: "UTC" }).format(new Date(`${ymd}T12:00:00Z`));
}

export const eur = (cents: number, lng: string) =>
  new Intl.NumberFormat(locTag(lng), { style: "currency", currency: "EUR", minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);

export const trimTime = (t: string | null) => (t ? t.slice(0, 5) : "");
