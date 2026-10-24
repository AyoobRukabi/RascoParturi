import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PreviewShell, SiteLayout } from "@/components/layout/SiteLayout";
import { PREVIEW_ENABLED } from "@/lib/preview";
import { PreviewConfirmation } from "@/pages/PreviewConfirmation";
import { Spinner } from "@/components/ui/card";
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import Contact from "@/pages/Contact";
import About from "@/pages/About";
import Privacy from "@/pages/Privacy";
import NotFound from "@/pages/NotFound";

const Book = lazy(() => import("@/pages/Book"));
const Manage = lazy(() => import("@/pages/Manage"));

// The admin area is code-split so customers never download it.
const AdminLogin = lazy(() => import("@/pages/admin/Login"));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const Calendar = lazy(() => import("@/pages/admin/Calendar"));
const Appointments = lazy(() => import("@/pages/admin/Appointments"));
const AdminServices = lazy(() => import("@/pages/admin/Services"));
const Barbers = lazy(() => import("@/pages/admin/Barbers"));
const SettingsPage = lazy(() => import("@/pages/admin/Settings"));
const Emails = lazy(() => import("@/pages/admin/Emails"));

export default function App() {
  return (
    <Suspense fallback={<div className="py-24"><Spinner /></div>}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="book" element={<Book />} />
          <Route path="booking/:token" element={<Manage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        {PREVIEW_ENABLED && (
          <Route path="preview" element={<PreviewShell />}>
            <Route index element={<Home />} />
            <Route path="services" element={<Services />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="book" element={<Book />} />
            <Route path="confirmation" element={<PreviewConfirmation />} />
            <Route path="booking/:token" element={<Manage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        )}
        <Route path="admin/login" element={<AdminLogin />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route path="calendar" element={<Calendar />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="barbers" element={<Barbers />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="emails" element={<Emails />} />
          <Route index element={<Navigate to="calendar" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
