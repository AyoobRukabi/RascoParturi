// Email delivery through Resend + bilingual (fi/en) templates. Email is the only notification channel.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type Locale = "fi" | "en";

export interface Settings {
  business_name: string; address: string | null; phone: string | null; timezone: string;
  sender_email: string | null; notification_email: string | null;
  cancel_deadline_hours: number | null; reschedule_allowed: boolean | null; reschedule_deadline_hours: number | null;
}

export interface Booking {
  id: string; starts_at: string; ends_at: string; locale: Locale; customer_name: string;
  customer_email: string | null; customer_phone?: string; barber: string; services: { name: string }[];
  total_price_cents: number; token?: string; old_starts_at?: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const eur = (c: number, l: Locale) => new Intl.NumberFormat(l === "fi" ? "fi-FI" : "en-GB", { style: "currency", currency: "EUR" }).format(c / 100);
export const fmtDateTime = (iso: string, l: Locale, tz: string) =>
  new Intl.DateTimeFormat(l === "fi" ? "fi-FI" : "en-GB", { dateStyle: "full", timeStyle: "short", timeZone: tz }).format(new Date(iso));

const T = {
  fi: {
    confirmed: "Varauksesi on vahvistettu", rescheduled: "Varauksesi aikaa on muutettu", cancelled: "Varauksesi on peruttu",
    reminder: "Muistutus tulevasta ajastasi", hello: (n: string) => `Hei ${n},`,
    when: "Aika", barber: "Parturi", services: "Palvelut", price: "Hinta (maksetaan paikan päällä)", oldTime: "Aiempi aika",
    manage: "Hallinnoi varaustasi (peruuta tai vaihda aikaa)", manageHelp: "Voit peruuttaa tai siirtää aikaasi tämän henkilökohtaisen linkin kautta. Älä jaa linkkiä muille.",
    deadline: (h: number) => h === 0 ? "Peruutus on mahdollista varauksen alkamiseen asti." : `Peruutus on mahdollista viimeistään ${h} h ennen varattua aikaa.`,
    cancelledByShop: "Valitettavasti jouduimme perumaan varauksesi. Ota yhteyttä, jos haluat varata uuden ajan.",
    cancelledByYou: "Olemme perunut varauksesi pyyntösi mukaisesti.", seeYou: "Tervetuloa!", address: "Osoite",
    useOriginal: "Voit peruuttaa tai siirtää aikaa vahvistusviestissä olleen linkin kautta.", ics: "Lisää kalenteriin: liitteenä oleva tiedosto.", shopNew: "Uusi varaus", shopCancelled: "Asiakas peruutti varauksen", shopMoved: "Asiakas siirsi varauksen",
    customer: "Asiakas", phone: "Puhelin", email: "Sähköposti",
  },
  en: {
    confirmed: "Your booking is confirmed", rescheduled: "Your booking has been rescheduled", cancelled: "Your booking has been cancelled",
    reminder: "Reminder of your upcoming appointment", hello: (n: string) => `Hi ${n},`,
    when: "Time", barber: "Barber", services: "Services", price: "Price (paid at the shop)", oldTime: "Previous time",
    manage: "Manage your booking (cancel or reschedule)", manageHelp: "You can cancel or move your appointment with this personal link. Please do not share it.",
    deadline: (h: number) => h === 0 ? "You can cancel up to the start of the appointment." : `You can cancel up to ${h} h before the appointment.`,
    cancelledByShop: "Unfortunately we had to cancel your booking. Please get in touch if you would like to book a new time.",
    cancelledByYou: "We have cancelled your booking as requested.", seeYou: "See you soon!", address: "Address",
    useOriginal: "To cancel or move your appointment, use the link in your original confirmation email.", ics: "Add to calendar: see the attached file.", shopNew: "New booking", shopCancelled: "Customer cancelled a booking", shopMoved: "Customer rescheduled a booking",
    customer: "Customer", phone: "Phone", email: "Email",
  },
} as const;

export type Kind = "confirmation" | "rescheduled" | "cancelled_by_customer" | "cancelled_by_admin" | "reminder" |
  "shop_new" | "shop_cancelled" | "shop_rescheduled";

function layout(s: Settings, title: string, rows: [string, string][], extra: string, l: Locale): string {
  const trs = rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;vertical-align:top">${esc(k)}</td><td style="padding:6px 0"><strong>${v}</strong></td></tr>`).join("");
  const addr = s.address ? `<p style="color:#6b7280;font-size:13px">${esc(T[l].address)}: ${esc(s.address)}${s.phone ? ` · ${esc(s.phone)}` : ""}</p>` : "";
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<div style="max-width:560px;margin:0 auto;padding:24px"><div style="background:#0a0a0a;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:18px;letter-spacing:.08em">${esc(s.business_name.toUpperCase())}</div>
<div style="background:#fff;padding:24px;border-radius:0 0 12px 12px"><h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>
<table style="border-collapse:collapse;font-size:15px">${trs}</table>${extra}${addr}</div></div></body></html>`;
}

export function buildEmail(kind: Kind, b: Booking, s: Settings, siteUrl: string): { subject: string; html: string; text: string } {
  const l = b.locale; const t = T[l];
  const when = fmtDateTime(b.starts_at, l, s.timezone);
  const svc = b.services.map((x) => esc(x.name)).join(", ");
  const rows: [string, string][] = [[t.when, esc(when)], [t.barber, esc(b.barber)], [t.services, svc], [t.price, esc(eur(b.total_price_cents, l))]];
  const manageUrl = b.token ? `${siteUrl}/booking/${b.token}` : null;
  const manageBtn = manageUrl
    ? `<p style="margin:20px 0 6px"><a href="${manageUrl}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block">${esc(t.manage)}</a></p><p style="color:#6b7280;font-size:13px">${esc(t.manageHelp)}${s.cancel_deadline_hours !== null ? " " + esc(t.deadline(s.cancel_deadline_hours)) : ""}</p>` : "";
  let subject: string; let intro = ""; let showManage = false; let title: string;
  switch (kind) {
    case "confirmation": title = t.confirmed; subject = `${t.confirmed} – ${when}`; intro = t.seeYou; showManage = true; break;
    case "rescheduled": title = t.rescheduled; subject = `${t.rescheduled} – ${when}`; showManage = true; if (!b.token) intro = t.useOriginal;
      if (b.old_starts_at) rows.unshift([t.oldTime, esc(fmtDateTime(b.old_starts_at, l, s.timezone))]); break;
    case "reminder": title = t.reminder; subject = `${t.reminder} – ${when}`; intro = t.useOriginal; break;
    case "cancelled_by_customer": title = t.cancelled; subject = t.cancelled; intro = t.cancelledByYou; break;
    case "cancelled_by_admin": title = t.cancelled; subject = t.cancelled; intro = t.cancelledByShop; break;
    default: { // shop notifications are always Finnish-first: the owner reads Finnish
      const f = T.fi; const label = kind === "shop_new" ? f.shopNew : kind === "shop_cancelled" ? f.shopCancelled : f.shopMoved;
      title = label; subject = `${label}: ${b.customer_name} – ${fmtDateTime(b.starts_at, "fi", s.timezone)}`;
      const r: [string, string][] = [[f.customer, esc(b.customer_name)], [f.phone, esc(b.customer_phone ?? "")], [f.email, esc(b.customer_email ?? "")],
        [f.when, esc(fmtDateTime(b.starts_at, "fi", s.timezone))], [f.barber, esc(b.barber)], [f.services, svc]];
      if (b.old_starts_at) r.push([f.oldTime, esc(fmtDateTime(b.old_starts_at, "fi", s.timezone))]);
      return { subject, html: layout(s, title, r, "", "fi"), text: r.map(([k, v]) => `${k}: ${v.replace(/<[^>]+>/g, "")}`).join("\n") };
    }
  }
  const extra = (intro ? `<p style="margin:16px 0 0">${esc(t.hello(b.customer_name))} ${esc(intro)}</p>` : `<p style="margin:16px 0 0">${esc(t.hello(b.customer_name))}</p>`) + (showManage ? manageBtn : "");
  const text = [t.hello(b.customer_name), title, ...rows.map(([k, v]) => `${k}: ${v.replace(/<[^>]+>/g, "")}`), manageUrl && showManage ? `${t.manage}: ${manageUrl}` : ""].filter(Boolean).join("\n");
  return { subject, html: layout(s, title, rows, extra, l), text };
}

function icsEscape(s: string) { return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function buildIcs(b: Booking, s: Settings): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Rasco//Booking//EN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${b.id}@booking`, `DTSTAMP:${icsDate(new Date().toISOString())}`, `DTSTART:${icsDate(b.starts_at)}`, `DTEND:${icsDate(b.ends_at)}`,
    `SUMMARY:${icsEscape(`${s.business_name}: ${b.services.map((x) => x.name).join(", ")}`)}`,
    ...(s.address ? [`LOCATION:${icsEscape(s.address)}`] : []), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

// Sends one email through Resend and records the outcome in email_log. Never throws:
// a failed email must not undo a successful booking.
export async function sendEmail(db: SupabaseClient, s: Settings, opts: {
  to: string; subject: string; html: string; text: string; kind: Kind; appointmentId: string; ics?: string;
}): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  let status: "sent" | "failed" = "failed"; let providerId: string | null = null; let error: string | null = null;
  if (!key) error = "RESEND_API_KEY not configured";
  else if (!s.sender_email) error = "settings.sender_email not configured";
  else {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${s.business_name} <${s.sender_email}>`, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text,
          ...(opts.ics ? { attachments: [{ filename: "appointment.ics", content: btoa(unescape(encodeURIComponent(opts.ics))) }] } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) { status = "sent"; providerId = body.id ?? null; } else error = `${res.status}: ${body.message ?? "send failed"}`;
    } catch (e) { error = String(e); }
  }
  await db.from("email_log").insert({ appointment_id: opts.appointmentId, kind: opts.kind, recipient: opts.to, status, provider_id: providerId, error });
  if (status === "failed") console.error("email failed", opts.kind, error);
  return status === "sent";
}

export async function loadSettings(db: SupabaseClient): Promise<Settings> {
  const { data, error } = await db.from("settings").select("business_name,address,phone,timezone,sender_email,notification_email,cancel_deadline_hours,reschedule_allowed,reschedule_deadline_hours").single();
  if (error) throw error;
  return data as Settings;
}

// Load an appointment (+ barber name + service snapshot lines) in the shape the templates need.
export async function loadBooking(db: SupabaseClient, id: string, locale?: Locale): Promise<Booking> {
  const { data, error } = await db.from("appointments")
    .select("id,starts_at,ends_at,locale,customer_name,customer_email,customer_phone,total_price_cents,barbers(display_name),appointment_services(position,name_fi,name_en)")
    .eq("id", id).single();
  if (error) throw error;
  const l = (locale ?? data.locale) as Locale;
  const svcs = [...(data.appointment_services as { position: number; name_fi: string; name_en: string | null }[])]
    .sort((a, b) => a.position - b.position).map((x) => ({ name: l === "en" && x.name_en ? x.name_en : x.name_fi }));
  return { id: data.id, starts_at: data.starts_at, ends_at: data.ends_at, locale: data.locale, customer_name: data.customer_name,
    customer_email: data.customer_email, customer_phone: data.customer_phone, barber: (data.barbers as unknown as { display_name: string }).display_name,
    services: svcs, total_price_cents: data.total_price_cents };
}

export async function notifyCustomer(db: SupabaseClient, s: Settings, kind: Kind, b: Booking, siteUrl: string, withIcs = false): Promise<boolean> {
  if (!b.customer_email) return false;
  const m = buildEmail(kind, b, s, siteUrl);
  return sendEmail(db, s, { to: b.customer_email, ...m, kind, appointmentId: b.id, ics: withIcs ? buildIcs(b, s) : undefined });
}

export async function notifyShop(db: SupabaseClient, s: Settings, kind: Kind, b: Booking, siteUrl: string): Promise<void> {
  if (!s.notification_email) return;
  const m = buildEmail(kind, b, s, siteUrl);
  await sendEmail(db, s, { to: s.notification_email, ...m, kind, appointmentId: b.id });
}
