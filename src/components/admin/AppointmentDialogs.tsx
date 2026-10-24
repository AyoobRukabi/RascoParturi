import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge, Notice } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { useAdminData, type Appointment } from "@/hooks/useAdmin";
import { ApiError, adminApi } from "@/lib/api";
import { serviceName } from "@/lib/catalog";
import { supabase } from "@/lib/supabase";
import { eur, fmtDate, fmtTime, ymdInTz } from "@/lib/time";

export function useErr() {
  const { t } = useTranslation();
  return (e: unknown) => {
    if (e instanceof ApiError) { const k = `errors.${e.code}`; return t(k) === k ? e.code : t(k); }
    return e instanceof Error ? e.message : t("errors.unknown");
  };
}

export const statusTone = (s: Appointment["status"]) => (s === "confirmed" ? "success" : s === "completed" ? "brand" : s === "no_show" ? "warn" : "danger") as "success" | "brand" | "warn" | "danger";

export function AppointmentDialog({ appt, tz, onClose }: { appt: Appointment | null; tz: string; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language; const qc = useQueryClient(); const errText = useErr();
  const { data } = useAdminData();
  const [mode, setMode] = useState<"view" | "move">("view");
  const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [barber, setBarber] = useState("");
  const [notify, setNotify] = useState(true); const [msg, setMsg] = useState<{ tone: "danger" | "success"; text: string } | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (appt) { setMode("view"); setMsg(null); setDate(ymdInTz(new Date(appt.starts_at), tz)); setTime(fmtTime(appt.starts_at, "en", tz)); setBarber(appt.barber_id); setNotify(!!appt.customer_email); }
  }, [appt, tz]);
  if (!appt) return null;
  const refresh = () => void qc.invalidateQueries({ queryKey: ["appts"] });
  const run = async (fn: () => Promise<{ email_sent?: boolean } | void>) => {
    setBusy(true); setMsg(null);
    try { const r = await fn(); refresh(); onClose(); void r; } catch (e) { setMsg({ tone: "danger", text: errText(e) }); } finally { setBusy(false); }
  };
  const setStatus = (status: "completed" | "no_show") => run(async () => { const { error } = await supabase.from("appointments").update({ status }).eq("id", appt.id); if (error) throw error; });
  return (
    <Dialog open onClose={onClose} title={appt.customer_name}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2"><Badge tone={statusTone(appt.status)}>{t(`admin.status.${appt.status}`)}</Badge><Badge>{appt.source === "online" ? t("admin.sourceOnline") : t("admin.sourceAdmin")}</Badge></div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">{t("admin.time")}</dt><dd className="capitalize">{fmtDate(appt.starts_at, lng, tz)}, {fmtTime(appt.starts_at, lng, tz)}–{fmtTime(appt.ends_at, lng, tz)}</dd>
          <dt className="text-muted">{t("admin.barber")}</dt><dd>{data?.barbers.find((b) => b.id === appt.barber_id)?.display_name}</dd>
          <dt className="text-muted">{t("admin.services")}</dt><dd>{[...appt.appointment_services].sort((a, b) => a.position - b.position).map((s) => s.name_fi).join(", ")}</dd>
          <dt className="text-muted">{t("common.price")}</dt><dd>{eur(appt.total_price_cents, lng)} · {appt.total_duration_minutes} {t("common.min")}</dd>
          <dt className="text-muted">{t("admin.phone")}</dt><dd><a className="underline" href={`tel:${appt.customer_phone}`}>{appt.customer_phone}</a></dd>
          <dt className="text-muted">{t("admin.email")}</dt><dd className="break-all">{appt.customer_email ?? "—"}</dd>
          {appt.notes && <><dt className="text-muted">{t("admin.notes")}</dt><dd>{appt.notes}</dd></>}
        </dl>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        {appt.status === "confirmed" && mode === "view" && (
          <div className="space-y-3 border-t border-line pt-4">
            {appt.customer_email && <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} label={t("admin.notifyCustomer")} />}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setMode("move")}>{t("admin.rescheduleAppt")}</Button>
              <Button variant="danger" disabled={busy} onClick={() => run(() => adminApi("cancel", { id: appt.id, notify }))}>{t("admin.cancelAppt")}</Button>
              <Button variant="ghost" disabled={busy} onClick={() => setStatus("completed")}>{t("admin.markCompleted")}</Button>
              <Button variant="ghost" disabled={busy} onClick={() => setStatus("no_show")}>{t("admin.markNoShow")}</Button>
            </div>
          </div>
        )}
        {mode === "move" && (
          <div className="space-y-3 border-t border-line pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("admin.date")}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label={t("admin.time")}><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
            </div>
            <Field label={t("admin.barber")}><Select value={barber} onChange={(e) => setBarber(e.target.value)}>{data?.barbers.filter((b) => b.active || b.id === appt.barber_id).map((b) => <option key={b.id} value={b.id}>{b.display_name}</option>)}</Select></Field>
            {appt.customer_email && <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} label={t("admin.notifyCustomer")} />}
            <div className="flex gap-2"><Button variant="outline" onClick={() => setMode("view")}>{t("common.back")}</Button>
              <Button disabled={busy || !date || !time} onClick={() => run(() => adminApi("reschedule", { id: appt.id, date, time, barber_id: barber, notify }))}>{t("common.save")}</Button></div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

export function NewAppointmentDialog({ open, onClose, defaultDate, defaultBarber, tz }: { open: boolean; onClose: () => void; defaultDate: string; defaultBarber?: string; tz: string }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language; const qc = useQueryClient(); const errText = useErr();
  const { data } = useAdminData();
  const [f, setF] = useState({ barber: "", date: defaultDate, time: "10:00", name: "", phone: "", email: "", notes: "", duration: "" });
  const [svc, setSvc] = useState<string[]>([]); const [notify, setNotify] = useState(true);
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setF((p) => ({ ...p, date: defaultDate, barber: defaultBarber ?? p.barber })); setErr(null); } }, [open, defaultDate, defaultBarber]);
  if (!open) return null;
  const barbers = data?.barbers.filter((b) => b.active) ?? [];
  const services = data?.services.filter((s) => s.active) ?? [];
  const needsDuration = svc.some((id) => !services.find((s) => s.id === id)?.duration_minutes);
  void tz;
  return (
    <Dialog open onClose={onClose} title={t("admin.newAppointment")}>
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr(null);
        try {
          await adminApi("create", { barber_id: f.barber || barbers[0]?.id, service_ids: svc, date: f.date, time: f.time, name: f.name, phone: f.phone, email: f.email || null, notes: f.notes || null, duration_minutes: f.duration || null, locale: lng, notify });
          void qc.invalidateQueries({ queryKey: ["appts"] }); onClose();
        } catch (x) { setErr(errText(x)); } finally { setBusy(false); }
      }}>
        <Field label={t("admin.barber")}><Select value={f.barber || barbers[0]?.id || ""} onChange={(e) => setF({ ...f, barber: e.target.value })}>{barbers.map((b) => <option key={b.id} value={b.id}>{b.display_name}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("admin.date")}><Input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label={t("admin.time")}><Input type="time" required value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
        </div>
        <fieldset><legend className="mb-1.5 text-sm font-medium">{t("admin.services")}</legend>
          <div className="space-y-1.5 rounded-xl border border-line p-3">
            {services.map((s) => (
              <Checkbox key={s.id} checked={svc.includes(s.id)} onChange={(e) => setSvc(e.target.checked ? [...svc, s.id] : svc.filter((x) => x !== s.id))}
                label={<>{serviceName(s, lng)} <span className="text-muted">· {eur(s.price_cents, lng)} · {s.duration_minutes ? `${s.duration_minutes} ${t("common.min")}` : t("admin.svc.durationMissing")}</span></>} />
            ))}
          </div>
        </fieldset>
        {(needsDuration || f.duration) && <Field label={t("admin.durationOverride")}><Input type="number" min={5} max={480} required={needsDuration} value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} /></Field>}
        <Field label={t("admin.customer")}><Input required maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("admin.phone")}><Input required type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label={t("admin.emailOptional")}><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        </div>
        <Field label={t("admin.notes")}><Textarea maxLength={500} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        {f.email && <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} label={t("admin.notifyCustomer")} />}
        {err && <Notice tone="danger">{err}</Notice>}
        <Button type="submit" disabled={busy || svc.length === 0} className="w-full">{t("common.save")}</Button>
      </form>
    </Dialog>
  );
}
