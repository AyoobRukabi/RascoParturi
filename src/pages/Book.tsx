import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Clock, User, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, Notice, Spinner } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { MonthPicker } from "@/components/MonthPicker";
import { Query } from "@/components/Query";
import { useCatalog } from "@/hooks/useCatalog";
import { ApiError, bookingApi } from "@/lib/api";
import { serviceName } from "@/lib/catalog";
import { supabase } from "@/lib/supabase";
import { addDays, eur, fmtDate, fmtTime, todayInTz } from "@/lib/time";
import type { Catalog } from "@/lib/types";
import { cn } from "@/lib/utils";

type SlotRow = { slot_start: string; barber_ids: string[] };
const errMsg = (t: (k: string) => string, e: unknown) => {
  const code = e instanceof ApiError ? e.code : "unknown";
  const k = `errors.${code}`;
  const m = t(k);
  return m === k ? t("errors.unknown") : m;
};

export default function Book() {
  const q = useCatalog();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Query q={q}>{(d) => <BookingFlow catalog={d} />}</Query>
    </div>
  );
}

function BookingFlow({ catalog }: { catalog: Catalog }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const qc = useQueryClient();
  const s = catalog.settings;
  const tz = s.timezone;
  const services = useMemo(() => catalog.services.filter((x) => x.bookable_online && x.duration_minutes), [catalog.services]);

  const [step, setStep] = useState(1);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState<string | null>(null); // uuid or "any"
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<{ token: string; startsAt: string; emailSent: boolean; email: string } | null>(null);

  const chosen = services.filter((x) => serviceIds.includes(x.id));
  const totalMin = chosen.reduce((a, x) => a + (x.duration_minutes ?? 0), 0);
  const totalPrice = chosen.reduce((a, x) => a + x.price_cents, 0);
  const candidates = catalog.barbers.filter((b) => serviceIds.every((id) => b.service_ids.includes(id)));
  const barberRpc = barberId === "any" ? null : barberId;

  const today = todayInTz(tz);
  const horizon = Math.min(s.max_days_ahead ?? 30, 62);
  const maxDate = addDays(today, horizon);

  const datesQ = useQuery({
    queryKey: ["dates", barberRpc, serviceIds, today, barberId],
    enabled: step === 3 && barberId !== null,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("available_dates", { p_barber: barberRpc, p_service_ids: serviceIds, p_from: today, p_to: maxDate });
      if (error) throw error;
      return new Set<string>(data as string[]);
    },
  });
  const slotsQ = useQuery({
    queryKey: ["slots", barberRpc, serviceIds, date, barberId],
    enabled: step === 3 && barberId !== null && date !== null,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("available_slots", { p_barber: barberRpc, p_service_ids: serviceIds, p_date: date });
      if (error) throw error;
      return data as SlotRow[];
    },
  });

  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  if (!s.booking_enabled) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <h1 className="text-4xl font-bold">{t("book.unavailableTitle")}</h1>
        <p className="mt-2 text-muted">{t("book.unavailableText")}</p>
        {s.phone && <Button asChild size="lg" className="mt-6"><a href={`tel:${s.phone}`}>{s.phone}</a></Button>}
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-success/15 text-success"><Check className="size-8" /></div>
        <h1 className="text-4xl font-bold">{t("book.doneTitle")}</h1>
        <p className="mt-2 text-muted">{t("book.doneText")}</p>
        <p className="mt-5 text-xl font-semibold capitalize">{fmtDate(done.startsAt, lng, tz)}, {fmtTime(done.startsAt, lng, tz)}</p>
        <div className="mt-5">
          {done.emailSent
            ? <Notice tone="success">{t("book.emailSent")} <strong>{done.email}</strong></Notice>
            : <Notice tone="warn">{t("book.emailFailed")}</Notice>}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild><Link to={`/booking/${done.token}`}>{t("book.manageLink")}</Link></Button>
          <Button variant="outline" onClick={() => { setDone(null); setStep(1); setServiceIds([]); setBarberId(null); setDate(null); setSlot(null); }}>{t("book.newBooking")}</Button>
        </div>
      </Card>
    );
  }

  const multi = s.allow_multi_service === true;
  const toggleService = (id: string) => {
    setBarberId(null); setDate(null); setSlot(null);
    setServiceIds((cur) => (multi ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id]));
  };
  const afterServices = () => {
    if (candidates.length === 1) { setBarberId(candidates[0].id); setStep(3); } else setStep(2);
  };
  const steps = [t("book.s1"), t("book.s2"), t("book.s3"), t("book.s4")];

  const Summary = (
    <Card className="lg:sticky lg:top-24">
      <h2 className="mb-3 text-2xl font-bold">{t("book.summary")}</h2>
      {chosen.length === 0 ? <p className="text-sm text-muted">—</p> : (
        <ul className="space-y-1.5 text-sm">
          {chosen.map((x) => <li key={x.id} className="flex justify-between gap-3"><span>{serviceName(x, lng)}</span><span className="tabular-nums text-muted">{eur(x.price_cents, lng)}</span></li>)}
        </ul>
      )}
      {chosen.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between font-semibold"><span>{t("common.total")}</span><span className="tabular-nums">{eur(totalPrice, lng)}</span></div>
          <div className="flex justify-between text-muted"><span>{t("common.duration")}</span><span>{totalMin} {t("common.min")}</span></div>
        </div>
      )}
      {barberId && <p className="mt-3 flex items-center gap-2 text-sm text-muted"><User className="size-4" />{barberId === "any" ? t("book.anyBarber") : catalog.barbers.find((b) => b.id === barberId)?.name}</p>}
      {slot && <p className="mt-2 flex items-center gap-2 text-sm font-medium capitalize"><Clock className="size-4 text-brand-hover" />{fmtDate(slot.slot_start, lng, tz, { weekday: "short", day: "numeric", month: "numeric" })} · {fmtTime(slot.slot_start, lng, tz)}</p>}
      <p className="mt-4 text-xs text-muted">{t("book.payAtShop")} {t("book.noAccount")}</p>
    </Card>
  );

  return (
    <div>
      <h1 className="pt-2 text-5xl font-bold">{t("book.title")}</h1>
      <ol className="my-6 flex gap-2" aria-label="Progress">
        {steps.map((label, i) => (
          <li key={label} aria-current={step === i + 1 ? "step" : undefined} className={cn("flex-1 border-t-4 pt-2 text-xs font-semibold uppercase tracking-wider sm:text-sm", step >= i + 1 ? "border-brand text-fg" : "border-line text-muted")}>
            <span className="sm:hidden">{i + 1}</span><span className="hidden sm:inline">{i + 1}. {label}</span>
          </li>
        ))}
      </ol>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          {step === 1 && (
            <section>
              <h2 className="mb-1 text-3xl font-bold">{multi ? t("book.chooseServicesMulti") : t("book.chooseOne")}</h2>
              <p className="mb-4 text-sm text-muted">{t("book.onlyBookable")}</p>
              {services.length === 0 ? <Notice>{t("services.empty")}</Notice> : (
                <ul className="space-y-2">
                  {services.map((x) => {
                    const on = serviceIds.includes(x.id);
                    return (
                      <li key={x.id}>
                        <button type="button" onClick={() => toggleService(x.id)} aria-pressed={on}
                          className={cn("flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors", on ? "border-brand bg-brand/10" : "border-line bg-surface hover:border-muted")}>
                          <span className="flex items-center gap-3">
                            <span className={cn("grid size-6 shrink-0 place-items-center border", multi ? "rounded-md" : "rounded-full", on ? "border-brand bg-brand text-brand-fg" : "border-line")}>{on && <Check className="size-4" />}</span>
                            <span><span className="block font-semibold">{serviceName(x, lng)}</span><span className="text-sm text-muted">{x.duration_minutes} {t("common.min")}</span></span>
                          </span>
                          <span className="font-bold tabular-nums text-brand-hover">{eur(x.price_cents, lng)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-6"><Button size="lg" disabled={serviceIds.length === 0} onClick={afterServices} className="w-full sm:w-auto">{t("common.next")}</Button></div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 className="mb-4 text-3xl font-bold">{t("book.chooseBarber")}</h2>
              <ul className="space-y-2">
                {s.allow_any_barber && candidates.length > 1 && (
                  <li><BarberOption selected={barberId === "any"} onClick={() => setBarberId("any")} icon={<Users className="size-5" />} title={t("book.anyBarber")} hint={t("book.anyBarberHint")} /></li>
                )}
                {candidates.map((b) => <li key={b.id}><BarberOption selected={barberId === b.id} onClick={() => setBarberId(b.id)} icon={<User className="size-5" />} title={b.name} /></li>)}
              </ul>
              {candidates.length === 0 && <Notice tone="warn">{t("book.noDates")}</Notice>}
              <div className="mt-6 flex gap-3"><Button variant="outline" onClick={() => setStep(1)}>{t("common.back")}</Button><Button disabled={!barberId} onClick={() => { setDate(null); setSlot(null); setStep(3); }}>{t("common.next")}</Button></div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2 className="mb-4 text-3xl font-bold">{t("book.chooseDate")}</h2>
              {datesQ.isLoading && <div className="py-10"><Spinner /></div>}
              {datesQ.isError && <Notice tone="danger">{t("common.loadError")}</Notice>}
              {datesQ.data && (datesQ.data.size === 0 ? <Notice tone="warn">{t("book.noDates")}</Notice> : (
                <MonthPicker available={datesQ.data} value={date} minDate={today} maxDate={maxDate} onChange={(d) => { setDate(d); setSlot(null); }} />
              ))}
              {date && (
                <div className="mt-6">
                  <h3 className="mb-3 font-sans text-lg font-semibold">{t("book.chooseTime")}</h3>
                  {slotsQ.isLoading && <Spinner />}
                  {slotsQ.data && slotsQ.data.length === 0 && <Notice>{t("book.noSlotsDay")}</Notice>}
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {slotsQ.data?.map((r) => (
                      <button key={r.slot_start} type="button" onClick={() => setSlot(r)} aria-pressed={slot?.slot_start === r.slot_start}
                        className={cn("h-11 rounded-xl border text-base font-semibold tabular-nums transition-colors", slot?.slot_start === r.slot_start ? "border-brand bg-brand text-brand-fg" : "border-line bg-surface hover:border-brand")}>
                        {fmtTime(r.slot_start, lng, tz)}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted">{t("book.timeZoneNote")}</p>
                </div>
              )}
              {formError && <Notice tone="danger" className="mt-4">{formError}</Notice>}
              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={() => setStep(candidates.length === 1 ? 1 : 2)}>{t("common.back")}</Button>
                <Button disabled={!slot} onClick={() => { setFormError(null); setStep(4); }}>{t("common.next")}</Button>
              </div>
            </section>
          )}

          {step === 4 && slot && (
            <DetailsForm onBack={() => setStep(3)} error={formError}
              onSubmit={async (v) => {
                setFormError(null);
                try {
                  const res = await bookingApi<{ manage_token: string; starts_at: string; email_sent: boolean }>("create", {
                    service_ids: serviceIds, barber_id: barberRpc, starts_at: slot.slot_start, locale: lng, name: v.name, phone: v.phone,
                    email: v.email, notes: v.notes || null, website: v.website,
                  });
                  void qc.invalidateQueries({ queryKey: ["slots"] }); void qc.invalidateQueries({ queryKey: ["dates"] });
                  setDone({ token: res.manage_token, startsAt: res.starts_at ?? slot.slot_start, emailSent: res.email_sent, email: v.email });
                } catch (e) {
                  setFormError(e instanceof ApiError && e.code === "slot_unavailable" ? t("book.slotTaken") : errMsg(t, e));
                  if (e instanceof ApiError && e.code === "slot_unavailable") {
                    void qc.invalidateQueries({ queryKey: ["slots"] }); void qc.invalidateQueries({ queryKey: ["dates"] });
                    setSlot(null); setStep(3);
                  }
                }
              }} />
          )}
        </div>
        <aside aria-label={t("book.summary")}>{Summary}</aside>
      </div>
    </div>
  );
}

function BarberOption({ selected, onClick, icon, title, hint }: { selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={cn("flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors", selected ? "border-brand bg-brand/10" : "border-line bg-surface hover:border-muted")}>
      <span className="grid size-11 place-items-center rounded-full bg-surface-2 text-brand-hover">{icon}</span>
      <span><span className="block font-semibold">{title}</span>{hint && <span className="text-sm text-muted">{hint}</span>}</span>
    </button>
  );
}

function DetailsForm({ onSubmit, onBack, error }: {
  onSubmit: (v: { name: string; phone: string; email: string; notes?: string; website?: string }) => Promise<void>; onBack: () => void; error: string | null;
}) {
  const { t } = useTranslation();
  const schema = useMemo(() => z.object({
    name: z.string().trim().min(1, t("validation.name")).max(100),
    phone: z.string().trim().regex(/^[+0-9 ()-]{5,30}$/, t("validation.phone")),
    email: z.string().trim().email(t("validation.email")).max(254),
    notes: z.string().max(500).optional(),
    website: z.string().optional(),
    consent: z.literal(true, { errorMap: () => ({ message: t("validation.consent") }) }),
  }), [t]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v))} noValidate className="space-y-4">
      <h2 className="text-3xl font-bold">{t("book.yourDetails")}</h2>
      <Field label={t("book.name")} error={errors.name?.message} htmlFor="name"><Input id="name" autoComplete="name" {...register("name")} /></Field>
      <Field label={t("book.phone")} error={errors.phone?.message} htmlFor="phone"><Input id="phone" type="tel" autoComplete="tel" inputMode="tel" {...register("phone")} /></Field>
      <Field label={t("book.email")} hint={t("book.emailHint")} error={errors.email?.message} htmlFor="email"><Input id="email" type="email" autoComplete="email" inputMode="email" {...register("email")} /></Field>
      <Field label={t("book.notes")} optional={t("common.optional")} htmlFor="notes"><Textarea id="notes" maxLength={500} {...register("notes")} /></Field>
      {/* Honeypot: invisible to people, tempting to bots */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" {...register("website")} /></label></div>
      <div>
        <Checkbox {...register("consent")} label={<>{t("book.consent")} <Link className="text-brand-hover underline" to="/privacy" target="_blank">{t("book.privacyLink")}</Link></>} />
        {errors.consent && <p role="alert" className="mt-1.5 text-sm text-danger">{errors.consent.message}</p>}
      </div>
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack}>{t("common.back")}</Button>
        <Button type="submit" size="lg" disabled={isSubmitting} className="flex-1 sm:flex-none">{isSubmitting ? t("book.submitting") : t("book.confirmBtn")}</Button>
      </div>
    </form>
  );
}
