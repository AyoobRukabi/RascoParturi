// Public booking API. Customers have no account: every mutation is either a fresh booking
// or authorised by the secret token from their email. Business rules live in SQL.
import { clientIp, dbError, corsHeaders, json, rateLimited, serviceClient } from "../_shared/http.ts";
import { loadBooking, loadSettings, notifyCustomer, notifyShop, type Locale } from "../_shared/email.ts";

const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{64}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(req, { error: "invalid_json" }, 400); }

  const ip = clientIp(req);
  if (rateLimited(`all:${ip}`, 60, 60_000)) return json(req, { error: "rate_limited" }, 429);

  const db = serviceClient();
  const action = body.action;

  try {
    if (action === "create") {
      if (rateLimited(`create:${ip}`, 5, 10 * 60_000)) return json(req, { error: "rate_limited" }, 429);
      if (body.website) return json(req, { ok: true }, 200); // honeypot: bots fill hidden fields; pretend success
      const ids = body.service_ids;
      if (!Array.isArray(ids) || !ids.every((x) => typeof x === "string" && UUID.test(x))) return json(req, { error: "unknown_service" }, 400);
      const barber = body.barber_id == null ? null : String(body.barber_id);
      if (barber !== null && !UUID.test(barber)) return json(req, { error: "unknown_barber" }, 400);
      const start = new Date(String(body.starts_at));
      if (isNaN(start.getTime())) return json(req, { error: "slot_unavailable" }, 400);
      const locale: Locale = body.locale === "en" ? "en" : "fi";

      const { data, error } = await db.rpc("create_booking", {
        p_barber: barber, p_service_ids: ids, p_start: start.toISOString(), p_name: String(body.name ?? ""),
        p_phone: String(body.phone ?? ""), p_email: String(body.email ?? ""), p_locale: locale,
        p_source: "online", p_notes: body.notes ? String(body.notes).slice(0, 500) : null,
      });
      if (error) return dbError(req, error);
      const row = data[0];
      const settings = await loadSettings(db);
      const booking = { ...(await loadBooking(db, row.appointment_id)), token: row.manage_token as string };
      const emailSent = await notifyCustomer(db, settings, "confirmation", booking, SITE_URL, true);
      await notifyShop(db, settings, "shop_new", booking, SITE_URL);
      return json(req, { appointment_id: row.appointment_id, manage_token: row.manage_token, starts_at: row.starts_at, email_sent: emailSent });
    }

    // Everything below is authorised by the secret token only.
    const token = String(body.token ?? "");
    if (!TOKEN.test(token)) return json(req, { error: "booking_not_found" }, 404);
    if (rateLimited(`token:${ip}`, 30, 60_000)) return json(req, { error: "rate_limited" }, 429);

    if (action === "get") {
      const { data, error } = await db.rpc("get_booking", { p_token: token });
      return error ? dbError(req, error) : json(req, data);
    }

    if (action === "slots") {
      const date = String(body.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(req, { error: "invalid_date" }, 400);
      const { data, error } = await db.rpc("reschedule_slots", { p_token: token, p_date: date });
      return error ? dbError(req, error) : json(req, { slots: (data as { slot_start: string }[]).map((r) => r.slot_start) });
    }

    if (action === "dates") {
      const from = String(body.from ?? ""); const to = String(body.to ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return json(req, { error: "invalid_date" }, 400);
      const { data, error } = await db.rpc("reschedule_dates", { p_token: token, p_from: from, p_to: to });
      return error ? dbError(req, error) : json(req, { dates: data });
    }

    if (action === "cancel") {
      const { data, error } = await db.rpc("cancel_booking", { p_token: token });
      if (error) return dbError(req, error);
      const settings = await loadSettings(db);
      const booking = await loadBooking(db, data[0].appointment_id);
      await notifyCustomer(db, settings, "cancelled_by_customer", booking, SITE_URL);
      await notifyShop(db, settings, "shop_cancelled", booking, SITE_URL);
      return json(req, { ok: true });
    }

    if (action === "reschedule") {
      const start = new Date(String(body.starts_at));
      if (isNaN(start.getTime())) return json(req, { error: "slot_unavailable" }, 400);
      const { data, error } = await db.rpc("reschedule_booking", { p_token: token, p_new_start: start.toISOString() });
      if (error) return dbError(req, error);
      const settings = await loadSettings(db);
      const booking = { ...(await loadBooking(db, data[0].appointment_id)), token, old_starts_at: data[0].old_starts_at as string };
      const emailSent = await notifyCustomer(db, settings, "rescheduled", booking, SITE_URL, true);
      await notifyShop(db, settings, "shop_rescheduled", booking, SITE_URL);
      return json(req, { ok: true, starts_at: data[0].starts_at, email_sent: emailSent });
    }

    return json(req, { error: "unknown_action" }, 400);
  } catch (e) {
    console.error("booking-api failure", e);
    return json(req, { error: "internal_error" }, 500);
  }
});
