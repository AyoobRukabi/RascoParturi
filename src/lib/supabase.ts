import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(SUPABASE_URL && anon);
export const ANON_KEY = anon ?? "";

// A placeholder URL keeps the app renderable (with a clear "not configured" notice) when env vars are missing.
export const supabase = createClient(SUPABASE_URL ?? "http://localhost:54321", anon ?? "missing-anon-key", {
  auth: { persistSession: true, autoRefreshToken: true },
});
