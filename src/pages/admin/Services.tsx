import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useErr } from "@/components/admin/AppointmentDialogs";
import { Button } from "@/components/ui/button";
import { Badge, Card, Notice, Spinner } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { useAdminData, type AdminService } from "@/hooks/useAdmin";
import { supabase } from "@/lib/supabase";
import { eur } from "@/lib/time";

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "service";
type Draft = { id?: string; name_fi: string; name_en: string; description_fi: string; description_en: string; price: string; duration: string; active: boolean; bookable_online: boolean; sort_order: string };
const empty: Draft = { name_fi: "", name_en: "", description_fi: "", description_en: "", price: "", duration: "", active: true, bookable_online: false, sort_order: "100" };

export default function Services() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient(); const errText = useErr();
  const { data, isLoading } = useAdminData();
  const [d, setD] = useState<Draft | null>(null); const [err, setErr] = useState<string | null>(null);
  if (isLoading || !data) return <Spinner />;
  const edit = (s: AdminService) => setD({ id: s.id, name_fi: s.name_fi, name_en: s.name_en ?? "", description_fi: s.description_fi ?? "", description_en: s.description_en ?? "", price: String(s.price_cents / 100), duration: s.duration_minutes?.toString() ?? "", active: s.active, bookable_online: s.bookable_online, sort_order: String(s.sort_order) });
  const missing = data.services.filter((s) => s.active && !s.duration_minutes).length;
  const save = async () => {
    if (!d) return; setErr(null);
    const row = {
      name_fi: d.name_fi.trim(), name_en: d.name_en.trim() || null, description_fi: d.description_fi.trim() || null, description_en: d.description_en.trim() || null,
      price_cents: Math.round(Number(d.price.replace(",", ".")) * 100), duration_minutes: d.duration ? Number(d.duration) : null,
      active: d.active, bookable_online: d.bookable_online && !!d.duration, sort_order: Number(d.sort_order) || 0,
    };
    const { error } = d.id ? await supabase.from("services").update(row).eq("id", d.id)
      : await supabase.from("services").insert({ ...row, slug: `${slugify(row.name_fi)}-${Math.random().toString(36).slice(2, 6)}` });
    if (error) { setErr(errText(error)); return; }
    await qc.invalidateQueries({ queryKey: ["admin-data"] }); await qc.invalidateQueries({ queryKey: ["catalog"] }); setD(null);
  };
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3"><h1 className="text-4xl font-bold">{t("admin.nav.services")}</h1><Button onClick={() => setD(empty)}><Plus className="size-4" />{t("admin.svc.add")}</Button></div>
      {missing > 0 && <Notice tone="warn" className="mb-4">{t("admin.svc.needDuration")} ({missing})</Notice>}
      <ul className="space-y-2">
        {data.services.map((s) => (
          <li key={s.id}>
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0"><div className="font-semibold">{i18n.language === "en" && s.name_en ? s.name_en : s.name_fi}</div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-sm text-muted"><span>{eur(s.price_cents, i18n.language)}</span><span>·</span>
                  {s.duration_minutes ? <span>{s.duration_minutes} {t("common.min")}</span> : <Badge tone="warn">{t("admin.svc.durationMissing")}</Badge>}
                  {!s.active && <Badge>{t("admin.svc.active")}: {t("common.no")}</Badge>}{s.bookable_online && <Badge tone="success">{t("admin.svc.bookable")}</Badge>}</div></div>
              <Button variant="outline" size="sm" onClick={() => edit(s)}><Pencil className="size-4" />{t("common.edit")}</Button>
            </Card>
          </li>
        ))}
      </ul>
      {d && (
        <Dialog open onClose={() => setD(null)} title={d.id ? t("common.edit") : t("admin.svc.add")}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <Field label={t("admin.svc.name")}><Input required value={d.name_fi} onChange={(e) => setD({ ...d, name_fi: e.target.value })} /></Field>
            <Field label={t("admin.svc.nameEn")} optional={t("common.optional")}><Input value={d.name_en} onChange={(e) => setD({ ...d, name_en: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("admin.svc.price")}><Input required inputMode="decimal" value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} /></Field>
              <Field label={t("admin.svc.duration")} hint={d.duration ? undefined : t("admin.svc.needDuration")}><Input type="number" min={5} max={480} step={5} value={d.duration} onChange={(e) => setD({ ...d, duration: e.target.value, bookable_online: e.target.value ? d.bookable_online : false })} /></Field>
            </div>
            <Field label={t("admin.svc.order")}><Input type="number" value={d.sort_order} onChange={(e) => setD({ ...d, sort_order: e.target.value })} /></Field>
            <Field label="Kuvaus (FI)" optional={t("common.optional")}><Textarea rows={2} value={d.description_fi} onChange={(e) => setD({ ...d, description_fi: e.target.value })} /></Field>
            <Field label="Description (EN)" optional={t("common.optional")}><Textarea rows={2} value={d.description_en} onChange={(e) => setD({ ...d, description_en: e.target.value })} /></Field>
            <Checkbox checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} label={t("admin.svc.active")} />
            <Checkbox checked={d.bookable_online} disabled={!d.duration} onChange={(e) => setD({ ...d, bookable_online: e.target.checked })} label={t("admin.svc.bookable")} />
            {err && <Notice tone="danger">{err}</Notice>}
            <Button type="submit" className="w-full">{t("common.save")}</Button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
