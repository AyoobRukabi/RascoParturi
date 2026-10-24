import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BookingConfirmation, type ConfirmationData } from "@/components/BookingConfirmation";
import { MonthPicker } from "@/components/MonthPicker";
import { Query } from "@/components/Query";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice, Skeleton } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { useCatalog } from "@/hooks/useCatalog";
import { ApiError } from "@/lib/api";
import { useBookingBackend, type SlotRow } from "@/lib/backend";
import { serviceName } from "@/lib/catalog";
import { AppLink } from "@/lib/preview";
import { addDays, eur, fmtDate, fmtTime, fmtYmd, todayInTz } from "@/lib/time";
import type { Catalog } from "@/lib/types";
import { cn } from "@/lib/utils";

const errMsg = (t: (k: string) => string, e: unknown) => {
  const k = `errors.${e instanceof ApiError ? e.code : "unknown"}`;
  return t(k) === k ? t("errors.unknown") : t(k);
};
interface Details { name: string; phone: string; email: string; notes?: string; website?: string }

export default function Book() {
  const q = useCatalog();
  return <div className="container-x pb-28 pt-10 lg:pb-24 lg:pt-14"><Query q={q} skeleton={<Skeleton className="h-96" />}>{(d) => <BookingFlow catalog={d} />}</Query></div>;
}

