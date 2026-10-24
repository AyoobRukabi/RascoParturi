// Scheduled (every ~15 min) via pg_cron/pg_net or the Supabase dashboard. Protected by a shared secret header.
import { serviceClient } from "../_shared/http.ts";
import { loadBooking, loadSettings, notifyCustomer } from "../_shared/email.ts";

const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return new Response("forbidden", { status: 403 });
  const db = serviceClient();
  const settings = await loadSettings(db);
  const { data, error } = await db.rpc("due_reminders");
  if (error) { console.error(error); return new Response("error", { status: 500 }); }
  let sent = 0;
  for (const a of data as { id: string }[]) {
    const ok = await notifyCustomer(db, settings, "reminder", await loadBooking(db, a.id), SITE_URL);
    if (ok) { await db.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", a.id); sent++; }
  }
  return new Response(JSON.stringify({ due: (data as unknown[]).length, sent }), { headers: { "Content-Type": "application/json" } });
});
