import { ArrowRight, ArrowUpRight, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Gallery } from "@/components/Gallery";
import { OpeningHours } from "@/components/OpeningHours";
import { Photo, useImageAvailable } from "@/components/Photo";
import { PoleIllustration, PoleRibbon } from "@/components/Pole";
import { Reveal } from "@/components/Reveal";
import { Reviews } from "@/components/Reviews";
import { ServiceList, ServiceListSkeleton } from "@/components/ServiceList";
import { SocialLinks } from "@/components/Social";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/hooks/useCatalog";
import { appleMapsUrl, directionsUrl, isOpenNow } from "@/lib/catalog";
import { AppLink, usePreview } from "@/lib/preview";
import { trimTime } from "@/lib/time";

function Hero() {
  const { t } = useTranslation();
  const { data } = useCatalog();
  const preview = usePreview();
  const photo = useImageAvailable("/brand/hero.jpg");
  const s = data?.settings;
  const todayWd = data ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(new Intl.DateTimeFormat("en-GB", { timeZone: data.settings.timezone, weekday: "short" }).format(new Date())) : -1;
  const today = data?.opening_hours.find((h) => h.weekday === todayWd);
  const open = data ? isOpenNow(data.opening_hours, data.settings.timezone) : false;
  return (
    <section className="relative overflow-hidden">
      <div className="container-x grid gap-10 pb-16 pt-12 sm:pt-16 lg:grid-cols-12 lg:gap-8 lg:pb-24 lg:pt-20">
        <div className="lg:col-span-7 lg:pt-6">
          <p className="eyebrow rise mb-6" style={{ "--d": "0ms" } as React.CSSProperties}>{t("home.eyebrow")}</p>
          <h1 className="t-hero rise" style={{ "--d": "80ms" } as React.CSSProperties}>
            {t("home.line1")}
            <span className="t-serif mt-1 block text-[0.78em] leading-[0.95] text-brand-hover">{t("home.line2")}</span>
          </h1>
          <p className="t-lead rise mt-8 max-w-xl" style={{ "--d": "200ms" } as React.CSSProperties}>{t("home.lead")}</p>
          <div className="rise mt-10 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ "--d": "300ms" } as React.CSSProperties}>
            <Button asChild size="lg"><AppLink to="/book">{t("home.bookCta")} <ArrowRight className="size-5 transition-transform group-hover/btn:translate-x-1" /></AppLink></Button>
            <AppLink to="/services" className="font-display text-[1.1rem] font-semibold uppercase tracking-[0.14em] text-fg underline decoration-line-strong decoration-2 underline-offset-[10px] transition-colors hover:decoration-brand">{t("home.viewServices")}</AppLink>
          </div>
          <dl className="rise mt-14 grid max-w-xl grid-cols-2 gap-6 border-t border-line pt-6 text-sm" style={{ "--d": "400ms" } as React.CSSProperties}>
            <div><dt className="eyebrow mb-1.5 !text-muted">{t("home.today")}</dt><dd className="flex items-center gap-2 text-lg"><span aria-hidden className={`size-2 rounded-full ${open ? "bg-success" : "bg-line-strong"}`} />{today?.open && today.close ? `${trimTime(today.open)} – ${trimTime(today.close)}` : t("home.closedDay")}</dd></div>
            {s?.address && <div><dt className="eyebrow mb-1.5 !text-muted">{t("footer.visit")}</dt><dd className="text-lg">{s.address.split(",")[0]}</dd></div>}
          </dl>
        </div>

        <div className="rise lg:col-span-5" style={{ "--d": "250ms" } as React.CSSProperties}>
          {photo ? (
            <Photo src="/brand/hero.jpg" alt={t("brand.name")} label="hero" className="aspect-[4/5] w-full" />
          ) : (
            <div className="relative grid aspect-[4/5] w-full place-items-center overflow-hidden border border-line bg-surface" aria-hidden>
              <PoleIllustration className="h-[86%] w-auto drop-shadow-[0_30px_60px_rgba(0,0,0,.6)]" />
              <span className="absolute bottom-4 left-4 font-display text-xs font-semibold uppercase tracking-[0.3em] text-muted [writing-mode:vertical-rl] rotate-180">Helsinki · Helsinginkatu 4 b</span>
              {preview && <span className="absolute right-3 top-3 border border-dashed border-line-strong bg-bg/80 px-2 py-1 font-display text-xs uppercase tracking-[0.18em] text-muted">Hero photo slot · /brand/hero.jpg · 4:5</span>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const q = useCatalog();
  const data = q.data;
  const s = data?.settings;
  const pillars = t("home.pillars", { returnObjects: true }) as unknown as string[];
  return (
    <>
      <Hero />

      {/* Introduction — the owner's own description from the existing site */}
      <section className="border-y border-line bg-surface section-y" aria-labelledby="intro-h">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-8"><p className="eyebrow mb-5">{t("home.introEyebrow")}</p>
            <h2 id="intro-h" className="t-serif text-[clamp(2rem,4.6vw,3.6rem)] leading-[1.12] normal-case">{t("home.introText")}</h2></Reveal>
          <ul className="grid gap-0 border-t border-line lg:col-span-4 lg:border-t-0">
            {pillars.map((p, i) => (
              <Reveal as="li" key={p} delay={i * 80} className="flex items-baseline gap-5 border-b border-line py-5 lg:first:pt-0">
                <span className="font-display text-xl font-semibold text-brand-hover">0{i + 1}</span><span className="font-display text-2xl font-semibold uppercase tracking-wide">{p}</span>
              </Reveal>
            ))}
            <li className="pt-6"><AppLink to="/about" className="inline-flex items-center gap-1.5 font-display text-[1.05rem] font-semibold uppercase tracking-[0.14em] text-brand-hover hover:text-fg">{t("home.more")} <ArrowUpRight className="size-4" /></AppLink></li>
          </ul>
        </div>
      </section>

      {/* Featured services */}
      <section className="section-y" aria-labelledby="services-h">
        <div className="container-x grid gap-10 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-4"><div className="lg:sticky lg:top-32">
            <p className="eyebrow mb-4">{t("home.featuredEyebrow")}</p><h2 id="services-h" className="t-h2">{t("home.servicesTitle")}</h2>
            <p className="t-lead mt-5">{t("home.servicesLead")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-6"><Button asChild><AppLink to="/book">{t("home.bookCta")}</AppLink></Button>
              <AppLink to="/services" className="font-display text-[1.05rem] font-semibold uppercase tracking-[0.14em] text-muted hover:text-fg">{t("home.allServices")} →</AppLink></div>
          </div></Reveal>
          <div className="lg:col-span-8">{q.isLoading ? <ServiceListSkeleton /> : <ServiceList services={data?.services ?? []} limit={6} showDuration={false} />}</div>
        </div>
      </section>

      <Gallery />
      <Reviews />

      {/* Visit */}
      <section className="section-y" aria-labelledby="visit-h">
        <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-20">
          <Reveal className="lg:col-span-6"><p className="eyebrow mb-4">{t("home.visitEyebrow")}</p><h2 id="visit-h" className="t-h2 mb-8">{t("home.hoursTitle")}</h2>
            {data && <OpeningHours hours={data.opening_hours} tz={data.settings.timezone} />}</Reveal>
          <Reveal delay={100} className="lg:col-span-6"><p className="eyebrow mb-4">{t("home.findUs")}</p>
            {s?.address && (<>
              <p className="font-display text-[clamp(2rem,5vw,3.4rem)] font-bold uppercase leading-[0.95]">{s.address.split(",")[0]}<span className="block text-muted">{s.address.split(",").slice(1).join(",").trim()}</span></p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="light"><a href={directionsUrl(s.address, s.google_maps_url)} target="_blank" rel="noreferrer">{t("contact.directions")} <ArrowUpRight className="size-4" /></a></Button>
                <Button asChild variant="outline"><a href={appleMapsUrl(s.address)} target="_blank" rel="noreferrer">Apple Maps</a></Button>
              </div></>)}
            {s?.phone && <p className="mt-8"><a className="inline-flex items-center gap-3 text-xl underline-offset-4 hover:underline" href={`tel:${s.phone}`}><Phone className="size-5 text-brand-hover" />{s.phone}</a></p>}
            {s && <SocialLinks s={s} className="mt-8" />}
          </Reveal>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="relative overflow-hidden border-t border-line bg-surface">
        <PoleRibbon animated />
        <div className="container-x flex flex-col items-start justify-between gap-8 py-16 sm:py-24 lg:flex-row lg:items-end">
          <Reveal><h2 className="t-h2 max-w-3xl">{t("home.ctaTitle")}<span className="t-serif block text-[0.8em] text-brand-hover">{t("home.ctaTitle2")}</span></h2></Reveal>
          <Reveal delay={100}><Button asChild size="lg"><AppLink to="/book">{t("home.bookCta")} <ArrowRight className="size-5 transition-transform group-hover/btn:translate-x-1" /></AppLink></Button></Reveal>
        </div>
      </section>
    </>
  );
}
