import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { isConfigured } from "@/lib/supabase";
import { Notice, Spinner } from "@/components/ui/card";

// Wraps loading / error / unconfigured states of a query so pages stay readable.
export function Query<T>({ q, children }: { q: { data?: T; isLoading: boolean; isError: boolean }; children: (data: T) => ReactNode }) {
  const { t } = useTranslation();
  if (!isConfigured) return <Notice tone="warn">{t("common.notConfigured")}</Notice>;
  if (q.isLoading) return <div className="py-16"><Spinner /></div>;
  if (q.isError || !q.data) return <Notice tone="danger">{t("common.loadError")}</Notice>;
  return <>{children(q.data)}</>;
}
