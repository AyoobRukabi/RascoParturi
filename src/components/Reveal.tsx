import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

// Fades content up once as it scrolls into view. Content is visible immediately if IntersectionObserver is unavailable.
export function Reveal({ children, delay = 0, as: Tag = "div", className = "" }: { children: ReactNode; delay?: number; as?: ElementType; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return <Tag ref={ref} className={`reveal ${shown ? "is-in" : ""} ${className}`} style={{ "--d": `${delay}ms` } as React.CSSProperties}>{children}</Tag>;
}
