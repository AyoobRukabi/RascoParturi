import { useTranslation } from "react-i18next";
import { serviceDesc, serviceName } from "@/lib/catalog";
import { eur } from "@/lib/time";
import type { Service } from "@/lib/types";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { Reveal } from "@/components/Reveal";

/** Typographic price list with dotted leaders — reads like a barber's board, not a grid of cards. */
export function ServiceList({ services, limit, showDuration = true, flagPhoneOnly = false }: { services: Service[]; limit?: number; showDuration?: boolean; flagPhoneOnly?: boolean }) {
  const { t, i18n } = useTranslation();
  const list = limit ? services.slice(0, limit) : services;
  if (list.length === 0) return <EmptyState title={t("services.empty")} text={t("services.emptyText")} />;
  return (
    <ul className="border-t border-line">
      {list.map((s, i) => (
        <li key={s.id} className="border-b border-line">
          <Reveal delay={Math.min(i, 6) * 40} className="py-5">
            <div className="price-row">
              <h3 className="font-sans text-xl font-semibold normal-case leading-snug tracking-normal sm:text-2xl">{serviceName(s, i18n.language)}</h3>
              <span aria-hidden className="leader" />
              <span className="font-display text-3xl font-semibold tabular-nums tracking-wide text-fg sm:text-4xl">{eur(s.price_cents, i18n.language)}</span>
            </div>
            {flagPhoneOnly && !s.bookable_online && <p className="mt-1 font-display text-sm font-semibold uppercase tracking-[0.16em] text-brand-hover">{t("services.phoneOnly")}</p>}
            {(serviceDesc(s, i18n.language) || (showDuration && s.duration_minutes)) && (
              <p className="mt-1 text-muted">{serviceDesc(s, i18n.language)}{serviceDesc(s, i18n.language) && showDuration && s.duration_minutes ? " · " : ""}{showDuration && s.duration_minutes ? `${s.duration_minutes} ${t("common.min")}` : ""}</p>
            )}
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

export function ServiceListSkeleton({ rows = 5 }: { rows?: number }) {
  return <div className="border-t border-line">{Array.from({ length: rows }, (_, i) => <div key={i} className="flex items-center justify-between border-b border-line py-6"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-8 w-16" /></div>)}</div>;
}
