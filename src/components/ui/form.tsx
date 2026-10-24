import * as React from "react";
import { cn } from "@/lib/utils";

const field = "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-base text-fg placeholder:text-muted/70 focus:border-brand focus:outline-none disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(field, "h-11", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(field, "min-h-24", className)} {...p} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(field, "h-11", className)} {...p} />
));
Select.displayName = "Select";

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-fg", className)} {...p} />;
}

export function Field({ label, hint, error, optional, children, htmlFor }: {
  label: string; hint?: string; error?: string; optional?: string; children: React.ReactNode; htmlFor?: string;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}{optional && <span className="ml-1.5 font-normal text-muted">({optional})</span>}</Label>
      {children}
      {hint && !error && <p className="mt-1.5 text-sm text-muted">{hint}</p>}
      {error && <p role="alert" className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function Checkbox({ label, className, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-sm", className)}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]" {...p} />
      <span>{label}</span>
    </label>
  );
}
