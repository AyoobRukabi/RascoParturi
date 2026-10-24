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
  const [month, setMonth] = useState(() => (value ?? minDate).slice(0, 7));
  const days = useMemo(() => {
    const first = `${month}-01`;
    const lead = (weekdayOf(first) + 6) % 7;
    const [y, m] = month.split("-").map(Number);
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return [...Array<null>(lead).fill(null), ...Array.from({ length: count }, (_, i) => addDays(first, i))];
  }, [month]);
  const shift = (n: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const canPrev = month > minDate.slice(0, 7);
  const canNext = month < maxDate.slice(0, 7);
  const short = t("admin.weekdayShort", { returnObjects: true }) as unknown as string[];
  const headers = [1, 2, 3, 4, 5, 6, 0].map((d) => short[d]);
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" disabled={!canPrev} onClick={() => shift(-1)} aria-label={t("book.prevMonth")} className="rounded-lg p-2 hover:bg-surface disabled:opacity-30"><ChevronLeft className="size-5" /></button>
        <div className="font-display text-xl font-semibold capitalize">{fmtYmd(`${month}-01`, i18n.language, { month: "long", year: "numeric" })}</div>
        <button type="button" disabled={!canNext} onClick={() => shift(1)} aria-label={t("book.nextMonth")} className="rounded-lg p-2 hover:bg-surface disabled:opacity-30"><ChevronRight className="size-5" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">{headers.map((h) => <div key={h}>{h}</div>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d, i) => d === null ? <div key={`e${i}`} /> : (
          <button key={d} type="button" disabled={!available.has(d)} onClick={() => onChange(d)} aria-pressed={d === value}
            aria-label={fmtYmd(d, i18n.language, { weekday: "long", day: "numeric", month: "long" })}
            className={cn("h-11 rounded-lg text-sm font-semibold transition-colors",
              d === value ? "bg-brand text-brand-fg" : available.has(d) ? "border border-brand/50 bg-brand/15 text-fg hover:bg-brand/30" : "text-muted/40")}>
            {Number(d.slice(8))}
          </button>
        ))}
      </div>
    </div>
  );
}
