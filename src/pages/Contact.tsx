import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { OpeningHours } from "@/components/OpeningHours";
import { Reveal } from "@/components/Reveal";
import { SocialLinks } from "@/components/Social";
import { Query } from "@/components/Query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/card";
import { useCatalog } from "@/hooks/useCatalog";
import { appleMapsUrl, directionsUrl } from "@/lib/catalog";
import { AppLink } from "@/lib/preview";

export default function Contact() {
  const { t } = useTranslation();
  const q = useCatalog();
  return (
    <div className="container-x section-y !pt-14">
      <p className="eyebrow rise mb-5">{t("home.findUs")}</p>
      <h1 className="t-hero rise mb-14" style={{ "--d": "80ms" } as React.CSSProperties}>{t("contact.title")}</h1>
      <Query q={q} skeleton={<div className="grid gap-8 md:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>}>{(d) => (
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <Reveal className="lg:col-span-6">
            <ul className="border-t border-line">
              {d.settings.address && <li className="flex gap-5 border-b border-line py-6"><MapPin className="mt-1.5 size-5 shrink-0 text-brand-hover" /><div><p className="eyebrow !text-muted mb-1">{t("contact.address")}</p><p className="font-display text-4xl font-bold uppercase leading-none">{d.settings.address.split(",")[0]}</p><p className="mt-1 text-lg text-muted">{d.settings.address.split(",").slice(1).join(",").trim()}</p></div></li>}
              {d.settings.phone && <li className="flex gap-5 border-b border-line py-6"><Phone className="mt-1.5 size-5 shrink-0 text-brand-hover" /><div><p className="eyebrow !text-muted mb-1">{t("contact.phone")}</p><a className="text-2xl underline-offset-4 hover:underline" href={`tel:${d.settings.phone}`}>{d.settings.phone}</a></div></li>}
              {d.settings.public_email && <li className="flex gap-5 border-b border-line py-6"><Mail className="mt-1.5 size-5 shrink-0 text-brand-hover" /><div><p className="eyebrow !text-muted mb-1">{t("contact.email")}</p><a className="break-all text-xl underline-offset-4 hover:underline" href={`mailto:${d.settings.public_email}`}>{d.settings.public_email}</a></div></li>}
            </ul>
            {d.settings.address && <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="light"><a href={directionsUrl(d.settings.address, d.settings.google_maps_url)} target="_blank" rel="noreferrer">{t("contact.directions")} <ArrowUpRight className="size-4" /></a></Button>
              <Button asChild variant="outline"><a href={appleMapsUrl(d.settings.address)} target="_blank" rel="noreferrer">Apple Maps</a></Button></div>}
            <SocialLinks s={d.settings} className="mt-8" />
          </Reveal>
          <Reveal delay={100} className="lg:col-span-6">
            <h2 className="t-h2 mb-8 !text-[clamp(2.2rem,5vw,3.4rem)]">{t("contact.hours")}</h2>
            <OpeningHours hours={d.opening_hours} tz={d.settings.timezone} />
            <Button asChild size="lg" className="mt-10 w-full sm:w-auto"><AppLink to="/book">{t("nav.book")}</AppLink></Button>
          </Reveal>
        </div>
      )}</Query>
    </div>
  );
}
