import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useErr } from "@/components/admin/AppointmentDialogs";
import { Button } from "@/components/ui/button";
import { Card, Notice, Spinner } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { useAdminData, type AdminSettings } from "@/hooks/useAdmin";
import { supabase } from "@/lib/supabase";

type Form = Record<string, string>;
const TEXT = ["business_name", "address", "phone", "public_email", "instagram_url", "tiktok_url", "google_maps_url", "sender_email", "notification_email", "legal_name", "business_id", "privacy_contact_email"] as const;
const NUM = ["max_days_ahead", "min_notice_minutes", "slot_interval_minutes", "buffer_minutes", "cancel_deadline_hours", "reschedule_deadline_hours", "max_reschedules", "max_active_per_email", "reminder_hours_before", "retention_days"] as const;
const TRI = ["reschedule_allowed", "allow_multi_service", "allow_any_barber"] as const; // true / false / not confirmed (null)

const toForm = (s: AdminSettings): Form => {
  const f: Form = {};
  for (const k of TEXT) f[k] = (s[k] as string | null) ?? "";
  for (const k of NUM) f[k] = s[k] === null ? "" : String(s[k]);
  for (const k of TRI) f[k] = s[k] === null ? "" : String(s[k]);
  return f;
};

export default function SettingsPage() {
  const { t } = useTranslation(); const qc = useQueryClient(); const errText = useErr();
  const { data, isLoading } = useAdminData();
  const readyQ = useQuery({ queryKey: ["readiness"], enabled: !!data, queryFn: async () => { const { data: d, error } = await supabase.rpc("booking_readiness"); if (error) throw error; return d as string[]; } });
  const [f, setF] = useState<Form>({}); const [legal, setLegal] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  useEffect(() => { if (data) { setF(toForm(data.settings)); setLegal(data.settings.legal_confirmed); } }, [data]);
  if (isLoading || !data) return <Spinner />;
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const text = (k: (typeof TEXT)[number], label: string, type = "text") => <Field label={label}><Input type={type} value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} /></Field>;
  const num = (k: (typeof NUM)[number], label: string) => <Field label={label}><Input type="number" min={0} value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} /></Field>;
  const tri = (k: (typeof TRI)[number], label: string) => (
    <Field label={label}><Select value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)}><option value="">— {t("admin.settings.missing")} —</option><option value="true">{t("common.yes")}</option><option value="false">{t("common.no")}</option></Select></Field>
  );
  const save = async (extra: Partial<AdminSettings> = {}) => {
    setMsg(null);
    const row: Record<string, unknown> = { legal_confirmed: legal, ...extra };
    for (const k of TEXT) row[k] = f[k]?.trim() || null;
    row.business_name = f.business_name?.trim() || "Rasco Parturi-Kampaamo";
    for (const k of NUM) row[k] = f[k] === "" ? null : Number(f[k]);
    for (const k of TRI) row[k] = f[k] === "" ? null : f[k] === "true";
    const { error } = await supabase.from("settings").update(row).eq("id", true);
    if (error) { setMsg({ tone: "danger", text: errText(error) }); return false; }
    setMsg({ tone: "success", text: t("admin.saved") });
    await qc.invalidateQueries({ queryKey: ["admin-data"] }); await qc.invalidateQueries({ queryKey: ["catalog"] }); await qc.invalidateQueries({ queryKey: ["readiness"] });
    return true;
  };
  const missing = readyQ.data ?? [];
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-4xl font-bold">{t("admin.nav.settings")}</h1>

      <Card>
        <h2 className="mb-3 text-2xl font-bold">{t("admin.settings.readiness")}</h2>
        {readyQ.isLoading ? <Spinner /> : missing.length === 0
          ? <p className="flex items-center gap-2 text-success"><CheckCircle2 className="size-5" />{t("admin.settings.ready")}</p>
          : <ul className="space-y-1.5 text-sm">{missing.map((m) => <li key={m} className="flex items-center gap-2 text-warn"><AlertTriangle className="size-4 shrink-0" />{t(`admin.settings.items.${m}`)}</li>)}</ul>}
        <div className="mt-4 border-t border-line pt-4">
          <Checkbox checked={data.settings.booking_enabled} disabled={!data.settings.booking_enabled && missing.length > 0}
            onChange={(e) => void save({ booking_enabled: e.target.checked })} label={<strong>{t("admin.settings.enable")}</strong>} />
        </div>
      </Card>

      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Card className="space-y-3"><h2 className="text-2xl font-bold">{t("admin.settings.business")}</h2>
          {text("business_name", t("admin.settings.businessName"))}{text("address", t("admin.settings.address"))}{text("phone", t("admin.settings.phone"), "tel")}
          {text("public_email", t("admin.settings.publicEmail"), "email")}{text("instagram_url", t("admin.settings.instagram"), "url")}{text("tiktok_url", t("admin.settings.tiktok"), "url")}{text("google_maps_url", t("admin.settings.maps"), "url")}</Card>
        <Card className="space-y-3"><h2 className="text-2xl font-bold">{t("admin.settings.rules")}</h2><p className="text-sm text-muted">{t("admin.settings.rulesHelp")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {num("max_days_ahead", t("admin.settings.maxDaysAhead"))}{num("min_notice_minutes", t("admin.settings.minNotice"))}{num("slot_interval_minutes", t("admin.settings.slotInterval"))}{num("buffer_minutes", t("admin.settings.buffer"))}
            {num("cancel_deadline_hours", t("admin.settings.cancelDeadline"))}{tri("reschedule_allowed", t("admin.settings.rescheduleAllowed"))}{num("reschedule_deadline_hours", t("admin.settings.rescheduleDeadline"))}{num("max_reschedules", t("admin.settings.maxReschedules"))}
            {tri("allow_multi_service", t("admin.settings.multi"))}{tri("allow_any_barber", t("admin.settings.anyBarber"))}{num("max_active_per_email", t("admin.settings.maxPerEmail"))}{num("reminder_hours_before", t("admin.settings.reminder"))}{num("retention_days", t("admin.settings.retention"))}
          </div></Card>
        <Card className="space-y-3"><h2 className="text-2xl font-bold">{t("admin.settings.email")}</h2>{text("sender_email", t("admin.settings.senderEmail"), "email")}{text("notification_email", t("admin.settings.notificationEmail"), "email")}</Card>
        <Card className="space-y-3"><h2 className="text-2xl font-bold">{t("admin.settings.legal")}</h2>
          {text("legal_name", t("admin.settings.legalName"))}{text("business_id", t("admin.settings.businessId"))}{text("privacy_contact_email", t("admin.settings.privacyEmail"), "email")}
          <Checkbox checked={legal} onChange={(e) => setLegal(e.target.checked)} label={t("admin.settings.legalConfirmed")} /></Card>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Button type="submit" size="lg">{t("common.save")}</Button>
      </form>
    </div>
  );
}
