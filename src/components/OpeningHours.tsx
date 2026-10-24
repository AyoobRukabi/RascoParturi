import { useTranslation } from "react-i18next";
import { isOpenNow } from "@/lib/catalog";
import { trimTime } from "@/lib/time";
import type { OpeningHour } from "@/lib/types";
import { Badge } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function OpeningHours({ hours, tz }: { hours: OpeningHour[]; tz: string }) {
  const { t } = useTranslation();
  const days = t("days", { returnObjects: true }) as unknown as string[];
  const todayWd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short" }).format(new Date()));
  if (hours.length === 0) return null;
  const open = isOpenNow(hours, tz);
  return (
    <div>
      <div className="mb-3"><Badge tone={open ? "success" : "default"}>{open ? t("home.openNow") : t("home.closedNow")}</Badge></div>
      <ul className="divide-y divide-line/70 text-base">
        {hours.map((h) => (
          <li key={h.weekday} className={cn("flex items-center justify-between py-2.5", h.weekday === todayWd && "font-semibold text-fg")}>
            <span className={h.weekday === todayWd ? "" : "text-muted"}>{days[h.weekday]}</span>
            <span className="tabular-nums">{h.open && h.close ? `${trimTime(h.open)} – ${trimTime(h.close)}` : t("home.closedDay")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
