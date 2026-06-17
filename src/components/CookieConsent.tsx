import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, ShieldCheck, X } from "lucide-react";
import { getStoredLang } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/translations";
import { getConsent, setConsent, onConsentChange } from "@/lib/consent";

type Copy = Record<Language, string>;

const T = {
  title: {
    en: "We respect your privacy",
    fr: "Nous respectons votre vie privée",
    uk: "Ми поважаємо вашу приватність",
    pl: "Szanujemy Twoją prywatność",
  } as Copy,
  body: {
    en: "We use only the cookies strictly necessary to run SoloBizz. With your consent we may also use analytics and marketing cookies to improve the product. You can change your choice anytime.",
    fr: "Nous utilisons uniquement les cookies strictement nécessaires au fonctionnement de SoloBizz. Avec votre consentement, nous pouvons aussi utiliser des cookies d'analyse et de marketing pour améliorer le produit. Vous pouvez modifier votre choix à tout moment.",
    uk: "Ми використовуємо лише cookies, необхідні для роботи SoloBizz. За вашою згодою — також аналітичні та маркетингові, щоб покращувати продукт. Ви можете змінити вибір у будь-який момент.",
    pl: "Używamy wyłącznie plików cookie niezbędnych do działania SoloBizz. Za Twoją zgodą możemy też używać analitycznych i marketingowych, aby ulepszać produkt. Możesz zmienić wybór w dowolnej chwili.",
  } as Copy,
  acceptAll: { en: "Accept all", fr: "Tout accepter", uk: "Прийняти всі", pl: "Akceptuj wszystkie" } as Copy,
  rejectAll: { en: "Reject non-essential", fr: "Refuser non essentiels", uk: "Лише необхідні", pl: "Tylko niezbędne" } as Copy,
  customize: { en: "Customize", fr: "Personnaliser", uk: "Налаштувати", pl: "Dostosuj" } as Copy,
  save: { en: "Save preferences", fr: "Enregistrer", uk: "Зберегти вибір", pl: "Zapisz wybór" } as Copy,
  necessary: { en: "Strictly necessary", fr: "Strictement nécessaires", uk: "Необхідні", pl: "Niezbędne" } as Copy,
  necessaryDesc: {
    en: "Required for sign-in, language and security. Always on.",
    fr: "Requis pour la connexion, la langue et la sécurité. Toujours actifs.",
    uk: "Потрібні для входу, мови та безпеки. Завжди увімкнено.",
    pl: "Wymagane do logowania, języka i bezpieczeństwa. Zawsze włączone.",
  } as Copy,
  analytics: { en: "Analytics", fr: "Analyse", uk: "Аналітика", pl: "Analityczne" } as Copy,
  analyticsDesc: {
    en: "Helps us understand how the site is used (Plerdy heatmaps).",
    fr: "Nous aide à comprendre l'utilisation du site (heatmaps Plerdy).",
    uk: "Допомагає зрозуміти, як використовується сайт (теплові карти Plerdy).",
    pl: "Pomaga zrozumieć, jak używana jest strona (mapy ciepła Plerdy).",
  } as Copy,
  marketing: { en: "Marketing", fr: "Marketing", uk: "Маркетинг", pl: "Marketing" } as Copy,
  marketingDesc: {
    en: "Used to measure ad performance (Meta Pixel).",
    fr: "Sert à mesurer la performance publicitaire (Meta Pixel).",
    uk: "Для вимірювання ефективності реклами (Meta Pixel).",
    pl: "Do pomiaru skuteczności reklam (Meta Pixel).",
  } as Copy,
  privacyLink: { en: "Privacy policy", fr: "Politique de confidentialité", uk: "Політика конфіденційності", pl: "Polityka prywatności" } as Copy,
  cookiesLink: { en: "Cookie policy", fr: "Politique cookies", uk: "Політика cookies", pl: "Polityka cookies" } as Copy,
};

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const coerce = (l: string): Language => (l === "en" || l === "uk" || l === "fr" || l === "pl" ? l : "en") as Language;
  const [lang, setLang] = useState<Language>(coerce(getStoredLang()));

  useEffect(() => {
    setOpen(getConsent() === null);
    const off = onConsentChange((c) => setOpen(c === null));
    const handleLang = () => setLang(coerce(getStoredLang()));
    window.addEventListener("app_lang_change", handleLang);
    // Manual open via global event (footer "Manage cookies" link)
    const openHandler = () => {
      const c = getConsent();
      setAnalytics(!!c?.analytics);
      setMarketing(!!c?.marketing);
      setExpanded(true);
      setOpen(true);
    };
    window.addEventListener("cookie_consent_open", openHandler);
    return () => {
      off();
      window.removeEventListener("app_lang_change", handleLang);
      window.removeEventListener("cookie_consent_open", openHandler);
    };
  }, []);

  if (!open) return null;
  const tr = (k: keyof typeof T) => T[k][lang] ?? T[k].en;

  const acceptAll = () => {
    setConsent({ analytics: true, marketing: true });
    setOpen(false);
  };
  const rejectAll = () => {
    setConsent({ analytics: false, marketing: false });
    setOpen(false);
  };
  const saveCustom = () => {
    setConsent({ analytics, marketing });
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={tr("title")}
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-border bg-background/95 backdrop-blur shadow-xl">
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Cookie className="h-5 w-5" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary sm:hidden" aria-hidden />
              {tr("title")}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              {tr("body")}{" "}
              <Link to="/privacy" className="underline hover:text-foreground">
                {tr("privacyLink")}
              </Link>
              {" · "}
              <Link to="/cookie-policy" className="underline hover:text-foreground">
                {tr("cookiesLink")}
              </Link>
              .
            </p>

            {expanded && (
              <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <Row
                  title={tr("necessary")}
                  desc={tr("necessaryDesc")}
                  checked
                  disabled
                />
                <Row
                  title={tr("analytics")}
                  desc={tr("analyticsDesc")}
                  checked={analytics}
                  onChange={setAnalytics}
                />
                <Row
                  title={tr("marketing")}
                  desc={tr("marketingDesc")}
                  checked={marketing}
                  onChange={setMarketing}
                />
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {expanded ? (
                <Button size="sm" onClick={saveCustom}>
                  {tr("save")}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setExpanded(true)}>
                  {tr("customize")}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={rejectAll}>
                {tr("rejectAll")}
              </Button>
              <Button size="sm" onClick={acceptAll} className="ml-auto">
                {tr("acceptAll")}
              </Button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={rejectAll}
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  title,
  desc,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={title}
      />
    </div>
  );
}

/** Programmatically reopen the consent dialog (for "Manage cookies" links). */
export function openCookieConsent() {
  try {
    window.dispatchEvent(new CustomEvent("cookie_consent_open"));
  } catch {}
}
