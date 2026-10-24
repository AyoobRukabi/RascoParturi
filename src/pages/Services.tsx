import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Query } from "@/components/Query";
import { ServiceList } from "@/components/ServiceList";
import { useCatalog } from "@/hooks/useCatalog";

export default function Services() {
  const { t } = useTranslation();
  const q = useCatalog();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-5xl font-bold">{t("services.title")}</h1>
      <p className="mb-8 mt-2 text-muted">{t("services.lead")}</p>
      <Query q={q}>{(d) => (<><ServiceList services={d.services} /><div className="mt-8"><Button asChild size="lg"><Link to="/book">{t("services.bookCta")}</Link></Button></div></>)}</Query>
    </div>
  );
}
