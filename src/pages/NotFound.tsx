import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Compass } from "lucide-react";
import { SeoHead } from "@/components/SeoHead";
import { useLanguage, setStoredLang } from '@/i18n/LanguageContext';
import { localizedPath, publicLanguage, PUBLIC_NAV_COPY } from '@/lib/publicLanguage';

const ASCII_GHOST = String.raw`
    .|||||||||.
   |||||||||||||
  |||||||||||' .\
  \`||||||||||_,__o
`;

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang: stored, t } = useLanguage();
  const lang = publicLanguage(new URLSearchParams(location.search).get('lang')) ?? stored;
  const copy = PUBLIC_NAV_COPY[lang];
  useEffect(() => { if (lang !== stored) setStoredLang(lang); }, [lang, stored]);
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/40 px-4 py-12">
      <SeoHead
        lang={lang}
        title={`${copy.title} — Solo .Bizz`}
        description={copy.after}
        path="/404"
        noindex
      />

      <div className="w-full max-w-lg text-center space-y-8">
        <pre
          aria-hidden
          className="mx-auto text-left text-primary text-xs sm:text-sm leading-tight font-mono whitespace-pre select-none"
        >
{ASCII_GHOST}
        </pre>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            404
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            {copy.heading}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {copy.before}{" "}
            <code className="font-mono text-foreground/80 bg-muted px-1.5 py-0.5 rounded">
              {location.pathname}
            </code>
            . {copy.after}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" onClick={() => navigate(-1)} variant="outline" className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {copy.back}
          </Button>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to={localizedPath('/', lang)}>
              <Home className="mr-2 h-4 w-4" />
              {copy.home}
            </Link>
          </Button>
        </div>

        <div className="pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-3 inline-flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5" />
            {copy.jump}
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <Link to="/dashboard" className="text-primary hover:underline">{t('nav.dashboard')}</Link>
            <span className="text-border" aria-hidden>·</span>
            <Link to="/calendar" className="text-primary hover:underline">{t('nav.calendar')}</Link>
            <span className="text-border" aria-hidden>·</span>
            <Link to="/clients" className="text-primary hover:underline">{t('nav.clients')}</Link>
            <span className="text-border" aria-hidden>·</span>
            <Link to="/settings" className="text-primary hover:underline">{t('nav.settings')}</Link>
          </nav>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
