// Booking data source. The real implementation talks to Supabase; the preview implementation (lib/preview.tsx)
// simulates responses locally. Pages depend only on this interface.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError, bookingApi } from "./api";
import { SAMPLE_CATALOG, localToIso, sampleDates, sampleManagedBooking, sampleTimes } from "./preview";
import { supabase } from "./supabase";
import type { ManagedBooking } from "./types";

export interface SlotRow { slot_start: string; barber_ids: string[] }
export interface CreatePayload { service_ids: string[]; barber_id: string | null; starts_at: string; locale: string; name: string; phone: string; email: string; notes: string | null; website?: string }
export interface CreateResult { manage_token: string; starts_at: string; email_sent: boolean }

export interface BookingBackend {
  isPreview: boolean;
  fetchDates(barber: string | null, serviceIds: string[], from: string, to: string): Promise<string[]>;
  fetchSlots(barber: string | null, serviceIds: string[], date: string): Promise<SlotRow[]>;
  create(p: CreatePayload): Promise<CreateResult>;
}
export interface ManageBackend {
  isPreview: boolean;
  get(token: string): Promise<ManagedBooking>;
  dates(token: string, from: string, to: string): Promise<string[]>;
  slots(token: string, date: string): Promise<string[]>;
  cancel(token: string): Promise<void>;
  reschedule(token: string, startsAt: string): Promise<void>;
}

export const realBooking: BookingBackend = {
  isPreview: false,
  async fetchDates(barber, serviceIds, from, to) {
    const { data, error } = await supabase.rpc("available_dates", { p_barber: barber, p_service_ids: serviceIds, p_from: from, p_to: to });
    if (error) throw error;
    return data as string[];
  },
  async fetchSlots(barber, serviceIds, date) {
    const { data, error } = await supabase.rpc("available_slots", { p_barber: barber, p_service_ids: serviceIds, p_date: date });
    if (error) throw error;
    return data as SlotRow[];
  },
  create: (p) => bookingApi<CreateResult>("create", { ...p }),
};

export const realManage: ManageBackend = {
  isPreview: false,
  get: (token) => bookingApi<ManagedBooking>("get", { token }),
  dates: async (token, from, to) => (await bookingApi<{ dates: string[] }>("dates", { token, from, to })).dates,
  slots: async (token, date) => (await bookingApi<{ slots: string[] }>("slots", { token, date })).slots,
  cancel: async (token) => { await bookingApi("cancel", { token }); },
  reschedule: async (token, startsAt) => { await bookingApi("reschedule", { token, starts_at: startsAt }); },
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const never = () => new Promise<never>(() => undefined);

/** Preview states for design review: ?state=loading | empty | error (booking), ?state=locked (manage). */
export function makePreviewBooking(state: string | null): BookingBackend {
  return {
    isPreview: true,
    async fetchDates(_b, _s, from, to) { await wait(500); if (state === "loading") return never(); if (state === "empty") return []; return sampleDates(from, to); },
    async fetchSlots(_b, _s, date) {
      await wait(450); if (state === "loading") return never(); if (state === "empty") return [];
      return sampleTimes(date).map((t) => ({ slot_start: localToIso(date, t), barber_ids: SAMPLE_CATALOG.barbers.map((b) => b.id) }));
    },
    async create(p) {
      await wait(1100);
      if (state === "error") throw new ApiError("slot_unavailable", 409);
      return { manage_token: "preview", starts_at: p.starts_at, email_sent: true };
    },
  };
}

export function makePreviewManage(state: string | null): ManageBackend {
  let b = sampleManagedBooking();
  if (state === "locked") b = { ...b, can_cancel: false, can_reschedule: false };
  if (state === "cancelled") b = { ...b, status: "cancelled", can_cancel: false, can_reschedule: false };
  return {
    isPreview: true,
    async get() { await wait(400); if (state === "missing") throw new ApiError("booking_not_found", 404); return b; },
    async dates(_t, from, to) { await wait(400); return sampleDates(from, to); },
    async slots(_t, date) { await wait(350); return sampleTimes(date).map((t) => localToIso(date, t)); },
    async cancel() { await wait(800); b = { ...b, status: "cancelled", can_cancel: false, can_reschedule: false }; },
    async reschedule(_t, startsAt) { await wait(800); b = { ...b, starts_at: startsAt, ends_at: new Date(new Date(startsAt).getTime() + 50 * 60000).toISOString() }; },
  };
}

const BookingCtx = createContext<BookingBackend>(realBooking);
const ManageCtx = createContext<ManageBackend>(realManage);
export const useBookingBackend = () => useContext(BookingCtx);
export const useManageBackend = () => useContext(ManageCtx);

export function PreviewBackends({ children }: { children: ReactNode }) {
  const [sp] = useSearchParams();
  const state = sp.get("state");
  const booking = useMemo(() => makePreviewBooking(state), [state]);
  const manage = useMemo(() => makePreviewManage(state), [state]);
  return <BookingCtx.Provider value={booking}><ManageCtx.Provider value={manage}>{children}</ManageCtx.Provider></BookingCtx.Provider>;
}