function BookingFlow({ catalog }: { catalog: Catalog }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const backend = useBookingBackend();
  const [sp] = useSearchParams();
  const demoState = sp.get("state") ?? "";
  const qc = useQueryClient();
  const s = catalog.settings;
  const tz = s.timezone;
  const services = useMemo(() => catalog.services.filter((x) => x.bookable_online && x.duration_minutes), [catalog.services]);
  const phoneOnly = catalog.services.filter((x) => !x.bookable_online);

  const [step, setStep] = useState(1);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState<string | null>(null); // uuid or "any"
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotRow | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ConfirmationData | null>(null);

  const chosen = services.filter((x) => serviceIds.includes(x.id));
  const totalMin = chosen.reduce((a, x) => a + (x.duration_minutes ?? 0), 0);
  const totalPrice = chosen.reduce((a, x) => a + x.price_cents, 0);
  const candidates = catalog.barbers.filter((b) => serviceIds.every((id) => b.service_ids.includes(id)));
  const barberRpc = barberId === "any" ? null : barberId;
  const barberName = barberId === "any" ? t("book.anyBarber") : catalog.barbers.find((b) => b.id === barberId)?.name ?? "";
  const multi = s.allow_multi_service === true;
  const today = todayInTz(tz);
  const maxDate = addDays(today, Math.min(s.max_days_ahead ?? 30, 62));
  const barberStepSkipped = candidates.length <= 1;

  const datesQ = useQuery({
    queryKey: ["dates", backend.isPreview, demoState, barberId, serviceIds, today], enabled: step === 3 && barberId !== null,
    queryFn: async () => new Set(await backend.fetchDates(barberRpc, serviceIds, today, maxDate)),
  });
  const slotsQ = useQuery({
    queryKey: ["slots", backend.isPreview, demoState, barberId, serviceIds, date], enabled: step === 3 && barberId !== null && date !== null,
    queryFn: () => backend.fetchSlots(barberRpc, serviceIds, date!),
  });
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const reset = () => { setDone(null); setStep(1); setServiceIds([]); setBarberId(null); setDate(null); setSlot(null); setDetails(null); setError(null); };
  const toggleService = (id: string) => {
    setBarberId(null); setDate(null); setSlot(null); setError(null);
    setServiceIds((cur) => (multi ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id]));
  };
  const goFromServices = () => { if (candidates.length === 1) setBarberId(candidates[0].id); else if (candidates.length === 0) return; setStep(candidates.length === 1 ? 3 : 2); };

  if (!s.booking_enabled) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <p className="eyebrow mb-4">{t("book.title")}</p>
        <h1 className="t-h2">{t("book.unavailableTitle")}</h1>
        <p className="t-lead mt-4">{t("book.unavailableText")}</p>
        {s.phone && <Button asChild size="lg" className="mt-8"><a href={`tel:${s.phone}`}>{s.phone}</a></Button>}
      </div>
    );
  }
  if (done) return <BookingConfirmation d={done} preview={backend.isPreview} onNew={reset} />;

  const submit = async () => {
    if (!slot || !details) return;
    setSubmitting(true); setError(null);
    try {
      const res = await backend.create({ service_ids: serviceIds, barber_id: barberRpc, starts_at: slot.slot_start, locale: lng, name: details.name, phone: details.phone, email: details.email, notes: details.notes || null, website: details.website });
      void qc.invalidateQueries({ queryKey: ["slots"] }); void qc.invalidateQueries({ queryKey: ["dates"] });
      setDone({ token: res.manage_token, startsAt: res.starts_at ?? slot.slot_start, emailSent: res.email_sent, email: details.email, barber: barberName, services: chosen, totalPrice, totalMinutes: totalMin, tz });
    } catch (e) {
      if (e instanceof ApiError && e.code === "slot_unavailable") {
        void qc.invalidateQueries({ queryKey: ["slots"] }); void qc.invalidateQueries({ queryKey: ["dates"] });
        setSlot(null); setStep(3); setError(t("book.slotTaken"));
      } else setError(errMsg(t, e));
    } finally { setSubmitting(false); }
  };

  const steps = [t("book.s1"), t("book.s2"), t("book.s3"), t("book.s4"), t("book.s5")];
  const back = () => setStep(step === 3 && barberStepSkipped ? 1 : step - 1);
  const canNext = step === 1 ? serviceIds.length > 0 && candidates.length > 0 : step === 2 ? barberId !== null : step === 3 ? slot !== null : true;

  /* sticky action bar: pinned on mobile, inline on desktop */
  const Footer = (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 p-3 backdrop-blur lg:static lg:mt-12 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
      <div className="container-x flex items-center gap-3 !px-0 lg:!px-0">
        {step > 1 && <Button variant="outline" size="lg" onClick={back} aria-label={t("common.back")} className="!px-4"><ArrowLeft className="size-5" /><span className="hidden sm:inline">{t("common.back")}</span></Button>}
        {chosen.length > 0 && step < 5 && <div className="mr-auto min-w-0 lg:hidden"><p className="font-display text-2xl font-semibold leading-none tabular-nums">{eur(totalPrice, lng)}</p><p className="text-xs text-muted">{totalMin} {t("common.min")}</p></div>}
        {step < 4 && <Button size="lg" disabled={!canNext} onClick={step === 1 ? goFromServices : () => setStep(step + 1)} className="ml-auto flex-1 sm:flex-none lg:ml-0">{t("common.next")} <ArrowRight className="size-5" /></Button>}
        {step === 4 && <Button size="lg" form="details-form" type="submit" className="ml-auto flex-1 sm:flex-none lg:ml-0">{t("book.reviewBtn")} <ArrowRight className="size-5" /></Button>}
        {step === 5 && <Button size="lg" disabled={submitting} onClick={submit} className="ml-auto flex-1 sm:flex-none lg:ml-0">{submitting ? <><span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{t("book.submitting")}</> : <>{t("book.confirmBtn")} <Check className="size-5" /></>}</Button>}
      </div>
    </div>
  );

  return (
    <div>
      <p className="eyebrow rise mb-3">{t("book.title")}</p>
      <nav aria-label="Progress" className="mb-10"><ol className="flex gap-1.5 sm:gap-3">
        {steps.map((label, i) => {
          const n = i + 1; const skipped = n === 2 && barberStepSkipped && step > 2;
          return (
            <li key={label} aria-current={step === n ? "step" : undefined} className={cn("flex-1", skipped && "opacity-40")}>
              <div className={cn("h-[3px] transition-colors", step >= n ? "bg-brand" : "bg-line-strong")} />
              <p className={cn("mt-2 font-display text-[0.8rem] font-semibold uppercase tracking-[0.14em] sm:text-sm", step === n ? "text-fg" : "text-muted")}><span className="sm:hidden">{step === n ? label : n}</span><span className="hidden sm:inline">{n}. {label}</span></p>
            </li>
          );
        })}
      </ol></nav>

      <div className="grid gap-12 lg:grid-cols-[1fr_21rem] lg:gap-16">
        <div className="min-w-0">
        <div key={step} className="rise">
          {error && step !== 5 && <Notice tone="danger" className="mb-6">{error}</Notice>}

          {step === 1 && (<section aria-labelledby="s1">
            <h1 id="s1" className="t-h2 mb-2">{multi ? t("book.chooseServicesMulti") : t("book.chooseOne")}</h1>
            <p className="mb-8 text-muted">{multi ? t("book.multiHint") : ""}</p>
            {services.length === 0 ? <EmptyState title={t("book.noServicesTitle")} text={t("book.noServicesText")} action={s.phone ? <Button asChild><a href={`tel:${s.phone}`}>{s.phone}</a></Button> : undefined} /> : (
              <ul className="border-t border-line" role={multi ? "group" : "radiogroup"}>
                {services.map((x) => { const on = serviceIds.includes(x.id); return (
                  <li key={x.id} className="border-b border-line">
                    <button type="button" role={multi ? "checkbox" : "radio"} aria-checked={on} onClick={() => toggleService(x.id)}
                      className={cn("relative flex w-full items-center gap-4 py-5 pl-4 pr-2 text-left transition-colors hover:bg-surface", on && "bg-surface")}>
                      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px] transition-colors", on ? "bg-brand" : "bg-transparent")} />
                      <span aria-hidden className={cn("grid size-6 shrink-0 place-items-center border-2 transition-colors", multi ? "rounded-sm" : "rounded-full", on ? "border-brand bg-brand text-brand-fg" : "border-line-strong")}>{on && <Check className="size-4" strokeWidth={3} />}</span>
                      <span className="min-w-0 flex-1"><span className="block text-lg font-semibold leading-snug sm:text-xl">{serviceName(x, lng)}</span><span className="text-sm text-muted">{x.duration_minutes} {t("common.min")}</span></span>
                      <span className="font-display text-3xl font-semibold tabular-nums">{eur(x.price_cents, lng)}</span>
                    </button>
                  </li>); })}
              </ul>
            )}
            {phoneOnly.length > 0 && services.length > 0 && s.phone && <p className="mt-6 text-sm text-muted">{t("book.onlyBookable")} <a className="font-semibold text-fg underline-offset-4 hover:underline" href={`tel:${s.phone}`}>{s.phone}</a></p>}
            {serviceIds.length > 0 && candidates.length === 0 && <Notice tone="warn" className="mt-6">{t("book.noBarberForCombo")}</Notice>}
          </section>)}

          {step === 2 && (<section aria-labelledby="s2">
            <h1 id="s2" className="t-h2 mb-8">{t("book.chooseBarber")}</h1>
            <ul className="border-t border-line" role="radiogroup">
              {s.allow_any_barber && candidates.length > 1 && <li><BarberRow selected={barberId === "any"} onClick={() => setBarberId("any")} index="∗" title={t("book.anyBarber")} hint={t("book.anyBarberHint")} icon /></li>}
              {candidates.map((b, i) => <li key={b.id}><BarberRow selected={barberId === b.id} onClick={() => setBarberId(b.id)} index={`0${i + 1}`} title={b.name} /></li>)}
            </ul>
          </section>)}

          {step === 3 && (<section aria-labelledby="s3">
            <h1 id="s3" className="t-h2 mb-8">{t("book.chooseDate")}</h1>
            {datesQ.isLoading && <div className="space-y-3" aria-busy><Skeleton className="h-8 w-48" /><Skeleton className="h-80" /></div>}
            {datesQ.isError && <Notice tone="danger">{t("common.loadError")} <button className="underline" onClick={() => void datesQ.refetch()}>{t("common.retry")}</button></Notice>}
            {datesQ.data && datesQ.data.size === 0 && <EmptyState title={t("book.noDatesTitle")} text={t("book.noDates")} action={<div className="flex flex-wrap justify-center gap-3">{!barberStepSkipped && <Button variant="outline" onClick={() => setStep(2)}>{t("book.changeBarber")}</Button>}{s.phone && <Button asChild><a href={`tel:${s.phone}`}>{s.phone}</a></Button>}</div>} />}
            {datesQ.data && datesQ.data.size > 0 && (<>
              {!date && <button className="mb-4 font-display text-[1.05rem] font-semibold uppercase tracking-[0.12em] text-brand-hover hover:text-fg" onClick={() => { setDate([...datesQ.data].sort()[0]); setSlot(null); }}>{t("book.earliest")}: {fmtYmd([...datesQ.data].sort()[0], lng, { weekday: "short", day: "numeric", month: "numeric" })} →</button>}
              <MonthPicker available={datesQ.data} value={date} minDate={today} maxDate={maxDate} onChange={(d) => { setDate(d); setSlot(null); setError(null); }} />
              {date && <TimePicker date={date} tz={tz} q={slotsQ} value={slot} onChange={setSlot} />}
            </>)}
          </section>)}

          {step === 4 && (<section aria-labelledby="s4">
            <h1 id="s4" className="t-h2 mb-8">{t("book.yourDetails")}</h1>
            <DetailsForm initial={details} onSubmit={(v) => { setDetails(v); setStep(5); }} />
          </section>)}

          {step === 5 && slot && details && (<section aria-labelledby="s5">
            <h1 id="s5" className="t-h2 mb-8">{t("book.reviewTitle")}</h1>
            {error && <Notice tone="danger" className="mb-6">{error}</Notice>}
            <dl className="border-t border-line">
              <ReviewRow label={t("book.s1")} onEdit={() => setStep(1)}>{chosen.map((x) => <span key={x.id} className="flex justify-between gap-4"><span>{serviceName(x, lng)}</span><span className="tabular-nums text-muted">{eur(x.price_cents, lng)}</span></span>)}</ReviewRow>
              <ReviewRow label={t("book.s2")} onEdit={barberStepSkipped ? undefined : () => setStep(2)}>{barberName}</ReviewRow>
              <ReviewRow label={t("book.s3")} onEdit={() => setStep(3)}><span className="capitalize">{fmtDate(slot.slot_start, lng, tz, { weekday: "long", day: "numeric", month: "long" })}</span>, {fmtTime(slot.slot_start, lng, tz)}</ReviewRow>
              <ReviewRow label={t("book.s4")} onEdit={() => setStep(4)}>{details.name}<br />{details.phone}<br /><span className="break-all">{details.email}</span>{details.notes && <><br /><span className="text-muted">{details.notes}</span></>}</ReviewRow>
            </dl>
            <p className="mt-6 text-sm text-muted">{t("book.confirmNote")}</p>
            {backend.isPreview && <Notice tone="warn" className="mt-4">Design preview: confirming simulates a booking. Nothing is saved or sent.</Notice>}
          </section>)}

        </div>
          {Footer}
        </div>

        <aside className="hidden lg:block" aria-label={t("book.summary")}>
          <div className="sticky top-32 border border-line bg-surface p-6">
            <h2 className="mb-4 text-3xl">{t("book.summary")}</h2>
            {chosen.length === 0 ? <p className="text-muted">{t("book.summaryEmpty")}</p> : (<>
              <ul className="space-y-2">{chosen.map((x) => <li key={x.id} className="flex justify-between gap-3"><span>{serviceName(x, lng)}</span><span className="tabular-nums text-muted">{eur(x.price_cents, lng)}</span></li>)}</ul>
              <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4"><span className="eyebrow !text-muted">{t("common.total")}</span><span className="font-display text-4xl font-semibold tabular-nums">{eur(totalPrice, lng)}</span></div>
              <p className="text-right text-sm text-muted">{totalMin} {t("common.min")}</p>
            </>)}
            {barberId && <p className="mt-5 flex items-center gap-2 text-sm"><Users className="size-4 text-brand-hover" />{barberName}</p>}
            {slot && <p className="mt-2 text-sm capitalize"><span className="text-brand-hover">●</span> {fmtDate(slot.slot_start, lng, tz, { weekday: "short", day: "numeric", month: "numeric" })} · {fmtTime(slot.slot_start, lng, tz)}</p>}
            <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{t("book.noPayment")} {t("book.noAccount")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BarberRow({ selected, onClick, index, title, hint, icon }: { selected: boolean; onClick: () => void; index: string; title: string; hint?: string; icon?: boolean }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick} className={cn("relative flex w-full items-center gap-5 border-b border-line py-6 pl-4 pr-2 text-left transition-colors hover:bg-surface", selected && "bg-surface")}>
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px]", selected ? "bg-brand" : "bg-transparent")} />
      <span className="w-8 font-display text-xl font-semibold text-muted">{icon ? <Users className="size-5" /> : index}</span>
      <span className="flex-1"><span className="block font-display text-3xl font-bold uppercase leading-none">{title}</span>{hint && <span className="mt-1 block text-sm text-muted">{hint}</span>}</span>
      <span aria-hidden className={cn("grid size-6 place-items-center rounded-full border-2", selected ? "border-brand bg-brand text-brand-fg" : "border-line-strong")}>{selected && <Check className="size-4" strokeWidth={3} />}</span>
    </button>
  );
}

