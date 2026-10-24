// Shared HTTP helpers for Edge Functions.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allow = allowedOrigins.length === 0 || allowedOrigins.includes(origin) ? origin || "*" : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

// Business errors raised by the SQL functions are plain codes ("slot_unavailable", ...).
const CLIENT_ERRORS: Record<string, number> = {
  slot_unavailable: 409, too_many_bookings: 429, booking_not_found: 404, not_confirmed: 409,
  deadline_passed: 403, reschedule_disabled: 403, reschedule_limit: 403, booking_disabled: 403,
  any_barber_disabled: 400, multi_service_disabled: 400, service_not_bookable: 400, unknown_service: 400,
  no_services: 400, duplicate_services: 400, invalid_name: 400, invalid_phone: 400, invalid_email: 400,
  invalid_source: 400, barber_required: 400, range_too_large: 400,
};

export function dbError(req: Request, err: { message?: string }): Response {
  const code = (err.message ?? "").split(/[:\s]/)[0];
  if (code in CLIENT_ERRORS) return json(req, { error: code }, CLIENT_ERRORS[code]);
  console.error("database error", err);
  return json(req, { error: "internal_error" }, 500);
}

// Best-effort per-isolate rate limiter (not a substitute for bot protection; see docs/SECURITY.md).
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (v[v.length - 1] < now - windowMs) hits.delete(k);
  return arr.length > max;
}

export function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}
