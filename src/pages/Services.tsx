import { Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/Reveal";
import { Query } from "@/components/Query";
import { ServiceList, ServiceListSkeleton } from "@/components/ServiceList";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/hooks/useCatalog";
import { AppLink } from "@/lib/preview";

export default function Services() {
  const { t } = useTranslation();
  const q = useCatalog();
  return (
    <div className="container-x section-y !pt-14">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4"><div className="lg:sticky lg:top-32">
          <p className="eyebrow rise mb-4">{t("home.featuredEyebrow")}</p>
          <h1 className="t-h2 rise" style={{ "--d": "60ms" } as React.CSSProperties}>{t("services.title")}</h1>
          <p className="t-lead rise mt-5" style={{ "--d": "140ms" } as React.CSSProperties}>{t("services.lead")}</p>
          <div className="rise mt-8 flex flex-wrap gap-3" style={{ "--d": "220ms" } as React.CSSProperties}>
            <Button asChild size="lg"><AppLink to="/book">{t("services.bookCta")}</AppLink></Button>
          </div>
        </div></div>
        <div className="lg:col-span-8">
          <Query q={q} skeleton={<ServiceListSkeleton rows={7} />}>{(d) => (
            <>
              <ServiceList services={d.services} flagPhoneOnly />
              {d.settings.phone && d.services.some((s) => !s.bookable_online) && (
                <Reveal className="mt-8 flex flex-wrap items-center gap-4 border border-line bg-surface p-5">
                  <Phone className="size-5 text-brand-hover" /><p className="flex-1 text-muted">{t("services.phoneNote")}</p>
                  <a className="font-display text-xl font-semibold tracking-wide hover:text-brand-hover" href={`tel:${d.settings.phone}`}>{d.settings.phone}</a>
                </Reveal>
              )}
            </>
          )}</Query>
        </div>
      </div>
    </div>
  );
}
