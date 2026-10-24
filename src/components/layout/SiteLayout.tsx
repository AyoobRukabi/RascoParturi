import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu, Phone, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import { PoleRibbon } from "@/components/Pole";
import { OpeningHours } from "@/components/OpeningHours";
import { SocialLinks } from "@/components/Social";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/hooks/useCatalog";
import { AppLink, SAMPLE_CATALOG, PreviewProvider, usePreview, useAppPath } from "@/lib/preview";
import { CatalogOverrideProvider } from "@/hooks/useCatalog";
import { PreviewBackends } from "@/lib/backend";
import { directionsUrl } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n, t } = useTranslation();
  return (
    <div role="group" aria-label={t("nav.language")} className={cn("flex items-center font-display text-[0.95rem] font-semibold tracking-[0.18em]", className)}>
      {(["fi", "en"] as const).map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span aria-hidden className="mx-1.5 text-line-strong">/</span>}
          <button onClick={() => void i18n.changeLanguage(l)} aria-pressed={i18n.language === l} lang={l}
            className={cn("py-1 uppercase transition-colors", i18n.language === l ? "text-fg underline decoration-brand decoration-2 underline-offset-[6px]" : "text-muted hover:text-fg")}>{l}</button>
        </span>
      ))}
    </div>
  );
}

function PreviewBanner() {
  const path = useAppPath();
  const { pathname } = useLocation();
  const pages: [string, string][] = [
    ["/", "Home"], ["/services", "Services"], ["/about", "About"], ["/book", "Booking"], ["/confirmation", "Confirmation"],
    ["/booking/preview", "Manage booking"], ["/contact", "Contact"],
  ];
  const states: [string, string][] = [["/book?state=loading", "Booking: loading"], ["/book?state=empty", "Booking: no availability"], ["/book?state=error", "Booking: slot taken error"],
    ["/booking/preview?state=locked", "Manage: past deadline"], ["/booking/preview?state=cancelled", "Manage: cancelled"], ["/booking/preview?state=missing", "Manage: invalid link"]];
  return (
    <div className="sticky top-0 z-[60] border-b border-warn/40 bg-[#2a2210] text-sm text-warn">
      <div className="container-x flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
        <strong className="font-display tracking-[0.18em]">DESIGN PREVIEW</strong>
        <span className="text-warn/90">Sample data and simulated actions — nothing is booked and no email is sent.</span>
        <details className="relative ml-auto">
          <summary className="cursor-pointer select-none font-semibold underline-offset-4 hover:underline">Preview pages ▾</summary>
          <div className="absolute right-0 z-10 mt-2 w-64 border border-line-strong bg-bg p-3 text-fg shadow-2xl">
            <ul className="space-y-1">{pages.map(([to, label]) => <li key={to}><Link className={cn("block py-1 hover:text-brand-hover", pathname === path(to) && "text-brand-hover")} to={path(to)}>{label}</Link></li>)}</ul>
            <p className="mb-1 mt-3 text-xs uppercase tracking-widest text-muted">States</p>
            <ul className="space-y-1">{states.map(([to, label]) => <li key={to}><Link className="block py-1 text-muted hover:text-brand-hover" to={path(to)}>{label}</Link></li>)}</ul>
            <Link to="/book" className="mt-3 block border-t border-line pt-3 text-xs text-muted hover:text-fg">Real booking page (needs Supabase) →</Link>
          </div>
        </details>
      </div>
    </div>
  );
}

