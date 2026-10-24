// Admin actions that must also email customers. Authenticated: the caller's JWT must belong to a row in `admins`.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, dbError, json, serviceClient } from "../_shared/http.ts";
import { loadBooking, loadSettings, notifyCustomer, type Locale } from "../_shared/email.ts";

const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const db = serviceClient();
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await db.auth.getUser(jwt);
  if (!u?.user) return json(req, { error: "unauthorized" }, 401);
  const { data: adminRow } = await db.from("admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
  if (!adminRow) return json(req, { error: "forbidden" }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(req, { error: "invalid_json" }, 400); }

  // Local shop time (date + HH:MM) -> timestamptz, using the same time zone logic as the database.
  const toTs = async (date: unknown, time: unknown): Promise<string | null> => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{2}:\d{2}$/.test(String(time))) return null;
    const { data } = await db.rpc("local_ts", { p_date: date, p_time: time });
    return data as string | null;
  };

  try {
    const settings = await loadSettings(db);
    const notify = body.notify !== false;

    if (body.action === "create") {
      const ids = body.service_ids;
      if (!Array.isArray(ids) || !ids.every((x) => typeof x === "string" && UUID.test(x)) || !UUID.test(String(body.barber_id))) return json(req, { error: "invalid_request" }, 400);
      const start = await toTs(body.date, body.time);
      if (!start) return json(req, { error: "invalid_request" }, 400);
      const locale: Locale = body.locale === "en" ? "en" : "fi";
      const { data, error } = await db.rpc("create_booking", {
        p_barber: body.barber_id, p_service_ids: ids, p_start: start, p_name: String(body.name ?? ""), p_phone: String(body.phone ?? ""),
        p_email: body.email ? String(body.email) : null, p_locale: locale, p_source: "admin",
        p_notes: body.notes ? String(body.notes).slice(0, 500) : null,
        p_duration_override: body.duration_minutes ? Number(body.duration_minutes) : null,
      });
      if (error) return dbError(req, error);
      const row = data[0];
      const booking = { ...(await loadBooking(db, row.appointment_id)), token: row.manage_token as string };
      const emailSent = notify ? await notifyCustomer(db, settings, "confirmation", booking, SITE_URL, true) : false;
      return json(req, { appointment_id: row.appointment_id, email_sent: emailSent });
    }

    if (body.action === "cancel") {
      if (!UUID.test(String(body.id))) return json(req, { error: "invalid_request" }, 400);
      const { error } = await db.rpc("admin_cancel_booking", { p_id: body.id });
      if (error) return dbError(req, error);
      const booking = await loadBooking(db, String(body.id));
      const emailSent = notify ? await notifyCustomer(db, settings, "cancelled_by_admin", booking, SITE_URL) : false;
      return json(req, { ok: true, email_sent: emailSent });
    }

    if (body.action === "reschedule") {
      if (!UUID.test(String(body.id))) return json(req, { error: "invalid_request" }, 400);
      const start = await toTs(body.date, body.time);
      if (!start) return json(req, { error: "invalid_request" }, 400);
      const newBarber = body.barber_id ? String(body.barber_id) : null;
      if (newBarber && !UUID.test(newBarber)) return json(req, { error: "invalid_request" }, 400);
      const { data, error } = await db.rpc("admin_reschedule_booking", { p_id: body.id, p_new_start: start, p_new_barber: newBarber });
      if (error) return dbError(req, error);
      const booking = { ...(await loadBooking(db, String(body.id))), old_starts_at: data[0].old_starts_at as string };
      const emailSent = notify ? await notifyCustomer(db, settings, "rescheduled", booking, SITE_URL, true) : false;
      return json(req, { ok: true, email_sent: emailSent });
    }

    return json(req, { error: "unknown_action" }, 400);
  } catch (e) {
    console.error("admin-api failure", e);
    return json(req, { error: "internal_error" }, 500);
  }
});
