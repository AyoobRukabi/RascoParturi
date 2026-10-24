import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { addDays, fmtYmd, weekdayOf } from "@/lib/time";
import { cn } from "@/lib/utils";

// Month grid. Only dates in `available` are selectable. Weeks start on Monday (Finnish convention).
export function MonthPicker({ available, value, onChange, minDate, maxDate }: {
  available: Set<string>; value: string | null; onChange: (ymd: string) => void; minDate: string; maxDate: string;
}) {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(() => (value ?? [...available].sort()[0] ?? minDate).slice(0, 7));
  const days = useMemo(() => {
    const first = `${month}-01`;
    const lead = (weekdayOf(first) + 6) % 7;
    const [y, m] = month.split("-").map(Number);
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return [...Array<null>(lead).fill(null), ...Array.from({ length: count }, (_, i) => addDays(first, i))];
  }, [month]);
  const shift = (n: number) => { const [y, m] = month.split("-").map(Number); setMonth(new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7)); };
  const short = t("admin.weekdayShort", { returnObjects: true }) as unknown as string[];
  const headers = [1, 2, 3, 4, 5, 6, 0].map((d) => short[d]);
  return (
    <div className="border border-line bg-surface p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="!text-3xl capitalize" aria-live="polite">{fmtYmd(`${month}-01`, i18n.language, { month: "long", year: "numeric" })}</h2>
        <div className="flex gap-1">
          <button type="button" disabled={month <= minDate.slice(0, 7)} onClick={() => shift(-1)} aria-label={t("book.prevMonth")} className="grid size-10 place-items-center border border-line-strong hover:border-fg disabled:opacity-30 disabled:hover:border-line-strong"><ChevronLeft className="size-5" /></button>
          <button type="button" disabled={month >= maxDate.slice(0, 7)} onClick={() => shift(1)} aria-label={t("book.nextMonth")} className="grid size-10 place-items-center border border-line-strong hover:border-fg disabled:opacity-30 disabled:hover:border-line-strong"><ChevronRight className="size-5" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted">{headers.map((h) => <div key={h} className="pb-2">{h}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => d === null ? <div key={`e${i}`} /> : (
          <button key={d} type="button" disabled={!available.has(d)} onClick={() => onChange(d)} aria-pressed={d === value}
            aria-label={fmtYmd(d, i18n.language, { weekday: "long", day: "numeric", month: "long" })}
            className={cn("h-11 font-display text-xl font-semibold tabular-nums transition-colors sm:h-12",
              d === value ? "bg-brand text-brand-fg" : available.has(d) ? "border border-line-strong text-fg hover:border-fg" : "text-line-strong")}>
            {Number(d.slice(8))}
          </button>
        ))}
      </div>
    </div>
  );
}
