import { BrandName } from "@/components/BrandName";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import type { AppLanguage } from "@/i18n/translations";

const LABELS: Record<AppLanguage, { rights: string; nav: string; terms: string; privacy: string; cookies: string; refund: string; guide: string; settings: string }> = {
  en: {
    rights: "All rights reserved.",
    nav: "Legal links",
    terms: "Terms & Conditions",
    privacy: "Privacy Policy",
    cookies: "Cookie Policy",
    refund: "Refund Policy", guide: "Starting a practice",
    settings: "Cookie settings",
  },
  uk: {
    rights: "Усі права захищено.",
    nav: "Юридичні посилання",
    terms: "Умови використання",
    privacy: "Політика конфіденційності",
    cookies: "Політика cookie",
    refund: "Політика повернення коштів", guide: "Як почати практику",
    settings: "Налаштування cookie",
  },
  pl: {
    rights: "Wszelkie prawa zastrzeżone.",
    nav: "Linki prawne",
    terms: "Regulamin",
    privacy: "Polityka prywatności",
    cookies: "Polityka plików cookie",
    refund: "Polityka zwrotów", guide: "Jak zacząć praktykę",
    settings: "Ustawienia cookie",
  },
  fr: {
    rights: "Tous droits réservés.",
    nav: "Liens juridiques",
    terms: "Conditions générales",
    privacy: "Politique de confidentialité",
    cookies: "Politique de cookies",
    refund: "Politique de remboursement", guide: "Démarrer une pratique",
    settings: "Paramètres des cookies",
  },
  ru: {
    rights: "Все права защищены.",
    nav: "Юридические ссылки",
    terms: "Условия использования",
    privacy: "Политика конфиденциальности",
    cookies: "Политика cookie",
    refund: "Политика возврата средств", guide: "Как начать практику",
    settings: "Настройки cookie",
  },
};

export function PublicFooter() {
  const { lang } = useLanguage();
  const l = LABELS[lang] ?? LABELS.en;

  return (
    <footer className="border-t border-border bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} <BrandName />. {l.rights}
        </p>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label={l.nav}>
          <Link to="/guides/start-private-practice" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {l.guide}
          </Link>
          <Link to="/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {l.terms}
          </Link>
          <Link to="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {l.privacy}
          </Link>
          <Link to="/cookie-policy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {l.cookies}
          </Link>
          <Link to="/refund-policy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {l.refund}
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("cookie_consent_open"))}
            className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {l.settings}
          </button>
        </nav>
      </div>
    </footer>
  );
}
