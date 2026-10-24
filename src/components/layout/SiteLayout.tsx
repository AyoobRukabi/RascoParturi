import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, Phone, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/hooks/useCatalog";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  return (
    <div role="group" aria-label={t("nav.language")} className="flex overflow-hidden rounded-lg border border-line text-sm font-semibold">
      {(["fi", "en"] as const).map((l) => (
        <button key={l} onClick={() => void i18n.changeLanguage(l)} aria-pressed={i18n.language === l} lang={l}
          className={cn("px-3 py-1.5 uppercase transition-colors", i18n.language === l ? "bg-brand text-brand-fg" : "text-muted hover:text-fg")}>{l}</button>
      ))}
    </div>
  );
}

export function SiteLayout() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data } = useCatalog();
  const loc = useLocation();
  const s = data?.settings;
  const links = [["/", t("nav.home")], ["/services", t("nav.services")], ["/contact", t("nav.contact")]] as const;
  const hideBookBar = loc.pathname.startsWith("/book");
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-3 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" aria-label={t("brand.name")} onClick={() => setOpen(false)}><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} end className={({ isActive }) => cn("rounded-lg px-3 py-2 text-sm font-medium hover:text-fg", isActive ? "text-fg" : "text-muted")}>{label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button asChild size="sm" className="hidden sm:inline-flex"><Link to="/book">{t("nav.book")}</Link></Button>
            <button className="rounded-lg p-2 md:hidden" aria-label={open ? t("nav.close") : t("nav.menu")} aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-line px-4 pb-4 md:hidden" aria-label="Mobile">
            {links.map(([to, label]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="block border-b border-line/60 py-3 text-lg">{label}</Link>)}
          </nav>
        )}
      </header>
      <main id="main" className="flex-1"><Outlet /></main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
          <div><Logo /><p className="mt-3 text-sm text-muted">{t("brand.tagline")}</p></div>
          <div className="text-sm">
            <h2 className="mb-2 text-lg font-semibold">{t("contact.title")}</h2>
            {s?.address && <p className="text-muted">{s.address}</p>}
            {s?.phone && <p><a className="text-fg underline-offset-4 hover:underline" href={`tel:${s.phone}`}>{s.phone}</a></p>}
            {s?.public_email && <p><a className="text-fg underline-offset-4 hover:underline" href={`mailto:${s.public_email}`}>{s.public_email}</a></p>}
          </div>
          <div className="text-sm text-muted">
            <p><Link className="hover:text-fg" to="/privacy">{t("footer.privacy")}</Link></p>
            <p className="mt-1"><Link className="hover:text-fg" to="/admin/login">{t("footer.admin")}</Link></p>
            <p className="mt-4">© {new Date().getFullYear()} {s?.business_name ?? t("brand.name")}. {t("footer.rights")}</p>
          </div>
        </div>
      </footer>
      {!hideBookBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-bg/95 p-3 backdrop-blur sm:hidden">
          <Button asChild className="flex-1"><Link to="/book">{t("nav.book")}</Link></Button>
          {s?.phone && <Button asChild variant="outline" aria-label={t("common.callUs")}><a href={`tel:${s.phone}`}><Phone className="size-5" /></a></Button>}
        </div>
      )}
      {!hideBookBar && <div className="h-20 sm:hidden" aria-hidden />}
    </div>
  );
}
