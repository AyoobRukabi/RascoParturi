import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { OpeningHours } from "@/components/OpeningHours";
import { Photo } from "@/components/Photo";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/hooks/useCatalog";
import { AppLink, usePreview } from "@/lib/preview";

// Copy here is limited to what the owner already published on the old site. Longer story text should be written by the owner.
export default function About() {
  const { t } = useTranslation();
  const { data } = useCatalog();
  const preview = usePreview();
  const pillars = t("home.pillars", { returnObjects: true }) as unknown as string[];
  const pillarText = t("about.pillarText", { returnObjects: true }) as unknown as string[];
  return (
    <>
      <section className="container-x section-y !pb-12 !pt-14">
        <p className="eyebrow rise mb-5">{t("about.eyebrow")}</p>
        <h1 className="t-hero rise max-w-5xl" style={{ "--d": "80ms" } as React.CSSProperties}>{t("about.title")}<span className="t-serif block text-[0.78em] text-brand-hover">{t("about.title2")}</span></h1>
      </section>

      <section className="container-x grid gap-12 pb-20 lg:grid-cols-12 lg:gap-16">
        <Photo src="/brand/shop.jpg" alt={t("brand.name")} label="shop interior · /brand/shop.jpg · 4:5" className="aspect-[4/5] lg:col-span-5" />
        <div className="lg:col-span-7 lg:pt-10">
          <Reveal><p className="t-serif text-[clamp(1.9rem,4vw,3rem)] leading-[1.15]">{t("home.introText")}</p></Reveal>
          <ul className="mt-12 border-t border-line">
            {pillars.map((p, i) => (
              <Reveal as="li" key={p} delay={i * 70} className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-line py-6 sm:grid-cols-[4rem_1fr]">
                <span className="font-display text-2xl font-semibold text-brand-hover">0{i + 1}</span>
                <div><h2 className="!text-3xl">{p}</h2><p className="mt-1.5 text-muted">{pillarText[i]}</p></div>
              </Reveal>
            ))}
          </ul>
          {preview && <p className="mt-8 border border-dashed border-line-strong p-4 text-sm text-muted">Design note: the shop's story, history and barber introductions are not published yet. The owner can supply a short text and photos; this layout has room for them.</p>}
        </div>
      </section>

      {data && data.barbers.length > 0 && (
        <section className="border-y border-line bg-surface section-y" aria-labelledby="team-h">
          <div className="container-x">
            <Reveal><p className="eyebrow mb-4">{t("about.teamEyebrow")}</p><h2 id="team-h" className="t-h2 mb-10">{t("about.team")}</h2></Reveal>
            <ul className="grid gap-x-10 border-t border-line sm:grid-cols-2">
              {data.barbers.map((b, i) => <Reveal as="li" key={b.id} delay={i * 60} className="flex items-baseline gap-5 border-b border-line py-5"><span className="font-display text-lg font-semibold text-muted">0{i + 1}</span><span className="font-display text-4xl font-bold uppercase">{b.name}</span></Reveal>)}
            </ul>
          </div>
        </section>
      )}

      <section className="container-x grid gap-12 section-y lg:grid-cols-12">
        <div className="lg:col-span-6"><h2 className="t-h2 mb-8">{t("home.hoursTitle")}</h2>{data && <OpeningHours hours={data.opening_hours} tz={data.settings.timezone} />}</div>
        <div className="flex flex-col items-start justify-end gap-6 lg:col-span-6">
          <p className="t-serif text-4xl">{t("home.ctaTitle2")}</p>
          <Button asChild size="lg"><AppLink to="/book">{t("home.bookCta")} <ArrowRight className="size-5" /></AppLink></Button>
        </div>
      </section>
    </>
  );
}
