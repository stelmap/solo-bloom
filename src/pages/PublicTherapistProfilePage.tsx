import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Globe } from "lucide-react";
import { getPreLoginLang } from "@/i18n/LanguageContext";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SeoHead } from "@/components/SeoHead";
import { BrandName } from "@/components/BrandName";
import { TherapistProfileView } from "@/components/therapist/TherapistProfileView";
import { fullName, normalizeProfile, tpLang, type TherapistProfileData } from "@/lib/therapistProfile";

const NOT_FOUND: Record<string, string> = {
  en: "This profile is not available.", uk: "Цей профіль недоступний.", pl: "Ten profil jest niedostępny.",
  de: "Dieses Profil ist nicht verfügbar.", fr: "Ce profil n'est pas disponible.", ru: "Этот профиль недоступен.",
};

export default function PublicTherapistProfilePage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [pick, setPick] = useState<string | null>(() => params.get("lang") || getPreLoginLang() || (() => { try { return localStorage.getItem("landing_lang"); } catch { return null; } })());
  const [state, setState] = useState<{ profile: TherapistProfileData; booking: string; lang: string } | null | "missing">(null);

  useEffect(() => {
    let on = true;
    void supabase.rpc("public_get_therapist_profile_by_slug", { p_slug: slug }).then(({ data }) => {
      if (!on) return;
      const d = data as { profile?: unknown; booking_key?: string; language?: string } | null;
      if (!d?.profile || !d.booking_key) setState("missing");
      else setState({ profile: normalizeProfile(d.profile), booking: d.booking_key, lang: d.language ?? "en" });
    });
    return () => { on = false; };
  }, [slug]);

  const browser = typeof navigator !== "undefined" ? navigator.language : "en";
  if (state === null) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (state === "missing") return <><SeoHead path={`/therapist/${slug}`} title="Solo .Bizz" description={NOT_FOUND.en} noindex /><div className="flex min-h-screen items-center justify-center p-6 text-muted-foreground">{NOT_FOUND[tpLang(pick || browser)]}</div></>;

  const lang = tpLang(pick || browser || state.lang);
  const choose = (v: string) => { setPick(v); const n = new URLSearchParams(params); n.set("lang", v); setParams(n, { replace: true }); };
  const name = fullName(state.profile);
  const title = [name, state.profile.title].filter(Boolean).join(" — ");
  const desc = state.profile.about_html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) || state.profile.expertise.join(", ");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 px-3 py-6 sm:px-4">
      <SeoHead path={`/therapist/${slug}`} title={title || "Solo .Bizz"} description={desc || title} jsonLd={{
        "@context": "https://schema.org", "@type": "Person", name, jobTitle: state.profile.title || undefined,
        description: desc || undefined, url: `https://solo-bizz.com/therapist/${slug}`,
        knowsAbout: state.profile.expertise.length ? state.profile.expertise : undefined,
      }} />
      <Helmet>
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary" />
      </Helmet>
      <div className="mx-auto max-w-[900px] space-y-6">
        <div className="flex justify-end">
          <label className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold">
            <Globe className="h-4 w-4" /><span className="sr-only">Language</span>
            <select aria-label="Language" value={lang} onChange={(e) => choose(e.target.value)} className="bg-transparent uppercase">
              {(["uk", "en", "pl", "de", "fr", "ru"] as const).map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
          </label>
        </div>
        <TherapistProfileView profile={state.profile} lang={lang} onBook={() => navigate(`/book/${state.booking}?lang=${lang}`)} />
        <p className="text-center text-xs text-muted-foreground"><BrandName /></p>
      </div>
    </div>
  );
}
