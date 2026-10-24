import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useErr } from "@/components/admin/AppointmentDialogs";
import { Button } from "@/components/ui/button";
import { Badge, Card, Notice, Spinner } from "@/components/ui/card";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { useAdminData, type Barber } from "@/hooks/useAdmin";
import { supabase } from "@/lib/supabase";
import { addDays, fmtYmd, trimTime, ymdInTz } from "@/lib/time";
import { serviceName } from "@/lib/catalog";

const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Monday first
type Range = { id: string; weekday: number; start_time: string; end_time: string };

function RangeEditor({ table, barberId, title }: { table: "working_hours" | "barber_breaks"; barberId: string; title: string }) {
  const { t } = useTranslation(); const qc = useQueryClient(); const errText = useErr();
  const short = t("admin.weekdayShort", { returnObjects: true }) as unknown as string[];
  const key = [table, barberId];
  const q = useQuery({ queryKey: key, queryFn: async () => { const { data, error } = await supabase.from(table).select("*").eq("barber_id", barberId).order("start_time"); if (error) throw error; return data as Range[]; } });
  const [add, setAdd] = useState<{ days: number[]; start: string; end: string }>({ days: [], start: "10:00", end: "19:00" });
  const [err, setErr] = useState<string | null>(null);
  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) setErr(errText(error)); else { setErr(null); await qc.invalidateQueries({ queryKey: key }); await qc.invalidateQueries({ queryKey: ["wh-all"] }); } };
  return (
    <div>
      <h3 className="mb-2 font-sans text-lg font-semibold">{title}</h3>
      {q.data?.length === 0 && table === "working_hours" && <Notice tone="warn" className="mb-2">{t("admin.barbers.noHours")}</Notice>}
      <ul className="mb-3 space-y-1">
        {WEEK.map((wd) => {
          const rs = (q.data ?? []).filter((r) => r.weekday === wd);
          return rs.length === 0 ? null : (
            <li key={wd} className="flex flex-wrap items-center gap-2 text-sm"><span className="w-10 font-semibold">{short[wd]}</span>
              {rs.map((r) => <span key={r.id} className="inline-flex items-center gap-1 rounded-lg bg-surface-2 py-1 pl-2.5 pr-1 tabular-nums">{trimTime(r.start_time)}–{trimTime(r.end_time)}
                <button aria-label={t("common.delete")} className="rounded p-1 text-muted hover:text-danger" onClick={() => void run(supabase.from(table).delete().eq("id", r.id))}><Trash2 className="size-3.5" /></button></span>)}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line p-3">
        <div className="flex gap-1" role="group" aria-label="Weekdays">{WEEK.map((wd) => (
          <button key={wd} type="button" aria-pressed={add.days.includes(wd)} onClick={() => setAdd({ ...add, days: add.days.includes(wd) ? add.days.filter((x) => x !== wd) : [...add.days, wd] })}
            className={`h-9 w-9 rounded-lg border text-xs font-semibold ${add.days.includes(wd) ? "border-brand bg-brand text-brand-fg" : "border-line text-muted"}`}>{short[wd]}</button>))}</div>
        <Input type="time" aria-label="Start" className="h-9 w-auto" value={add.start} onChange={(e) => setAdd({ ...add, start: e.target.value })} />
        <Input type="time" aria-label="End" className="h-9 w-auto" value={add.end} onChange={(e) => setAdd({ ...add, end: e.target.value })} />
        <Button size="sm" disabled={add.days.length === 0 || !add.start || !add.end} onClick={() => void run(supabase.from(table).insert(add.days.map((weekday) => ({ barber_id: barberId, weekday, start_time: add.start, end_time: add.end }))))}><Plus className="size-4" />{t("admin.barbers.addRange")}</Button>
      </div>
      {err && <Notice tone="danger" className="mt-2">{err}</Notice>}
    </div>
  );
}

type Off = { id: string; barber_id: string | null; starts_at: string; ends_at: string; reason: string | null };
function TimeOff({ barberId, tz }: { barberId: string | null; tz: string }) {
  const { t, i18n } = useTranslation(); const qc = useQueryClient(); const errText = useErr();
  const key = ["time_off", barberId];
  const q = useQuery({ queryKey: key, queryFn: async () => {
    let r = supabase.from("time_off").select("*").order("starts_at");
    r = barberId ? r.eq("barber_id", barberId) : r.is("barber_id", null);
    const { data, error } = await r; if (error) throw error; return data as Off[];
  } });
  const [f, setF] = useState({ from: "", to: "", reason: "" }); const [err, setErr] = useState<string | null>(null);
  const addOff = async () => {
    setErr(null);
    const [a, b] = await Promise.all([supabase.rpc("local_ts", { p_date: f.from, p_time: "00:00" }), supabase.rpc("local_ts", { p_date: addDays(f.to || f.from, 1), p_time: "00:00" })]);
    const { error } = await supabase.from("time_off").insert({ barber_id: barberId, starts_at: a.data, ends_at: b.data, reason: f.reason || null });
    if (error || a.error || b.error) { setErr(errText(error ?? a.error ?? b.error)); return; }
    setF({ from: "", to: "", reason: "" }); await qc.invalidateQueries({ queryKey: key }); await qc.invalidateQueries({ queryKey: ["off-day"] });
  };
  return (
    <div>
      <h3 className="mb-2 font-sans text-lg font-semibold">{barberId ? t("admin.barbers.timeOff") : `${t("admin.barbers.timeOff")} — ${t("admin.barbers.allShop")}`}</h3>
      <ul className="mb-3 space-y-1 text-sm">
        {q.data?.map((o) => (
          <li key={o.id} className="flex items-center gap-2"><span className="tabular-nums">{fmtYmd(ymdInTz(new Date(o.starts_at), tz), i18n.language, { day: "numeric", month: "numeric", year: "numeric" })} – {fmtYmd(ymdInTz(new Date(new Date(o.ends_at).getTime() - 1), tz), i18n.language, { day: "numeric", month: "numeric", year: "numeric" })}</span>
            {o.reason && <Badge>{o.reason}</Badge>}
            <button aria-label={t("common.delete")} className="rounded p-1 text-muted hover:text-danger" onClick={async () => { await supabase.from("time_off").delete().eq("id", o.id); await qc.invalidateQueries({ queryKey: key }); await qc.invalidateQueries({ queryKey: ["off-day"] }); }}><Trash2 className="size-4" /></button></li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line p-3">
        <Field label={t("admin.from")}><Input type="date" className="h-9" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
        <Field label={t("admin.to")}><Input type="date" className="h-9" min={f.from} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
        <Field label={t("admin.barbers.reason")}><Input className="h-9" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
        <Button size="sm" disabled={!f.from} onClick={() => void addOff()}><Plus className="size-4" />{t("admin.barbers.addRange")}</Button>
      </div>
      {err && <Notice tone="danger" className="mt-2">{err}</Notice>}
    </div>
  );
}

function BarberCard({ barber }: { barber: Barber }) {
  const { t, i18n } = useTranslation(); const qc = useQueryClient(); const errText = useErr();
  const { data } = useAdminData();
  const [open, setOpen] = useState(false); const [name, setName] = useState(barber.display_name); const [err, setErr] = useState<string | null>(null);
  const tz = data?.settings.timezone ?? "Europe/Helsinki";
  const mine = new Set((data?.barberServices ?? []).filter((x) => x.barber_id === barber.id).map((x) => x.service_id));
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-data"] }).then(() => qc.invalidateQueries({ queryKey: ["catalog"] }));
  const toggleService = async (sid: string, on: boolean) => {
    const { error } = on ? await supabase.from("barber_services").insert({ barber_id: barber.id, service_id: sid }) : await supabase.from("barber_services").delete().eq("barber_id", barber.id).eq("service_id", sid);
    if (error) setErr(errText(error)); else await refresh();
  };
  return (
    <Card className="p-4">
      <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="text-2xl font-bold">{barber.display_name} {!barber.active && <Badge>—</Badge>}</span><ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-5 space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t("admin.barbers.name")}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Button variant="outline" disabled={!name.trim() || name === barber.display_name} onClick={async () => { const { error } = await supabase.from("barbers").update({ display_name: name.trim() }).eq("id", barber.id); if (error) setErr(errText(error)); else await refresh(); }}>{t("common.save")}</Button>
            <Checkbox checked={barber.active} label={t("admin.barbers.active")} onChange={async (e) => { await supabase.from("barbers").update({ active: e.target.checked }).eq("id", barber.id); await refresh(); }} />
          </div>
          <div><h3 className="mb-2 font-sans text-lg font-semibold">{t("admin.barbers.services")}</h3>
            <div className="grid gap-1.5 sm:grid-cols-2">{data?.services.filter((s) => s.active).map((s) => <Checkbox key={s.id} checked={mine.has(s.id)} onChange={(e) => void toggleService(s.id, e.target.checked)} label={serviceName(s, i18n.language)} />)}</div></div>
          <RangeEditor table="working_hours" barberId={barber.id} title={t("admin.barbers.hours")} />
          <RangeEditor table="barber_breaks" barberId={barber.id} title={t("admin.barbers.breaks")} />
          <TimeOff barberId={barber.id} tz={tz} />
          <div className="border-t border-line pt-4">
            <Button variant="danger" size="sm" onClick={async () => {
              if (!confirm(t("admin.barbers.confirmDelete"))) return;
              const { error } = await supabase.from("barbers").delete().eq("id", barber.id);
              if (error) setErr("23503" === (error as { code?: string }).code ? t("admin.barbers.confirmDelete") : errText(error)); else await refresh();
            }}><Trash2 className="size-4" />{t("common.delete")}</Button>
          </div>
          {err && <Notice tone="danger">{err}</Notice>}
        </div>
      )}
    </Card>
  );
}

export default function Barbers() {
  const { t } = useTranslation(); const qc = useQueryClient(); const errText = useErr();
  const { data, isLoading } = useAdminData();
  const [name, setName] = useState(""); const [err, setErr] = useState<string | null>(null);
  if (isLoading || !data) return <Spinner />;
  return (
    <div className="space-y-5">
      <h1 className="text-4xl font-bold">{t("admin.nav.barbers")}</h1>
      <form className="flex flex-wrap gap-2" onSubmit={async (e) => {
        e.preventDefault(); const { error } = await supabase.from("barbers").insert({ display_name: name.trim(), sort_order: data.barbers.length + 1 });
        if (error) setErr(errText(error)); else { setName(""); setErr(null); await qc.invalidateQueries({ queryKey: ["admin-data"] }); }
      }}>
        <Input required className="max-w-xs" placeholder={t("admin.barbers.name")} value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit"><Plus className="size-4" />{t("admin.barbers.add")}</Button>
      </form>
      {err && <Notice tone="danger">{err}</Notice>}
      {data.barbers.map((b) => <BarberCard key={b.id} barber={b} />)}
      <Card className="p-4"><TimeOff barberId={null} tz={data.settings.timezone} /></Card>
    </div>
  );
}
