import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, CheckCircle2, CalendarDays } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { groupsText } from "@/i18n/groupsExtra";
import { BrandName } from "@/components/BrandName";

const LANGS = ["uk", "en", "pl", "de", "fr", "ru"];

export default function PublicGroupSignupPage() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const { lang: appLang } = useLanguage();
  const urlLang = params.get("lang");
  const lang = urlLang && LANGS.includes(urlLang) ? urlLang : appLang;
  const g = groupsText(lang);
  const [info, setInfo] = useState<any>(undefined);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.rpc("public_get_group_registration" as any, { _token: token }).then(({ data }) => { setInfo(data ?? null); if (data) window.__lovableEvents?.track?.("project.group_signup_page_viewed", {}); });
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const { data, error } = await supabase.rpc("public_submit_group_registration" as any, {
      _token: token, _name: form.name, _email: form.email, _phone: form.phone, _message: form.message,
    });
    setBusy(false);
    if (error) { setError(error.message.includes("NOT_AVAILABLE") ? g.unavailable : error.message.includes("EMAIL") ? g.email : error.message); return; }
    const st = (data as any)?.status ?? "pending";
    window.__lovableEvents?.track?.("project.group_application_submitted", { status: st });
    if (st === "waitlisted") window.__lovableEvents?.track?.("project.group_application_waitlisted", { source: "auto_full" });
    setResult(st);
  };

  const fmt = (iso: string) => new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso));

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-10">
      <Helmet><title>{info?.name ? `${info.name} — Solo .Bizz` : "Solo .Bizz"}</title><meta name="robots" content="noindex" /></Helmet>
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center text-sm"><BrandName /></div>
        {info === undefined ? <p className="text-center text-muted-foreground">…</p> : info === null ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">{g.unavailable}</div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><Users className="h-5 w-5" /></div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{info.name}</h1>
                <p className="text-xs text-muted-foreground">{info.group_type === "supervision" ? g.supervision : g.regular}{info.price_amount != null ? ` · ${info.price_amount}` : ""}</p>
              </div>
            </div>
            {info.description && <p className="text-sm text-foreground/90 whitespace-pre-line">{info.description}</p>}
            {info.sessions?.length > 0 && (
              <div>
                <p className="text-sm font-medium flex items-center gap-2 mb-2"><CalendarDays className="h-4 w-4 text-primary" />{g.upcoming}</p>
                <ul className="text-sm text-muted-foreground space-y-1">{info.sessions.map((s: any) => <li key={s.starts_at}>{fmt(s.starts_at)}</li>)}</ul>
              </div>
            )}
            {result ? (
              <div className="text-center space-y-2 py-4">
                <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                <p className="font-semibold">{g.doneTitle}</p>
                <p className="text-sm text-muted-foreground">{result === "waitlisted" ? g.doneWait : result === "duplicate" ? g.doneDup : g.donePending}</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <h2 className="font-semibold">{g.applyTitle}</h2>
                {info.is_full && <p className="text-sm text-warning">{g.full}</p>}
                <div className="space-y-1.5"><Label>{g.yourName} *</Label><Input required maxLength={200} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>{g.email} *</Label><Input required type="email" maxLength={255} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>{g.phone}</Label><Input maxLength={50} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>{g.note}</Label><Textarea rows={3} maxLength={2000} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} /></div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>{g.submit}</Button>
                <p className="text-xs text-muted-foreground text-center">{g.privacy}</p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
