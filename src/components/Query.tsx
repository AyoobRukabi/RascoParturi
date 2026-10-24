import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { isConfigured } from "@/lib/supabase";
import { usePreview } from "@/lib/preview";
import { Notice } from "@/components/ui/card";

// Wraps loading / error / unconfigured states of a query so pages stay readable.
export function Query<T>({ q, children, skeleton }: { q: { data?: T; isLoading: boolean; isError: boolean }; children: (data: T) => ReactNode; skeleton?: ReactNode }) {
  const { t } = useTranslation();
  const preview = usePreview();
  if (!isConfigured && !preview) return <Notice tone="warn">{t("common.notConfigured")}</Notice>;
  if (q.isLoading) return <>{skeleton ?? <div className="skeleton h-40 w-full" />}</>;
  if (q.isError || !q.data) return <Notice tone="danger">{t("common.loadError")}</Notice>;
  return <>{children(q.data)}</>;
}
