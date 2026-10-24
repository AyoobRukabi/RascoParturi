import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fi from "./fi";
import en from "./en";

export type Lng = "fi" | "en";
const KEY = "lng";

function initial(): Lng {
  try { const v = localStorage.getItem(KEY); if (v === "fi" || v === "en") return v; } catch { /* storage unavailable */ }
  return "fi"; // Finnish is the default language
}

void i18n.use(initReactI18next).init({
  resources: { fi: { translation: fi }, en: { translation: en } },
  lng: initial(), fallbackLng: "fi", interpolation: { escapeValue: false }, returnObjects: true,
});

document.documentElement.lang = i18n.language;
i18n.on("languageChanged", (l) => {
  document.documentElement.lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
});

export default i18n;
