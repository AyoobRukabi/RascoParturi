import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, Notice, Spinner } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Logo } from "@/components/Logo";
import { useAdmin } from "@/hooks/useAdmin";
import { isConfigured, supabase } from "@/lib/supabase";

export default function AdminLogin() {
  const { t } = useTranslation();
  const { session, isAdmin, checking } = useAdmin();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  if (checking) return <div className="py-24"><Spinner /></div>;
  if (session && isAdmin) return <Navigate to="/admin/calendar" replace />;
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex justify-center"><Logo /></div>
      <Card>
        <h1 className="mb-5 text-3xl font-bold">{t("admin.login")}</h1>
        {!isConfigured && <Notice tone="warn" className="mb-4">{t("common.notConfigured")}</Notice>}
        {session && !isAdmin && <Notice tone="danger" className="mb-4">{t("admin.notAdmin")}</Notice>}
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true); setErr(null);
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) setErr(t("admin.wrongLogin"));
          setBusy(false);
        }}>
          <Field label={t("admin.email")} htmlFor="email"><Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label={t("admin.password")} htmlFor="pw"><Input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {err && <Notice tone="danger">{err}</Notice>}
          <Button type="submit" disabled={busy || !isConfigured} className="w-full">{t("admin.signIn")}</Button>
        </form>
        {session && !isAdmin && <Button variant="ghost" className="mt-3 w-full" onClick={() => void supabase.auth.signOut()}>{t("admin.signOut")}</Button>}
      </Card>
    </div>
  );
}
