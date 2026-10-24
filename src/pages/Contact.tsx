import { Mail, MapPin, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Query } from "@/components/Query";
import { OpeningHours } from "@/components/OpeningHours";
import { useCatalog } from "@/hooks/useCatalog";

export default function Contact() {
  const { t } = useTranslation();
  const q = useCatalog();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-5xl font-bold">{t("contact.title")}</h1>
      <Query q={q}>{(d) => (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="space-y-4">
            {d.settings.address && <p className="flex gap-3"><MapPin className="mt-1 size-5 shrink-0 text-brand-hover" />{d.settings.address}</p>}
            {d.settings.phone && <p className="flex gap-3"><Phone className="mt-1 size-5 shrink-0 text-brand-hover" /><a className="hover:underline" href={`tel:${d.settings.phone}`}>{d.settings.phone}</a></p>}
            {d.settings.public_email && <p className="flex gap-3"><Mail className="mt-1 size-5 shrink-0 text-brand-hover" /><a className="break-all hover:underline" href={`mailto:${d.settings.public_email}`}>{d.settings.public_email}</a></p>}
            <div className="flex flex-wrap gap-2 pt-2">
              {d.settings.instagram_url && <Button asChild variant="outline" size="sm"><a href={d.settings.instagram_url} target="_blank" rel="noreferrer">Instagram</a></Button>}
              {d.settings.tiktok_url && <Button asChild variant="outline" size="sm"><a href={d.settings.tiktok_url} target="_blank" rel="noreferrer">TikTok</a></Button>}
              {d.settings.address && <Button asChild variant="outline" size="sm"><a target="_blank" rel="noreferrer" href={d.settings.google_maps_url ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.settings.address)}`}>{t("contact.openMap")}</a></Button>}
            </div>
          </Card>
          <Card><h2 className="mb-3 text-3xl font-bold">{t("contact.hours")}</h2><OpeningHours hours={d.opening_hours} tz={d.settings.timezone} /></Card>
        </div>
      )}</Query>
    </div>
  );
}
