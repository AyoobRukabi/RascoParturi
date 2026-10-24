import { useState } from "react";

// Uses /brand/logo.png (original asset supplied by the owner) when present; otherwise a text wordmark.
export function Logo({ className = "" }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!failed) return <img src="/brand/logo.png" alt="Rasco Parturi-Kampaamo" className={`h-12 w-auto ${className}`} onError={() => setFailed(true)} />;
  return (
    <span className={`flex flex-col leading-none ${className}`} aria-label="Rasco Parturi-Kampaamo">
      <span className="font-display text-3xl font-bold tracking-[0.12em] text-fg">RASCO</span>
      <span className="text-[0.62rem] font-semibold tracking-[0.34em] text-brand-hover">PARTURI-KAMPAAMO</span>
    </span>
  );
}
