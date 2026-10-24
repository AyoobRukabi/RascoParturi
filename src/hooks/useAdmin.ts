import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { isConfigured, supabase } from "@/lib/supabase";

// Admin = signed in AND listed in the `admins` table (enforced by RLS in the database, not just here).
export function useAdmin() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isConfigured);
  useEffect(() => {
    if (!isConfigured) return;
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  const isAdminQ = useQuery({
    queryKey: ["is-admin", session?.user.id], enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("admins").select("user_id").eq("user_id", session!.user.id).maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  return { session, ready, isAdmin: isAdminQ.data === true, checking: !ready || (!!session && isAdminQ.isLoading) };
}

export function useAdminData() {
  return useQuery({
    queryKey: ["admin-data"],
    queryFn: async () => {
      const [barbers, services, bs, settings] = await Promise.all([
        supabase.from("barbers").select("*").order("sort_order").order("display_name"),
        supabase.from("services").select("*").order("sort_order").order("name_fi"),
        supabase.from("barber_services").select("*"),
        supabase.from("settings").select("*").single(),
      ]);
      for (const r of [barbers, services, bs, settings]) if (r.error) throw r.error;
      return {
        barbers: barbers.data as Barber[], services: services.data as AdminService[],
        barberServices: bs.data as { barber_id: string; service_id: string }[], settings: settings.data as AdminSettings,
      };
    },
  });
}

export interface Barber { id: string; display_name: string; active: boolean; sort_order: number }
export interface AdminService {
  id: string; slug: string; name_fi: string; name_en: string | null; description_fi: string | null; description_en: string | null;
  category: string | null; price_cents: number; duration_minutes: number | null; active: boolean; bookable_online: boolean; sort_order: number;
}
export interface AdminSettings {
  business_name: string; address: string | null; phone: string | null; public_email: string | null; instagram_url: string | null;
  tiktok_url: string | null; google_maps_url: string | null; legal_name: string | null; business_id: string | null;
  privacy_contact_email: string | null; legal_confirmed: boolean; timezone: string; sender_email: string | null; notification_email: string | null;
  max_days_ahead: number | null; min_notice_minutes: number | null; slot_interval_minutes: number | null; buffer_minutes: number | null;
  cancel_deadline_hours: number | null; reschedule_allowed: boolean | null; reschedule_deadline_hours: number | null; max_reschedules: number | null;
  allow_multi_service: boolean | null; allow_any_barber: boolean | null; max_active_per_email: number | null; reminder_hours_before: number | null;
  retention_days: number | null; booking_enabled: boolean;
}
export interface Appointment {
  id: string; barber_id: string; starts_at: string; ends_at: string; status: "confirmed" | "cancelled" | "completed" | "no_show";
  source: "online" | "admin"; customer_name: string; customer_phone: string; customer_email: string | null; notes: string | null;
  total_price_cents: number; total_duration_minutes: number; appointment_services: { name_fi: string; position: number }[];
}
