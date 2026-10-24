import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { PoleRibbon } from "@/components/Pole";
import { serviceName } from "@/lib/catalog";
import { AppLink } from "@/lib/preview";
import { eur, fmtDate, fmtTime } from "@/lib/time";
import type { Service } from "@/lib/types";

export interface ConfirmationData {
  token: string; startsAt: string; emailSent: boolean; email: string; barber: string; services: Service[]; totalPrice: number; totalMinutes: number; tz: string;
}

/** Final step of the booking flow. In design preview a banner states that nothing was actually booked. */
export function BookingConfirmation({ d, preview, onNew }: { d: ConfirmationData; preview: boolean; onNew: () => void }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rise flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-full bg-success text-bg"><svg viewBox="0 0 24 24" className="draw-check size-7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
        <p className="eyebrow !text-success">{t("book.doneEyebrow")}</p>
      </div>
      <h1 className="t-h2 rise mt-6" style={{ "--d": "80ms" } as React.CSSProperties}>{t("book.doneTitle")}</h1>
      {preview && <Notice tone="warn" className="rise mt-6" style={{ "--d": "120ms" } as React.CSSProperties}><strong>Design preview:</strong> this is a simulated confirmation. No booking was made and no email was sent.</Notice>}

      <div className="rise mt-10 border-y border-line py-8" style={{ "--d": "160ms" } as React.CSSProperties}>
        <p className="font-display text-[clamp(2.2rem,6vw,3.6rem)] font-bold uppercase leading-none">{fmtDate(d.startsAt, lng, d.tz, { weekday: "long", day: "numeric", month: "long" })}</p>
        <p className="t-serif mt-2 text-5xl text-brand-hover">{fmtTime(d.startsAt, lng, d.tz)}</p>
        <dl className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div><dt className="eyebrow !text-muted mb-1">{t("book.viaBarber")}</dt><dd className="text-lg">{d.barber}</dd></div>
          <div><dt className="eyebrow !text-muted mb-1">{t("common.total")}</dt><dd className="text-lg tabular-nums">{eur(d.totalPrice, lng)} · {d.totalMinutes} {t("common.min")}</dd></div>
          <div className="sm:col-span-2"><dt className="eyebrow !text-muted mb-1">{t("book.s1")}</dt><dd className="text-lg">{d.services.map((s) => serviceName(s, lng)).join(" + ")}</dd></div>
        </dl>
      </div>

      <div className="mt-6">{d.emailSent ? <Notice tone="success">{t("book.emailSent")} <strong>{d.email}</strong></Notice> : <Notice tone="warn">{t("book.emailFailed")}</Notice>}</div>
      <p className="mt-4 text-sm text-muted">{t("book.manageHelp")}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild><AppLink to={`/booking/${d.token}`}>{t("book.manageLink")}</AppLink></Button>
        <Button variant="outline" onClick={onNew}>{t("book.newBooking")}</Button>
      </div>
      <PoleRibbon className="mt-14" />
    </div>
  );
}
