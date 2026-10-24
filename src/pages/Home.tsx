import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ServiceList } from "@/components/ServiceList";
import { OpeningHours } from "@/components/OpeningHours";
import { useCatalog } from "@/hooks/useCatalog";

interface GalleryItem { src: string; alt?: string }

// Gallery photos are real files supplied by the owner (public/gallery + manifest.json). Hidden when none exist.
function Gallery() {
  const { t } = useTranslation();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  useEffect(() => {
    fetch("/gallery/manifest.json").then((r) => (r.ok ? r.json() : [])).then((j) => Array.isArray(j) && setItems(j)).catch(() => undefined);
  }, []);
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="gallery-h">
      <h2 id="gallery-h" className="mb-6 text-4xl font-bold">{t("home.galleryTitle")}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((g) => (
          <button key={g.src} onClick={() => setLightbox(g)} className="aspect-[4/5] overflow-hidden rounded-2xl border border-line">
            <img src={g.src} alt={g.alt ?? ""} loading="lazy" className="size-full object-cover transition-transform hover:scale-105" />
          </button>
        ))}
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <img src={lightbox.src} alt={lightbox.alt ?? ""} className="max-h-full max-w-full rounded-xl" />
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { data } = useCatalog();
  const s = data?.settings;
  return (
    <>
      <section className="pole-stripes relative overflow-hidden border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-brand-hover">{t("brand.tagline")}</p>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.02] sm:text-7xl">{t("home.heroTitle")}</h1>
          <p className="mt-6 max-w-xl text-lg text-muted">{t("home.heroText")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/book">{t("home.bookCta")}</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/services">{t("home.viewServices")}</Link></Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2">
            {(t("home.chips", { returnObjects: true }) as unknown as string[]).map((c) => (
              <li key={c} className="rounded-full border border-line bg-bg/70 px-4 py-1.5 text-sm text-muted">{c}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="services-h">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><h2 id="services-h" className="text-4xl font-bold">{t("home.servicesTitle")}</h2><p className="mt-1 text-muted">{t("home.servicesLead")}</p></div>
          <Link to="/services" className="hidden text-sm font-semibold text-brand-hover hover:underline sm:block">{t("home.allServices")} →</Link>
        </div>
        <ServiceList services={data?.services ?? []} limit={6} />
        <div className="mt-6"><Button asChild><Link to="/book">{t("home.bookCta")}</Link></Button></div>
      </section>

      <Gallery />

      <section className="border-t border-line bg-surface" aria-labelledby="visit-h">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2">
          <div>
            <h2 id="visit-h" className="mb-4 text-4xl font-bold">{t("home.hoursTitle")}</h2>
            {data && <OpeningHours hours={data.opening_hours} tz={data.settings.timezone} />}
          </div>
          <Card className="self-start bg-bg">
            <h2 className="mb-4 text-3xl font-bold">{t("home.findUs")}</h2>
            {s?.address && (
              <p className="flex items-start gap-3"><MapPin className="mt-1 size-5 shrink-0 text-brand-hover" /><span>{s.address}</span></p>
            )}
            {s?.phone && <p className="mt-3 flex items-center gap-3"><Phone className="size-5 text-brand-hover" /><a className="hover:underline" href={`tel:${s.phone}`}>{s.phone}</a></p>}
            {s?.address && (
              <Button asChild variant="outline" className="mt-5">
                <a href={s.google_maps_url ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`} target="_blank" rel="noreferrer">{t("contact.openMap")}</a>
              </Button>
            )}
          </Card>
        </div>
      </section>
    </>
  );
}
