import { useTranslation } from "react-i18next";
import { serviceDesc, serviceName } from "@/lib/catalog";
import { eur } from "@/lib/time";
import type { Service } from "@/lib/types";

export function ServiceList({ services, limit }: { services: Service[]; limit?: number }) {
  const { t, i18n } = useTranslation();
  const list = limit ? services.slice(0, limit) : services;
  if (list.length === 0) return <p className="text-muted">{t("services.empty")}</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {list.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4">
          <div className="min-w-0">
            <h3 className="font-sans text-lg font-semibold leading-snug">{serviceName(s, i18n.language)}</h3>
            {serviceDesc(s, i18n.language) && <p className="mt-0.5 text-sm text-muted">{serviceDesc(s, i18n.language)}</p>}
            {s.duration_minutes && <p className="mt-0.5 text-sm text-muted">{s.duration_minutes} {t("common.min")}</p>}
          </div>
          <span className="shrink-0 rounded-full bg-brand/15 px-3.5 py-1.5 text-lg font-bold text-brand-hover tabular-nums">{eur(s.price_cents, i18n.language)}</span>
        </li>
      ))}
    </ul>
  );
}
