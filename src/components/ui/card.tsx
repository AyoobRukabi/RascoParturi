import type * as React from "react";
import { cn } from "@/lib/utils";

// Use sparingly: the public site favours open layouts and hairlines over boxed cards.
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-line bg-surface p-5 sm:p-6", className)} {...p} />;
}

export function Badge({ className, tone = "default", ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "success" | "danger" | "warn" | "brand" }) {
  const tones = {
    default: "bg-surface-2 text-muted", success: "bg-success/15 text-success", danger: "bg-danger/15 text-danger",
    warn: "bg-warn/15 text-warn", brand: "bg-brand/15 text-brand-hover",
  };
  return <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold tracking-wide", tones[tone], className)} {...p} />;
}

export function Notice({ tone = "default", className, ...p }: React.HTMLAttributes<HTMLDivElement> & { tone?: "default" | "danger" | "warn" | "success" }) {
  const tones = { default: "border-line bg-surface", danger: "border-danger/40 bg-danger/10 text-danger", warn: "border-warn/40 bg-warn/10 text-warn", success: "border-success/40 bg-success/10 text-success" };
  return <div role={tone === "danger" ? "alert" : undefined} className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone], className)} {...p} />;
}

export function Spinner({ className }: { className?: string }) {
  return <div role="status" aria-label="Loading" className={cn("mx-auto size-7 animate-spin rounded-full border-2 border-line-strong border-t-brand", className)} />;
}

export const Skeleton = ({ className }: { className?: string }) => <div aria-hidden className={cn("skeleton", className)} />;

/** Empty state: says what is missing and offers a next step. */
export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="font-display text-2xl font-semibold uppercase tracking-wide">{title}</p>
      {text && <p className="mx-auto mt-2 max-w-md text-muted">{text}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
