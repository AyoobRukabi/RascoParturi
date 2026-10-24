import { useTranslation } from "react-i18next";
import { Notice } from "@/components/ui/card";
import { Query } from "@/components/Query";
import { useCatalog } from "@/hooks/useCatalog";

// Structure for legal review. Business details come from settings; unconfirmed items show a visible placeholder.
export default function Privacy() {
  const { t } = useTranslation();
  const q = useCatalog();
  const list = (k: string) => t(k, { returnObjects: true }) as unknown as string[];
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-5xl font-bold">{t("privacy.title")}</h1>
      <Query q={q}>{(d) => {
        const s = d.settings; const ph = t("privacy.notSet");
        const confirmed = Boolean(s.legal_name && s.business_id);
        return (
          <div className="space-y-6 text-muted [&_h2]:mb-2 [&_h2]:text-3xl [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc">
            {!confirmed && <Notice tone="warn">{t("privacy.draftNotice")}</Notice>}
            <section><h2>{t("privacy.controller")}</h2>
              <p>{t("privacy.controllerText")} <strong className="text-fg">{s.legal_name ?? ph}</strong>. {t("privacy.businessId")}: <strong className="text-fg">{s.business_id ?? ph}</strong>.</p>
              <p>{s.address}</p>
              <p>{t("privacy.contactPerson")}: <strong className="text-fg">{s.privacy_contact_email ?? s.public_email ?? ph}</strong></p></section>
            <section><h2>{t("privacy.data")}</h2><ul>{list("privacy.dataList").map((x) => <li key={x}>{x}</li>)}</ul></section>
            <section><h2>{t("privacy.purpose")}</h2><p>{t("privacy.purposeText")}</p></section>
            <section><h2>{t("privacy.recipients")}</h2><ul>{list("privacy.recipientsList").map((x) => <li key={x}>{x}</li>)}</ul><p className="mt-2">{t("privacy.recipientsNote")}</p></section>
            <section><h2>{t("privacy.retention")}</h2><p>{s.retention_days ? t("privacy.retentionText", { d: s.retention_days }) : ph}</p></section>
            <section><h2>{t("privacy.rights")}</h2><p>{t("privacy.rightsText")}</p></section>
            <section><h2>{t("privacy.cookies")}</h2><p>{t("privacy.cookiesText")}</p></section>
          </div>
        );
      }}</Query>
    </div>
  );
}