export function SiteLayout() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data } = useCatalog();
  const loc = useLocation();
  const preview = usePreview();
  const s = data?.settings;
  const links = [["/", t("nav.home")], ["/services", t("nav.services")], ["/about", t("nav.about")], ["/contact", t("nav.contact")]] as const;
  const onBook = loc.pathname.replace(/^\/preview/, "").startsWith("/book");
  useEffect(() => { setOpen(false); window.scrollTo({ top: 0 }); }, [loc.pathname]);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);
  const path = useAppPath();

  return (
    <div className="flex min-h-dvh flex-col">
      {preview && <PreviewBanner />}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:bg-brand focus:px-3 focus:py-2">Skip to content</a>
      <header className={cn("sticky z-40 border-b border-line bg-bg/92 backdrop-blur-md", preview ? "top-[2.6rem]" : "top-0")}>
        <div className="container-x flex h-[4.5rem] items-center justify-between gap-6">
          <AppLink to="/" aria-label={t("brand.name")}><Logo /></AppLink>
          <nav className="hidden items-center gap-9 md:flex" aria-label="Main">
            {links.map(([to, label]) => (
              <NavLink key={to} to={path(to)} end className={({ isActive }) => cn("font-display text-[1.05rem] font-semibold uppercase tracking-[0.16em] transition-colors hover:text-fg", isActive ? "text-fg" : "text-muted")}>{label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-5">
            <LanguageSwitcher />
            <Button asChild size="sm" className="hidden md:inline-flex"><AppLink to="/book">{t("nav.book")}</AppLink></Button>
            <button className="-mr-2 p-2 md:hidden" aria-label={open ? t("nav.close") : t("nav.menu")} aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? <X className="size-7" /> : <Menu className="size-7" />}
            </button>
          </div>
        </div>
        <PoleRibbon />
      </header>

      {open && (
        <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-bg px-5 pb-8 pt-[8.5rem] md:hidden">
          <nav aria-label="Mobile" className="flex-1">
            {links.map(([to, label], i) => (
              <Link key={to} to={path(to)} className="rise block border-b border-line py-4 font-display text-5xl font-bold uppercase tracking-wide" style={{ "--d": `${i * 60}ms` } as React.CSSProperties}>{label}</Link>
            ))}
          </nav>
          <div className="mt-8 space-y-4">
            <Button asChild size="lg" className="w-full"><AppLink to="/book">{t("nav.book")}</AppLink></Button>
            {s?.phone && <a href={`tel:${s.phone}`} className="flex items-center justify-center gap-2 py-2 text-muted"><Phone className="size-4" />{s.phone}</a>}
            <LanguageSwitcher className="justify-center" />
          </div>
        </div>
      )}

      <main id="main" className="flex-1"><Outlet /></main>

      <footer className="mt-24 bg-surface">
        <PoleRibbon animated />
        <div className="container-x grid gap-12 py-16 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo size="lg" />
            <p className="mt-4 max-w-xs text-muted">{t("brand.tagline")}</p>
            {s && <SocialLinks s={s} className="mt-6" />}
          </div>
          <div className="md:col-span-4">
            <h2 className="eyebrow mb-4">{t("footer.visit")}</h2>
            {s?.address && <p className="text-lg">{s.address}</p>}
            {s?.phone && <p className="mt-1"><a className="text-lg underline-offset-4 hover:underline" href={`tel:${s.phone}`}>{s.phone}</a></p>}
            {s?.public_email && <p className="mt-1"><a className="underline-offset-4 hover:underline" href={`mailto:${s.public_email}`}>{s.public_email}</a></p>}
            {s?.address && <a href={directionsUrl(s.address, s.google_maps_url)} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 font-display text-[1.05rem] font-semibold uppercase tracking-[0.14em] text-brand-hover hover:text-fg">{t("contact.openMap")} <ArrowUpRight className="size-4" /></a>}
          </div>
          <div className="md:col-span-4">
            <h2 className="eyebrow mb-4">{t("home.hoursTitle")}</h2>
            {data && <OpeningHours hours={data.opening_hours} tz={data.settings.timezone} compact />}
          </div>
        </div>
        <div className="border-t border-line">
          <div className="container-x flex flex-wrap items-center justify-between gap-3 py-5 text-sm text-muted">
            <p>© {new Date().getFullYear()} {s?.business_name ?? t("brand.name")}. {t("footer.rights")}</p>
            <p className="flex gap-5"><AppLink className="hover:text-fg" to="/privacy">{t("footer.privacy")}</AppLink>{!preview && <Link className="hover:text-fg" to="/admin/login">{t("footer.admin")}</Link>}</p>
          </div>
        </div>
      </footer>

      {!onBook && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-bg/95 p-3 backdrop-blur md:hidden">
          <Button asChild className="flex-1"><AppLink to="/book">{t("nav.book")}</AppLink></Button>
          {s?.phone && <Button asChild variant="outline" aria-label={t("common.callUs")}><a href={`tel:${s.phone}`}><Phone className="size-5" /></a></Button>}
        </div>
      )}
      {!onBook && <div className="h-20 md:hidden" aria-hidden />}
    </div>
  );
}

/** Wraps the public pages in design-preview mode: sample catalog, simulated backend, preview-aware links. */
export function PreviewShell() {
  return (
    <PreviewProvider>
      <CatalogOverrideProvider value={SAMPLE_CATALOG}>
        <PreviewBackends><SiteLayout /></PreviewBackends>
      </CatalogOverrideProvider>
    </PreviewProvider>
  );
}
