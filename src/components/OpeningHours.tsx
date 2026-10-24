import { useTranslation } from "react-i18next";
import { isOpenNow } from "@/lib/catalog";
import { trimTime } from "@/lib/time";
import type { OpeningHour } from "@/lib/types";
import { cn } from "@/lib/utils";

const ORDER = [1, 2, 3, 4, 5, 6, 0];
const range = (h?: OpeningHour) => (h?.open && h.close ? `${trimTime(h.open)} – ${trimTime(h.close)}` : null);

export function OpeningHours({ hours, tz, compact = false }: { hours: OpeningHour[]; tz: string; compact?: boolean }) {
  const { t } = useTranslation();
  const days = t("days", { returnObjects: true }) as unknown as string[];
  const todayWd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short" }).format(new Date()));
  if (hours.length === 0) return null;
  const by = (wd: number) => hours.find((h) => h.weekday === wd);

  if (compact) {
    // Group consecutive days with identical hours: "Maanantai – Lauantai  10:00 – 19:00"
    const groups: { from: number; to: number; r: string | null }[] = [];
    for (const wd of ORDER) {
      const r = range(by(wd)); const last = groups[groups.length - 1];
      if (last && last.r === r) last.to = wd; else groups.push({ from: wd, to: wd, r });
    }
    return (
      <ul className="space-y-2">
        {groups.map((g) => (
          <li key={g.from} className="flex flex-wrap justify-between gap-x-6 text-lg">
            <span className="text-muted">{g.from === g.to ? days[g.from] : `${days[g.from]} – ${days[g.to]}`}</span>
            <span className="tabular-nums">{g.r ?? t("home.closedDay")}</span>
          </li>
        ))}
      </ul>
    );
  }

  const open = isOpenNow(hours, tz);
  return (
    <div>
      <p className="mb-4 flex items-center gap-2.5 font-display text-lg font-semibold uppercase tracking-[0.16em]">
        <span aria-hidden className={cn("size-2.5 rounded-full", open ? "bg-success" : "bg-line-strong")} />
        <span className={open ? "text-success" : "text-muted"}>{open ? t("home.openNow") : t("home.closedNow")}</span>
      </p>
      <ul className="border-t border-line">
        {ORDER.map((wd) => (
          <li key={wd} className={cn("flex items-baseline justify-between border-b border-line py-3.5 text-lg", wd === todayWd ? "text-fg" : "text-muted")}>
            <span className="flex items-center gap-3">{days[wd]}{wd === todayWd && <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-brand-hover">{t("home.today")}</span>}</span>
            <span className="tabular-nums">{range(by(wd)) ?? t("home.closedDay")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
