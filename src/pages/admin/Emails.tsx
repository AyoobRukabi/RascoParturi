import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge, Notice, Spinner } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { fmtDate, fmtTime } from "@/lib/time";

interface Row { id: string; kind: string; recipient: string; status: "sent" | "failed"; error: string | null; created_at: string }
export default function Emails() {
  const { t, i18n } = useTranslation();
  const q = useQuery({ queryKey: ["email-log"], queryFn: async () => { const { data, error } = await supabase.from("email_log").select("*").order("created_at", { ascending: false }).limit(100); if (error) throw error; return data as Row[]; } });
  return (
    <div>
      <h1 className="mb-4 text-4xl font-bold">{t("admin.emails.title")}</h1>
      {q.isLoading && <Spinner />}{q.isError && <Notice tone="danger">{t("common.loadError")}</Notice>}
      <ul className="space-y-2">
        {q.data?.map((r) => (
          <li key={r.id} className="grid gap-1 rounded-xl border border-line bg-surface p-3 text-sm sm:grid-cols-[10rem_12rem_1fr_auto] sm:items-center sm:gap-4">
            <span className="tabular-nums text-muted">{fmtDate(r.created_at, i18n.language, "Europe/Helsinki", { day: "numeric", month: "numeric" })} {fmtTime(r.created_at, i18n.language, "Europe/Helsinki")}</span>
            <span>{r.kind}</span><span className="break-all">{r.recipient}{r.error && <span className="block text-danger">{r.error}</span>}</span>
            <Badge tone={r.status === "sent" ? "success" : "danger"}>{t(`admin.emails.${r.status}`)}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
