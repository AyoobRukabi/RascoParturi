import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AppointmentDialog, statusTone } from "@/components/admin/AppointmentDialogs";
import { Badge, Notice, Spinner } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { useAdminData, type Appointment } from "@/hooks/useAdmin";
import { supabase } from "@/lib/supabase";
import { addDays, eur, fmtDate, fmtTime, todayInTz } from "@/lib/time";
import { APPT_SELECT } from "./Calendar";

export default function Appointments() {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const { data: admin } = useAdminData();
  const tz = admin?.settings.timezone ?? "Europe/Helsinki";
  const [from, setFrom] = useState(() => todayInTz("Europe/Helsinki"));
  const [to, setTo] = useState(() => addDays(todayInTz("Europe/Helsinki"), 30));
  const [status, setStatus] = useState(""); const [barber, setBarber] = useState(""); const [search, setSearch] = useState("");
  const [sel, setSel] = useState<Appointment | null>(null);
  const q = useQuery({
    queryKey: ["appts", "list", from, to, status, barber], enabled: !!admin,
    queryFn: async () => {
      let r = supabase.from("appointments").select(APPT_SELECT).gte("starts_at", `${addDays(from, -1)}T12:00:00Z`).lt("starts_at", `${addDays(to, 1)}T12:00:00Z`).order("starts_at").limit(500);
      if (status) r = r.eq("status", status);
      if (barber) r = r.eq("barber_id", barber);
      const { data, error } = await r; if (error) throw error; return data as Appointment[];
    },
  });
  const needle = search.trim().toLowerCase();
  const rows = (q.data ?? []).filter((a) => !needle || a.customer_name.toLowerCase().includes(needle) || a.customer_phone.replace(/\s/g, "").includes(needle.replace(/\s/g, "")));
  return (
    <div>
      <h1 className="mb-4 text-4xl font-bold">{t("admin.nav.appointments")}</h1>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input type="date" aria-label={t("admin.from")} value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" aria-label={t("admin.to")} value={to} onChange={(e) => setTo(e.target.value)} />
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{t("admin.all")}</option>{(["confirmed", "cancelled", "completed", "no_show"] as const).map((s) => <option key={s} value={s}>{t(`admin.status.${s}`)}</option>)}</Select>
        <Select aria-label={t("admin.barber")} value={barber} onChange={(e) => setBarber(e.target.value)}><option value="">{t("admin.all")}</option>{admin?.barbers.map((b) => <option key={b.id} value={b.id}>{b.display_name}</option>)}</Select>
        <Input placeholder={t("admin.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {q.isLoading && <Spinner />}
      {q.isError && <Notice tone="danger">{t("common.loadError")}</Notice>}
      {q.data && rows.length === 0 && <Notice>{t("admin.noAppointments")}</Notice>}
      <ul className="space-y-2">
        {rows.map((a) => (
          <li key={a.id}>
            <button onClick={() => setSel(a)} className="grid w-full gap-1 rounded-xl border border-line bg-surface p-3 text-left hover:border-brand sm:grid-cols-[11rem_1fr_auto_auto] sm:items-center sm:gap-4">
              <span className="font-semibold tabular-nums">{fmtDate(a.starts_at, lng, tz, { weekday: "short", day: "numeric", month: "numeric" })} {fmtTime(a.starts_at, lng, tz)}</span>
              <span><span className="font-medium">{a.customer_name}</span> <span className="text-sm text-muted">· {admin?.barbers.find((b) => b.id === a.barber_id)?.display_name} · {[...a.appointment_services].sort((x, y) => x.position - y.position).map((s) => s.name_fi).join(", ")}</span></span>
              <span className="tabular-nums text-muted">{eur(a.total_price_cents, lng)}</span>
              <Badge tone={statusTone(a.status)}>{t(`admin.status.${a.status}`)}</Badge>
            </button>
          </li>
        ))}
      </ul>
      <AppointmentDialog appt={sel} tz={tz} onClose={() => setSel(null)} />
    </div>
  );
}
