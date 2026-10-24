import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MonthPicker } from "@/components/MonthPicker";
import { PoleRibbon } from "@/components/Pole";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice, Skeleton } from "@/components/ui/card";
import { useCatalog } from "@/hooks/useCatalog";
import { ApiError } from "@/lib/api";
import { useManageBackend } from "@/lib/backend";
import { AppLink } from "@/lib/preview";
import { addDays, eur, fmtDate, fmtTime, todayInTz } from "@/lib/time";
import { cn } from "@/lib/utils";

// Customer self-service: the secret token in the URL is the only credential (no account).
export default function Manage() {
  const { token = "" } = useParams();
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const qc = useQueryClient();
  const be = useManageBackend();
  const catalog = useCatalog().data;
  const phone = catalog?.settings.phone;
  const [mode, setMode] = useState<"view" | "cancel" | "reschedule">("view");
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["booking", be.isPreview, token], retry: false, queryFn: () => be.get(token) });
  const b = q.data;
  const tz = b?.timezone ?? "Europe/Helsinki";
  const today = todayInTz(tz);
  const maxDate = addDays(today, Math.min(catalog?.settings.max_days_ahead ?? 30, 62));
  const daysQ = useQuery({ queryKey: ["resched-days", be.isPreview, token], enabled: mode === "reschedule" && !!b, staleTime: 30_000, queryFn: async () => new Set(await be.dates(token, today, maxDate)) });
  const slotsQ = useQuery({ queryKey: ["resched-slots", be.isPreview, token, date], enabled: mode === "reschedule" && !!date, queryFn: () => be.slots(token, date!) });

  const fail = (e: unknown) => { const k = `errors.${e instanceof ApiError ? e.code : "unknown"}`; setMsg({ tone: "danger", text: t(k) === k ? t("errors.unknown") : t(k) }); };
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["booking"] }); void qc.invalidateQueries({ queryKey: ["resched-days"] }); };

  if (q.isLoading) return <div className="container-x max-w-2xl py-20"><Skeleton className="mb-6 h-14 w-2/3" /><Skeleton className="h-64" /></div>;
  if (q.isError || !b) return (
    <div className="container-x max-w-2xl py-20"><EmptyState title={t("manage.notFoundTitle")} text={t("manage.notFound")} action={phone ? <Button asChild><a href={`tel:${phone}`}><Phone className="size-4" />{phone}</a></Button> : undefined} /></div>
  );

  const tone = b.status === "confirmed" ? "text-success" : b.status === "completed" ? "text-brand-hover" : "text-danger";
  const dl = (kind: "Cancel" | "Resched", h: number | null) => (h === null ? "" : h === 0 ? t(`manage.deadline${kind}Zero`) : t(`manage.deadline${kind}`, { h }));

  return (
    <div className="container-x max-w-2xl pb-24 pt-14">
      <p className="eyebrow rise mb-4">{t("manage.eyebrow")}</p>
      <h1 className="t-h2 rise mb-8" style={{ "--d": "60ms" } as React.CSSProperties}>{t("manage.title")}</h1>
      {be.isPreview && <Notice tone="warn" className="mb-6">Design preview: actions on this page are simulated. Nothing is changed and no email is sent.</Notice>}
      {msg && <Notice tone={msg.tone} className="mb-6">{msg.text}</Notice>}

      <div className="border-y border-line py-8">
        <p className={cn("eyebrow mb-4", tone)}>● {t(`manage.status.${b.status}`)}</p>
        <p className={cn("font-display text-[clamp(2.2rem,7vw,3.8rem)] font-bold uppercase leading-none", b.status === "cancelled" && "text-muted line-through")}>{fmtDate(b.starts_at, lng, tz, { weekday: "long", day: "numeric", month: "long" })}</p>
        <p className="t-serif mt-2 text-5xl text-brand-hover">{fmtTime(b.starts_at, lng, tz)}</p>
        <dl className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div><dt className="eyebrow !text-muted mb-1">{t("manage.barber")}</dt><dd className="text-lg">{b.barber}</dd></div>
          <div><dt className="eyebrow !text-muted mb-1">{t("manage.total")}</dt><dd className="text-lg tabular-nums">{eur(b.total_price_cents, lng)} · {b.total_duration_minutes} {t("common.min")}</dd></div>
          <div className="sm:col-span-2"><dt className="eyebrow !text-muted mb-1">{t("manage.services")}</dt>
            <dd><ul>{b.services.map((s, i) => <li key={i} className="flex justify-between gap-4 py-0.5 text-lg"><span>{lng === "en" && s.name_en ? s.name_en : s.name_fi}</span><span className="tabular-nums text-muted">{eur(s.price_cents, lng)}</span></li>)}</ul></dd></div>
        </dl>
      </div>

      {b.status === "confirmed" && mode === "view" && (
        <div className="mt-8 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" disabled={!b.can_reschedule} onClick={() => { setMsg(null); setMode("reschedule"); }}>{t("manage.rescheduleBtn")}</Button>
            <Button size="lg" variant="danger" disabled={!b.can_cancel} onClick={() => { setMsg(null); setMode("cancel"); }}>{t("manage.cancelBtn")}</Button>
          </div>
          {(!b.can_cancel || !b.can_reschedule) && (
            <Notice tone="warn">{!b.can_cancel ? t("manage.cantCancel") : t("manage.cantReschedule")} {t("manage.contactUs")} {phone && <a className="font-semibold underline" href={`tel:${phone}`}>{phone}</a>}</Notice>
          )}
          <p className="text-sm text-muted">{dl("Cancel", b.cancel_deadline_hours)} {b.reschedule_deadline_hours !== null ? dl("Resched", b.reschedule_deadline_hours) : ""}</p>
        </div>
      )}

      {mode === "cancel" && (
        <div className="mt-8 border border-danger/50 p-6">
          <p className="mb-5 text-lg font-semibold">{t("manage.cancelConfirm")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="danger" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await be.cancel(token); setMsg({ tone: "success", text: t("manage.cancelled") }); } catch (e) { fail(e); } finally { setBusy(false); setMode("view"); refresh(); }
            }}>{busy ? t("manage.working") : t("manage.cancelYes")}</Button>
            <Button variant="outline" disabled={busy} onClick={() => setMode("view")}>{t("manage.cancelKeep")}</Button>
          </div>
        </div>
      )}

      {mode === "reschedule" && (
        <div className="mt-10">
          <h2 className="t-h2 mb-6 !text-[clamp(2rem,5vw,3rem)]">{t("manage.rescheduleTitle")}</h2>
          {daysQ.isLoading ? <Skeleton className="h-80" /> : daysQ.data && daysQ.data.size === 0
            ? <EmptyState title={t("book.noDatesTitle")} text={t("book.noDates")} />
            : <MonthPicker available={daysQ.data ?? new Set()} value={date} minDate={today} maxDate={maxDate} onChange={(d) => { setDate(d); setSlot(null); }} />}
          {date && (
            <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-busy={slotsQ.isLoading}>
              {slotsQ.isLoading && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12" />)}
              {slotsQ.data?.map((s) => (
                <button key={s} role="radio" aria-checked={slot === s} onClick={() => setSlot(s)} className={cn("h-12 border font-display text-xl font-semibold tabular-nums transition-colors", slot === s ? "border-brand bg-brand text-brand-fg" : "border-line-strong hover:border-fg")}>{fmtTime(s, lng, tz)}</button>
              ))}
              {slotsQ.data?.length === 0 && <p className="col-span-full text-muted">{t("book.noSlotsDay")}</p>}
            </div>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" size="lg" onClick={() => setMode("view")}>{t("common.back")}</Button>
            <Button size="lg" disabled={!slot || busy} onClick={async () => {
              setBusy(true);
              try { await be.reschedule(token, slot!); setMsg({ tone: "success", text: t("manage.rescheduled") }); setMode("view"); setDate(null); setSlot(null); refresh(); }
              catch (e) { fail(e); refresh(); } finally { setBusy(false); }
            }}>{busy ? t("manage.working") : t("manage.rescheduleConfirm")}</Button>
          </div>
        </div>
      )}
      <PoleRibbon className="mt-16" />
      <p className="mt-6"><AppLink to="/" className="text-sm text-muted hover:text-fg">← {t("nav.home")}</AppLink></p>
    </div>
  );
}
