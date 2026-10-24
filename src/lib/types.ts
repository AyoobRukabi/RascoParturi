export interface PublicSettings {
  business_name: string; address: string | null; phone: string | null; public_email: string | null;
  instagram_url: string | null; tiktok_url: string | null; google_maps_url: string | null;
  legal_name: string | null; business_id: string | null; privacy_contact_email: string | null;
  timezone: string; booking_enabled: boolean; allow_multi_service: boolean | null; allow_any_barber: boolean | null;
  max_days_ahead: number | null; cancel_deadline_hours: number | null; reschedule_allowed: boolean | null;
  reschedule_deadline_hours: number | null; retention_days: number | null;
}
export interface Service {
  id: string; slug: string; name_fi: string; name_en: string | null; description_fi: string | null; description_en: string | null;
  category: string | null; price_cents: number; duration_minutes: number | null; bookable_online: boolean;
}
export interface Barber { id: string; name: string; service_ids: string[] }
export interface OpeningHour { weekday: number; open: string | null; close: string | null }
export interface Catalog { settings: PublicSettings; barbers: Barber[]; services: Service[]; opening_hours: OpeningHour[] }

export interface ManagedBooking {
  id: string; status: "confirmed" | "cancelled" | "completed" | "no_show"; starts_at: string; ends_at: string;
  barber: string; barber_id: string; customer_name: string; locale: "fi" | "en";
  total_price_cents: number; total_duration_minutes: number;
  services: { name_fi: string; name_en: string | null; price_cents: number; duration_minutes: number }[];
  can_cancel: boolean; can_reschedule: boolean; cancel_deadline_hours: number | null;
  reschedule_deadline_hours: number | null; timezone: string;
}
