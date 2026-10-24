import { Instagram } from "lucide-react";
import type { PublicSettings } from "@/lib/types";

const TikTok = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M16.6 2h-3.1v13.2a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.2a6 6 0 1 0 5.1 5.9V8.4a7.6 7.6 0 0 0 4.4 1.4V6.7A4.5 4.5 0 0 1 16.6 2z" /></svg>
);

/** Only renders links the owner has actually configured. */
export function SocialLinks({ s, className = "" }: { s: Pick<PublicSettings, "instagram_url" | "tiktok_url">; className?: string }) {
  const items = [[s.instagram_url, "Instagram", <Instagram key="i" className="size-5" />], [s.tiktok_url, "TikTok", <TikTok key="t" className="size-5" />]] as const;
  const shown = items.filter(([u]) => u);
  if (shown.length === 0) return null;
  return (
    <ul className={`flex gap-2 ${className}`}>
      {shown.map(([url, label, icon]) => (
        <li key={label}><a href={url!} target="_blank" rel="noreferrer" aria-label={label} className="grid size-11 place-items-center border border-line-strong text-fg transition-colors hover:border-fg hover:bg-fg hover:text-bg">{icon}</a></li>
      ))}
    </ul>
  );
}
