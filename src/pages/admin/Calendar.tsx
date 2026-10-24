import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppointmentDialog, NewAppointmentDialog, statusTone } from "@/components/admin/AppointmentDialogs";
import { Button } from "@/components/ui/button";
import { Badge, Card, Notice, Spinner } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { useAdminData, type Appointment } from "@/hooks/useAdmin";
import { supabase } from "@/lib/supabase";
import { addDays, fmtTime, fmtYmd, todayInTz, trimTime, weekdayOf, ymdInTz } from "@/lib/time";
import { cn } from "@/lib/utils";

export const APPT_SELECT = "*, appointment_services(name_fi, position)";

// Day view: one column per barber, appointments in time order. Shows each barber's hours and time off.
export default function Calendar() {
  const { t, i18n } = useTranslation();
  const { data: admin, isLoading, error } = useAdminData();
  const tz = admin?.settings.timezone ?? "Europe/Helsinki";
  const [date, setDate] = useState(() => todayInTz("Europe/Helsinki"));
  const [sel, setSel] = useState<Appointment | null>(null);
  const [creating, setCreating] = useState<string | null | false>(false);

  const apptsQ = useQuery({
    queryKey: ["appts", "day", date], enabled: !!admin, refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select(APPT_SELECT)
        .gte("starts_at", `${addDays(date, -1)}T12:00:00Z`).lt("starts_at", `${addDays(date, 1)}T12:00:00Z`).order("starts_at");
      if (error) throw error;
      return (data as Appointment[]).filter((a) => ymdInTz(new Date(a.starts_at), tz) === date);
    },
  });
  const hoursQ = useQuery({
    queryKey: ["wh-all"], enabled: !!admin,
    queryFn: async () => { const { data, error } = await supabase.from("working_hours").select("*").order("start_time"); if (error) throw error; return data as { barber_id: string; weekday: number; start_time: string; end_time: string }[]; },
  });
  const offQ = useQuery({
    queryKey: ["off-day", date], enabled: !!admin,
    queryFn: async () => {
      const { data, error } = await supabase.from("time_off").select("*").lt("starts_at", `${addDays(date, 1)}T12:00:00Z`).gt("ends_at", `${addDays(date, -1)}T12:00:00Z`);
      if (error) throw error; return data as { barber_id: string | null; starts_at: string; ends_at: string; reason: string | null }[];
    },
  });

  if (isLoading) return <Spinner />;
  if (error || !admin) return <Notice tone="danger">{t("common.loadError")}</Notice>;
  const barbers = admin.barbers.filter((b) => b.active);
  const wd = weekdayOf(date);
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}><ChevronLeft className="size-4" /></Button>
        <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-9 w-auto" />
        <Button variant="outline" size="sm" aria-label="Next day" onClick={() => setDate(addDays(date, 1))}><ChevronRight className="size-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => setDate(todayInTz(tz))}>{t("admin.today")}</Button>
        <h1 className="ml-1 text-3xl font-bold capitalize">{fmtYmd(date, i18n.language, { weekday: "long", day: "numeric", month: "long" })}</h1>
        <Button className="ml-auto" onClick={() => setCreating(null)} disabled={barbers.length === 0}><Plus className="size-4" />{t("admin.newAppointment")}</Button>
      </div>
      {barbers.length === 0 && <Notice tone="warn">{t("admin.barbers.noHours")} — {t("admin.nav.barbers")}</Notice>}
      {apptsQ.isLoading && <Spinner />}
      <div className={cn("grid gap-4", barbers.length > 1 && "lg:grid-cols-2", barbers.length > 2 && "xl:grid-cols-3")}>
        {barbers.map((b) => {
          const list = (apptsQ.data ?? []).filter((a) => a.barber_id === b.id);
          const hrs = (hoursQ.data ?? []).filter((h) => h.barber_id === b.id && h.weekday === wd);
          const off = (offQ.data ?? []).filter((o) => (o.barber_id === null || o.barber_id === b.id) && ymdInTz(new Date(o.starts_at), tz) <= date && ymdInTz(new Date(new Date(o.ends_at).getTime() - 1), tz) >= date);
          return (
            <Card key={b.id} className="p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div><h2 className="text-2xl font-bold">{b.display_name}</h2>
                  <p className="text-sm text-muted">{hrs.length ? hrs.map((h) => `${trimTime(h.start_time)}–${trimTime(h.end_time)}`).join(", ") : t("home.closedDay")}</p></div>
                <Button size="sm" variant="outline" onClick={() => setCreating(b.id)}><Plus className="size-4" /></Button>
              </div>
              {off.map((o, i) => <Badge key={i} tone="warn" className="mb-2 mr-1">{o.reason ?? t("admin.barbers.timeOff")}{o.barber_id === null ? ` · ${t("admin.barbers.allShop")}` : ""}</Badge>)}
              {list.length === 0 ? <p className="py-6 text-center text-sm text-muted">{t("admin.noAppointments")}</p> : (
                <ul className="space-y-2">
                  {list.map((a) => (
                    <li key={a.id}>
                      <button onClick={() => setSel(a)} className={cn("w-full rounded-xl border border-line bg-surface-2 p-3 text-left hover:border-brand", a.status !== "confirmed" && "opacity-60")}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold tabular-nums">{fmtTime(a.starts_at, i18n.language, tz)}–{fmtTime(a.ends_at, i18n.language, tz)}</span>
                          <Badge tone={statusTone(a.status)}>{t(`admin.status.${a.status}`)}</Badge>
                        </div>
                        <div className={cn("mt-1 font-medium", a.status === "cancelled" && "line-through")}>{a.customer_name}</div>
                        <div className="text-sm text-muted">{[...a.appointment_services].sort((x, y) => x.position - y.position).map((s) => s.name_fi).join(", ")}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
      <AppointmentDialog appt={sel} tz={tz} onClose={() => setSel(null)} />
      <NewAppointmentDialog open={creating !== false} onClose={() => setCreating(false)} defaultDate={date} defaultBarber={creating || undefined} tz={tz} />
    </div>
  );
}
