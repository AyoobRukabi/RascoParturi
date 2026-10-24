import type * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-line bg-surface p-5 sm:p-6", className)} {...p} />;
}

export function Badge({ className, tone = "default", ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "success" | "danger" | "warn" | "brand" }) {
  const tones = {
    default: "bg-surface-2 text-muted", success: "bg-success/15 text-success", danger: "bg-danger/15 text-danger",
    warn: "bg-warn/15 text-warn", brand: "bg-brand/15 text-brand-hover",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)} {...p} />;
}

export function Notice({ tone = "default", className, ...p }: React.HTMLAttributes<HTMLDivElement> & { tone?: "default" | "danger" | "warn" | "success" }) {
  const tones = { default: "border-line bg-surface-2", danger: "border-danger/40 bg-danger/10 text-danger", warn: "border-warn/40 bg-warn/10 text-warn", success: "border-success/40 bg-success/10 text-success" };
  return <div role={tone === "danger" ? "alert" : undefined} className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)} {...p} />;
}

export function Spinner() {
  return <div role="status" aria-label="Loading" className="mx-auto size-8 animate-spin rounded-full border-2 border-line border-t-brand" />;
}
