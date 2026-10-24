import { ANON_KEY, SUPABASE_URL } from "./supabase";
import { supabase } from "./supabase";

export class ApiError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}

async function call<T>(fn: string, body: unknown, accessToken?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${accessToken ?? ANON_KEY}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("network_error", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "internal_error", res.status);
  return data as T;
}

export const bookingApi = <T = unknown>(action: string, payload: Record<string, unknown> = {}) =>
  call<T>("booking-api", { action, ...payload });

export async function adminApi<T = unknown>(action: string, payload: Record<string, unknown> = {}) {
  const { data } = await supabase.auth.getSession();
  return call<T>("admin-api", { action, ...payload }, data.session?.access_token);
}
