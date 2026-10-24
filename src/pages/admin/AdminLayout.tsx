import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { CalendarDays, List, LogOut, Mail, Scissors, Settings, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/layout/SiteLayout";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/card";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function AdminLayout() {
  const { t } = useTranslation();
  const { session, isAdmin, checking } = useAdmin();
  if (checking) return <div className="py-24"><Spinner /></div>;
  if (!session || !isAdmin) return <Navigate to="/admin/login" replace />;
  const nav = [
    ["/admin/calendar", CalendarDays, t("admin.nav.calendar")], ["/admin/appointments", List, t("admin.nav.appointments")],
    ["/admin/services", Scissors, t("admin.nav.services")], ["/admin/barbers", Users, t("admin.nav.barbers")],
    ["/admin/settings", Settings, t("admin.nav.settings")], ["/admin/emails", Mail, t("admin.nav.emails")],
  ] as const;
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <Link to="/" aria-label="Public site"><Logo className="[&_img]:h-9 scale-90 origin-left" /></Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={() => void supabase.auth.signOut()}><LogOut className="size-4" /><span className="hidden sm:inline">{t("admin.signOut")}</span></Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-2" aria-label="Admin">
          {nav.map(([to, Icon, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn("flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium", isActive ? "bg-brand text-brand-fg" : "text-muted hover:bg-surface-2 hover:text-fg")}>
              <Icon className="size-4" />{label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6"><Outlet /></main>
    </div>
  );
}
