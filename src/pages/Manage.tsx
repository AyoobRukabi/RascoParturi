import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge, Card, Notice, Spinner } from "@/components/ui/card";
import { MonthPicker } from "@/components/MonthPicker";
import { ApiError, bookingApi } from "@/lib/api";
import { addDays, eur, fmtDate, fmtTime, todayInTz } from "@/lib/time";
import type { ManagedBooking } from "@/lib/types";
import { useCatalog } from "@/hooks/useCatalog";
import { cn } from "@/lib/utils";

// Customer self-service: the secret token in the URL is the only credential (no account).
export default function Manage() {
  const { token = "" } = useParams();
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const qc = useQueryClient();
  const catalog = useCatalog().data;
  const [mode, setMode] = useState<"view" | "cancel" | "reschedule">("view");
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["booking", token], retry: false,
    queryFn: () => bookingApi<ManagedBooking>("get", { token }),
  });
  const b = q.data;
  const tz = b?.timezone ?? "Europe/Helsinki";
  const today = todayInTz(tz);
  const maxDays = Math.min(catalog?.settings.max_days_ahead ?? 30, 62);

  const daysQ = useQuery({
    queryKey: ["resched-days", token], enabled: mode === "reschedule" && !!b, staleTime: 30_000,
    queryFn: async () => new Set((await bookingApi<{ dates: string[] }>("dates", { token, from: today, to: addDays(today, maxDays) })).dates),
  });
  const slotsQ = useQuery({
    queryKey: ["resched-slots", token, date], enabled: mode === "reschedule" && !!date,
    queryFn: () => bookingApi<{ slots: string[] }>("slots", { token, date }),
  });

  const fail = (e: unknown) => {
    const code = e instanceof ApiError ? e.code : "unknown";
    const k = `errors.${code}`; setMsg({ tone: "danger", text: t(k) === k ? t("errors.unknown") : t(k) });
  };
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["booking", token] }); void qc.invalidateQueries({ queryKey: ["resched-days", token] }); };

  if (q.isLoading) return <div className="py-24"><Spinner /></div>;
  if (q.isError || !b) return (
    <div className="mx-auto max-w-xl px-4 py-16"><Notice tone="danger">{t("manage.notFound")}</Notice>
      {catalog?.settings.phone && <p className="mt-4 text-center">{t("manage.contactUs")} <a className="font-semibold underline" href={`tel:${catalog.settings.phone}`}>{catalog.settings.phone}</a></p>}</div>
  );

  const tone = b.status === "confirmed" ? "success" : b.status === "cancelled" || b.status === "no_show" ? "danger" : "default";
  const dl = (kind: "Cancel" | "Resched", h: number | null) => h === null ? null : h === 0 ? t(`manage.deadline${kind}Zero`) : t(`manage.deadline${kind}`, { h });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-5xl font-bold">{t("manage.title")}</h1>
      {msg && <Notice tone={msg.tone} className="mb-4">{msg.text}</Notice>}
      <Card>
        <div className="mb-4 flex items-center justify-between"><span className="text-muted">{b.customer_name}</span><Badge tone={tone}>{t(`manage.status.${b.status}`)}</Badge></div>
        <dl className="space-y-3">
          <div><dt className="text-sm text-muted">{t("manage.when")}</dt><dd className="text-xl font-semibold capitalize">{fmtDate(b.starts_at, lng, tz)}, {fmtTime(b.starts_at, lng, tz)}</dd></div>
          <div><dt className="text-sm text-muted">{t("manage.barber")}</dt><dd className="font-medium">{b.barber}</dd></div>
          <div><dt className="text-sm text-muted">{t("manage.services")}</dt>
            <dd><ul>{b.services.map((s, i) => <li key={i} className="flex justify-between"><span>{lng === "en" && s.name_en ? s.name_en : s.name_fi}</span><span className="tabular-nums text-muted">{eur(s.price_cents, lng)}</span></li>)}</ul></dd></div>
          <div className="flex justify-between border-t border-line pt-3 font-semibold"><span>{t("manage.total")}</span><span className="tabular-nums">{eur(b.total_price_cents, lng)} · {b.total_duration_minutes} {t("common.min")}</span></div>
        </dl>
      </Card>

      {b.status === "confirmed" && mode === "view" && (
        <div className="mt-6 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={!b.can_reschedule} onClick={() => { setMsg(null); setMode("reschedule"); }}>{t("manage.rescheduleBtn")}</Button>
            <Button variant="danger" disabled={!b.can_cancel} onClick={() => { setMsg(null); setMode("cancel"); }}>{t("manage.cancelBtn")}</Button>
          </div>
          {!b.can_cancel && <Notice tone="warn">{t("manage.cantCancel")} {t("manage.contactUs")} {catalog?.settings.phone}</Notice>}
          {!b.can_reschedule && b.can_cancel && <Notice>{t("manage.cantReschedule")}</Notice>}
          <p className="text-sm text-muted">{dl("Cancel", b.cancel_deadline_hours)} {b.can_reschedule || b.reschedule_deadline_hours !== null ? dl("Resched", b.reschedule_deadline_hours) : ""}</p>
        </div>
      )}

      {mode === "cancel" && (
        <Card className="mt-6 border-danger/40">
          <p className="mb-4 font-medium">{t("manage.cancelConfirm")}</p>
          <div className="flex gap-3">
            <Button variant="danger" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await bookingApi("cancel", { token }); setMsg({ tone: "success", text: t("manage.cancelled") }); setMode("view"); refresh(); } catch (e) { fail(e); setMode("view"); refresh(); } finally { setBusy(false); }
            }}>{t("manage.cancelYes")}</Button>
            <Button variant="outline" onClick={() => setMode("view")}>{t("manage.cancelKeep")}</Button>
          </div>
        </Card>
      )}

      {mode === "reschedule" && (
        <div className="mt-6">
          <h2 className="mb-3 text-3xl font-bold">{t("manage.rescheduleTitle")}</h2>
          {daysQ.isLoading ? <Spinner /> : (
            <MonthPicker available={daysQ.data ?? new Set()} value={date} minDate={today} maxDate={addDays(today, maxDays)} onChange={(d) => { setDate(d); setSlot(null); }} />
          )}
          {date && (
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slotsQ.data?.slots.map((s) => (
                <button key={s} onClick={() => setSlot(s)} aria-pressed={slot === s}
                  className={cn("h-11 rounded-xl border font-semibold tabular-nums", slot === s ? "border-brand bg-brand text-brand-fg" : "border-line bg-surface hover:border-brand")}>{fmtTime(s, lng, tz)}</button>
              ))}
              {slotsQ.data?.slots.length === 0 && <p className="col-span-full text-muted">{t("book.noSlotsDay")}</p>}
            </div>
          )}
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setMode("view")}>{t("common.back")}</Button>
            <Button disabled={!slot || busy} onClick={async () => {
              setBusy(true);
              try { await bookingApi("reschedule", { token, starts_at: slot }); setMsg({ tone: "success", text: t("manage.rescheduled") }); setMode("view"); setDate(null); setSlot(null); refresh(); }
              catch (e) { fail(e); refresh(); } finally { setBusy(false); }
            }}>{t("manage.rescheduleConfirm")}</Button>
          </div>
        </div>
      )}
      <p className="mt-10 text-center"><Link to="/" className="text-sm text-muted hover:text-fg">← {t("nav.home")}</Link></p>
    </div>
  );
}
