// The barber pole: the brand's recurring mark. Pure SVG/CSS, no image asset needed.
export function PoleRibbon({ animated = false, className = "" }: { animated?: boolean; className?: string }) {
  return <div aria-hidden className={`pole-ribbon ${animated ? "is-animated" : ""} ${className}`} />;
}

export function PoleIllustration({ className = "" }: { className?: string }) {
  const bands = Array.from({ length: 14 }, (_, i) => i);
  return (
    <svg viewBox="0 0 160 560" className={className} role="img" aria-label="Barber pole" fill="none">
      <defs>
        <clipPath id="pole-glass"><rect x="40" y="70" width="80" height="420" rx="40" /></clipPath>
        <linearGradient id="pole-shade" x1="40" x2="120" y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#000" stopOpacity=".55" /><stop offset=".28" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".6" />
        </linearGradient>
        <linearGradient id="pole-metal" x1="0" x2="1"><stop offset="0" stopColor="#3a3a3c" /><stop offset=".4" stopColor="#8d8d90" /><stop offset="1" stopColor="#2a2a2c" /></linearGradient>
      </defs>
      <g clipPath="url(#pole-glass)">
        <rect x="40" y="70" width="80" height="420" fill="#f3efe7" />
        <g style={{ transform: "skewY(-30deg)", transformOrigin: "80px 280px" }}>
          <g className="pole-scroll" style={{ transform: "translateY(-60px)" }}>
            {bands.map((i) => (
              <g key={i}>
                <rect x="0" y={i * 60 - 120} width="160" height="20" fill="#d6382d" />
                <rect x="0" y={i * 60 - 100} width="160" height="20" fill="#f3efe7" />
                <rect x="0" y={i * 60 - 80} width="160" height="20" fill="#2f6bff" />
              </g>
            ))}
          </g>
        </g>
        <rect x="40" y="70" width="80" height="420" fill="url(#pole-shade)" />
      </g>
      <rect x="40" y="70" width="80" height="420" rx="40" stroke="#f3efe7" strokeOpacity=".25" />
      <rect x="32" y="40" width="96" height="44" rx="12" fill="url(#pole-metal)" /><circle cx="80" cy="30" r="14" fill="url(#pole-metal)" />
      <rect x="32" y="476" width="96" height="44" rx="12" fill="url(#pole-metal)" /><rect x="64" y="520" width="32" height="22" rx="4" fill="url(#pole-metal)" />
    </svg>
  );
}
