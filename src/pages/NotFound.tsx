import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AppLink } from "@/lib/preview";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="container-x py-28">
      <p className="eyebrow mb-4">404</p>
      <h1 className="t-hero">{t("notFound.title")}</h1>
      <Button asChild className="mt-10" size="lg"><AppLink to="/">{t("nav.home")}</AppLink></Button>
    </div>
  );
}
