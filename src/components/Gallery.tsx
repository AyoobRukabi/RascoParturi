import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Photo } from "@/components/Photo";
import { Reveal } from "@/components/Reveal";
import { useJsonList, type GalleryItem } from "@/hooks/useJson";
import { usePreview } from "@/lib/preview";
import { cn } from "@/lib/utils";

// Editorial asymmetric layout: tall / square / wide tiles repeating. Real photos only (public/gallery/manifest.json).
const TILES = ["md:col-span-7 aspect-[4/5]", "md:col-span-5 aspect-square md:mt-16", "md:col-span-5 aspect-square", "md:col-span-7 aspect-[4/3] md:-mt-10", "md:col-span-4 aspect-[4/5]", "md:col-span-8 aspect-[16/10]"];

export function Gallery({ max = 6 }: { max?: number }) {
  const { t } = useTranslation();
  const items = useJsonList<GalleryItem>("/gallery/manifest.json").slice(0, max);
  const preview = usePreview();
  const [open, setOpen] = useState<GalleryItem | null>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open]);
  const slots: GalleryItem[] = items.length ? items : preview ? [{ src: "/gallery/placeholder-1.jpg" }, { src: "/gallery/placeholder-2.jpg" }, { src: "/gallery/placeholder-3.jpg" }, { src: "/gallery/placeholder-4.jpg" }] : [];
  if (slots.length === 0) return null; // no real photos yet: the section is not shown on the live site
  return (
    <section className="section-y" aria-labelledby="gallery-h">
      <div className="container-x">
        <Reveal><p className="eyebrow mb-4">{t("home.galleryEyebrow")}</p><h2 id="gallery-h" className="t-h2 mb-12 max-w-3xl">{t("home.galleryTitle")}</h2></Reveal>
        <div className="grid gap-4 md:grid-cols-12 md:gap-6">
          {slots.map((g, i) => (
            <Reveal key={g.src} delay={(i % 2) * 80} className={cn(TILES[i % TILES.length])}>
              {items.length ? (
                <button onClick={() => setOpen(g)} className="group block size-full overflow-hidden" aria-label={g.alt ?? t("home.galleryTitle")}>
                  <Photo src={g.src} alt={g.alt ?? ""} label={g.src} className="size-full" imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.03]" />
                </button>
              ) : <Photo src={g.src} alt="" label={`gallery photo ${i + 1} (public/gallery)`} className="size-full" />}
            </Reveal>
          ))}
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-4" role="dialog" aria-modal="true" aria-label={open.alt ?? "Photo"} onClick={() => setOpen(null)}>
          <button className="absolute right-4 top-4 p-2" aria-label={t("common.close")} onClick={() => setOpen(null)}><X className="size-8" /></button>
          <img src={open.src} alt={open.alt ?? ""} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </section>
  );
}
