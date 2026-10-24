import { useState } from "react";

// Uses /brand/logo.png (original asset supplied by the owner) when present; otherwise a typographic wordmark
// modelled on the existing identity (heavy condensed RASCO + spaced PARTURI-KAMPAAMO).
export function Logo({ className = "", size = "md" }: { className?: string; size?: "md" | "lg" }) {
  const [failed, setFailed] = useState(false);
  if (!failed) return <img src="/brand/logo.png" alt="Rasco Parturi-Kampaamo" className={`h-11 w-auto ${className}`} onError={() => setFailed(true)} />;
  return (
    <span className={`inline-flex flex-col leading-none ${className}`} aria-label="Rasco Parturi-Kampaamo">
      <span className={`font-display font-bold tracking-[0.1em] text-fg ${size === "lg" ? "text-6xl" : "text-[1.9rem]"}`}>RASCO</span>
      <span className={`font-display font-semibold tracking-[0.36em] text-brand-hover ${size === "lg" ? "mt-1 text-base" : "text-[0.62rem]"}`}>PARTURI-KAMPAAMO</span>
    </span>
  );
}
