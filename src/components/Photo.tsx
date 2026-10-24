import { useEffect, useState } from "react";
import { usePreview } from "@/lib/preview";
import { cn } from "@/lib/utils";

export function useImageAvailable(src: string) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    setOk(null);
    const i = new Image();
    i.onload = () => setOk(true);
    i.onerror = () => setOk(false);
    i.src = src;
  }, [src]);
  return ok;
}

/**
 * A real photograph supplied by the owner. If the file is missing:
 *  - on the live site the slot renders nothing (no stock/placeholder imagery),
 *  - in design preview a labelled placeholder shows where the photo will go.
 */
export function Photo({ src, alt, label, className, imgClassName }: { src: string; alt: string; label: string; className?: string; imgClassName?: string }) {
  const ok = useImageAvailable(src);
  const preview = usePreview();
  if (ok) return <div className={cn("overflow-hidden bg-surface", className)}><img src={src} alt={alt} loading="lazy" decoding="async" className={cn("size-full object-cover", imgClassName)} /></div>;
  if (ok === false && preview) {
    return (
      <div role="img" aria-label={`Photo placeholder: ${label}`} className={cn("relative flex items-end overflow-hidden border border-dashed border-line-strong bg-surface p-4", className)}
        style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 14px, rgba(243,239,231,.035) 14px 15px)" }}>
        <span className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-muted">Photo slot · {label}</span>
      </div>
    );
  }
  return ok === null ? <div className={cn("skeleton", className)} /> : null;
}