function TimePicker({ date, tz, q, value, onChange }: { date: string; tz: string; q: { isLoading: boolean; isError: boolean; data?: SlotRow[]; refetch: () => unknown }; value: SlotRow | null; onChange: (s: SlotRow) => void }) {
  const { t, i18n } = useTranslation();
  const hourOf = (iso: string) => Number(fmtTime(iso, "en", tz).slice(0, 2));
  const groups = [["morning", 0, 12], ["afternoon", 12, 17], ["evening", 17, 24]] as const;
  return (
    <div className="mt-10" aria-live="polite">
      <h2 className="mb-5 !text-3xl capitalize">{fmtYmd(date, i18n.language, { weekday: "long", day: "numeric", month: "long" })}</h2>
      {q.isLoading && <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-busy>{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>}
      {q.isError && <Notice tone="danger">{t("common.loadError")} <button className="underline" onClick={() => void q.refetch()}>{t("common.retry")}</button></Notice>}
      {q.data && q.data.length === 0 && <EmptyState title={t("book.noSlotsDay")} text={t("book.noSlotsHint")} />}
      {q.data && groups.map(([key, from, to]) => { const list = q.data!.filter((r) => hourOf(r.slot_start) >= from && hourOf(r.slot_start) < to); return list.length === 0 ? null : (
        <div key={key} className="mb-6"><p className="eyebrow !text-muted mb-3">{t(`book.${key}`)}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label={t(`book.${key}`)}>
            {list.map((r) => { const on = value?.slot_start === r.slot_start; return (
              <button key={r.slot_start} type="button" role="radio" aria-checked={on} onClick={() => onChange(r)}
                className={cn("h-12 border font-display text-xl font-semibold tabular-nums tracking-wide transition-colors", on ? "border-brand bg-brand text-brand-fg" : "border-line-strong hover:border-fg")}>{fmtTime(r.slot_start, i18n.language, tz)}</button>); })}
          </div></div>); })}
      <p className="mt-2 text-xs text-muted">{t("book.timeZoneNote")}</p>
    </div>
  );
}

function ReviewRow({ label, onEdit, children }: { label: string; onEdit?: () => void; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-[6.5rem_1fr_auto] gap-x-4 border-b border-line py-5 sm:grid-cols-[9rem_1fr_auto]">
      <dt className="eyebrow !text-muted pt-1">{label}</dt><dd className="min-w-0 space-y-1 text-lg">{children}</dd>
      {onEdit ? <button onClick={onEdit} className="self-start font-display text-sm font-semibold uppercase tracking-[0.14em] text-brand-hover hover:text-fg">{t("common.edit")}</button> : <span />}
    </div>
  );
}

function DetailsForm({ initial, onSubmit }: { initial: Details | null; onSubmit: (v: Details) => void }) {
  const { t } = useTranslation();
  const schema = useMemo(() => z.object({
    name: z.string().trim().min(1, t("validation.name")).max(100),
    phone: z.string().trim().regex(/^[+0-9 ()-]{5,30}$/, t("validation.phone")),
    email: z.string().trim().min(1, t("validation.emailRequired")).email(t("validation.email")).max(254),
    notes: z.string().max(500).optional(), website: z.string().optional(),
    consent: z.literal(true, { errorMap: () => ({ message: t("validation.consent") }) }),
  }), [t]);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: initial ? { ...initial, consent: true as const } : undefined });
  return (
    <form id="details-form" onSubmit={handleSubmit((v) => onSubmit(v))} noValidate className="max-w-xl space-y-6">
      <Field label={t("book.name")} error={errors.name?.message} htmlFor="name"><Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} /></Field>
      <Field label={t("book.phone")} error={errors.phone?.message} htmlFor="phone"><Input id="phone" type="tel" autoComplete="tel" inputMode="tel" aria-invalid={!!errors.phone} {...register("phone")} /></Field>
      <Field label={t("book.email")} hint={t("book.emailHint")} error={errors.email?.message} htmlFor="email"><Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...register("email")} /></Field>
      <Field label={t("book.notes")} optional={t("common.optional")} htmlFor="notes"><Textarea id="notes" maxLength={500} {...register("notes")} /></Field>
      {/* Honeypot: invisible to people, tempting to bots */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" {...register("website")} /></label></div>
      <div>
        <Checkbox {...register("consent")} label={<>{t("book.consent")} <AppLink className="text-brand-hover underline underline-offset-4" to="/privacy" target="_blank">{t("book.privacyLink")}</AppLink></>} />
        {errors.consent && <p role="alert" className="mt-2 text-sm text-danger">{errors.consent.message}</p>}
      </div>
    </form>
  );
}
