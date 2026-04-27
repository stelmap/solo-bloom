import { useState, useCallback, createContext, useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { getStoredLang, setStoredLang } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/translations";
import { track } from "@/lib/analytics";
import {
  ArrowRight, CheckCircle2, AlertTriangle, Eye, TrendingUp,
  Calendar as CalendarIcon, Users, Sparkles, ShieldCheck,
} from "lucide-react";

// ── Local landing-page copy (EN / FR / UK) ────────────────────────────
// Kept inline to avoid bloating global translations for a marketing page.

type Copy = Record<Language, string>;
const C = {
  // Nav
  navFeatures: { en: "What changes", fr: "Ce qui change", uk: "Що змінюється" },
  navPricing: { en: "Pricing", fr: "Tarifs", uk: "Ціни" },
  navHow: { en: "How it works", fr: "Comment ça marche", uk: "Як це працює" },
  navLogin: { en: "Log in", fr: "Connexion", uk: "Увійти" },
  navTry: { en: "Try free", fr: "Essai gratuit", uk: "Спробувати" },

  // Hero
  heroBadge: { en: "For psychologists & solo professionals", fr: "Pour psychologues & indépendants", uk: "Для психологів та самозайнятих" },
  heroTitle1: { en: "You're not bad at business.", fr: "Vous n'êtes pas mauvais en business.", uk: "Ви не погані у бізнесі." },
  heroTitle2: { en: "You just don't see your numbers.", fr: "Vous ne voyez juste pas vos chiffres.", uk: "Ви просто не бачите своїх цифр." },
  heroSub: { en: "Clients, sessions, and income — finally in one clear system.", fr: "Clients, séances et revenus — enfin dans un seul système clair.", uk: "Клієнти, сесії та дохід — нарешті в одній зрозумілій системі." },
  heroCta: { en: "See your practice in 1 minute", fr: "Voyez votre cabinet en 1 minute", uk: "Побачте свою практику за 1 хвилину" },
  heroSubCta: { en: "No credit card. No setup. Just try.", fr: "Sans carte bancaire. Sans configuration. Essayez.", uk: "Без картки. Без налаштувань. Просто спробуйте." },

  // Dashboard preview
  dpClients: { en: "Active clients", fr: "Clients actifs", uk: "Активні клієнти" },
  dpSessions: { en: "Sessions this week", fr: "Séances cette semaine", uk: "Сесій цього тижня" },
  dpIncome: { en: "Income this month", fr: "Revenus ce mois", uk: "Дохід цього місяця" },
  dpUpcoming: { en: "Upcoming sessions", fr: "Séances à venir", uk: "Найближчі сесії" },
  dpPaid: { en: "Paid", fr: "Payé", uk: "Оплачено" },
  dpPending: { en: "Pending", fr: "En attente", uk: "Очікує" },

  // Pain
  painTitle: { en: "This is probably happening to you:", fr: "Voilà ce qui vous arrive sûrement :", uk: "Ймовірно, це відбувається з вами:" },
  pain1: { en: "You don't know your real monthly income", fr: "Vous ignorez vos vrais revenus mensuels", uk: "Ви не знаєте реального місячного доходу" },
  pain2: { en: "You track everything manually — or not at all", fr: "Vous suivez tout à la main — ou pas du tout", uk: "Ви ведете все вручну — або ніяк" },
  pain3: { en: "You forget sessions or payments", fr: "Vous oubliez des séances ou des paiements", uk: "Ви забуваєте про сесії або оплати" },
  pain4: { en: "You feel busy — but not in control", fr: "Vous êtes occupé — mais pas aux commandes", uk: "Ви зайняті — але не контролюєте процес" },
  painBottom1: { en: "This is not a productivity issue.", fr: "Ce n'est pas un problème de productivité.", uk: "Це не проблема продуктивності." },
  painBottom2: { en: "This is lack of system.", fr: "C'est un manque de système.", uk: "Це відсутність системи." },
  painCta: { en: "Fix this in 5 minutes", fr: "Réglez ça en 5 minutes", uk: "Виправити за 5 хвилин" },

  // Solution
  solTitle: { en: "This is what changes:", fr: "Voici ce qui change :", uk: "Ось що змінюється:" },
  sol1: { en: "Open one screen → see all your clients", fr: "Un seul écran → tous vos clients", uk: "Один екран → усі ваші клієнти" },
  sol2: { en: "Know exactly how much you earned", fr: "Sachez exactement combien vous avez gagné", uk: "Точно знайте, скільки ви заробили" },
  sol3: { en: "Stop guessing — start controlling your business", fr: "Arrêtez de deviner — pilotez votre activité", uk: "Перестаньте здогадуватися — почніть керувати" },
  sol4: { en: "Spend time with clients, not spreadsheets", fr: "Du temps pour vos clients, pas pour Excel", uk: "Час на клієнтів, а не на таблиці" },
  solCta: { en: "Try with demo data", fr: "Essayer avec des données démo", uk: "Спробувати з демо-даними" },

  // Demo / Wow
  demoTitle: { en: "See how your practice could look in 60 seconds", fr: "Voyez à quoi votre cabinet peut ressembler en 60 secondes", uk: "Подивіться, якою може бути ваша практика за 60 секунд" },
  demoText: { en: "This is a demo workspace with real data. No setup needed.", fr: "Un espace de démo avec de vraies données. Aucune configuration.", uk: "Це демо-простір з реальними даними. Без налаштувань." },
  demoCta: { en: "Open demo workspace", fr: "Ouvrir l'espace démo", uk: "Відкрити демо-простір" },

  // How it works
  howTitle: { en: "Start in minutes", fr: "Démarrez en quelques minutes", uk: "Почніть за лічені хвилини" },
  how1: { en: "Add a client", fr: "Ajoutez un client", uk: "Додайте клієнта" },
  how2: { en: "Schedule a session", fr: "Planifiez une séance", uk: "Заплануйте сесію" },
  how3: { en: "See your income clearly", fr: "Voyez vos revenus clairement", uk: "Бачте дохід чітко" },

  // Pricing
  pricingTitle: { en: "Choose your practice", fr: "Choisissez votre formule", uk: "Оберіть свою практику" },
  pricingSub: { en: "Both plans start with a free trial. No credit card.", fr: "Les deux formules démarrent par un essai gratuit. Sans carte.", uk: "Обидва плани починаються з безкоштовного періоду. Без картки." },
  monthly: { en: "Monthly", fr: "Mensuel", uk: "Щомісяця" },
  quarterly: { en: "Quarterly", fr: "Trimestriel", uk: "Щокварталу" },
  yearly: { en: "Yearly", fr: "Annuel", uk: "Щороку" },
  save20: { en: "Save 20%", fr: "−20 %", uk: "−20%" },
  save40: { en: "Save 40%", fr: "−40 %", uk: "−40%" },
  perMonth: { en: "/month", fr: "/mois", uk: "/міс" },
  billedMo: { en: "Billed monthly", fr: "Facturé mensuellement", uk: "Оплата щомісяця" },
  billedQ: { en: "Billed every 3 months", fr: "Facturé tous les 3 mois", uk: "Оплата раз на 3 місяці" },
  billedY: { en: "Billed yearly", fr: "Facturé annuellement", uk: "Оплата раз на рік" },
  soloName: { en: "Solo Practice", fr: "Pratique Solo", uk: "Solo-практика" },
  soloDesc: { en: "For control and clarity", fr: "Pour le contrôle et la clarté", uk: "Для контролю та ясності" },
  soloF1: { en: "Clients", fr: "Clients", uk: "Клієнти" },
  soloF2: { en: "Sessions", fr: "Séances", uk: "Сесії" },
  soloF3: { en: "Calendar", fr: "Calendrier", uk: "Календар" },
  soloF4: { en: "Basic finances", fr: "Finances de base", uk: "Базові фінанси" },
  proName: { en: "Pro Practice", fr: "Pratique Pro", uk: "Pro-практика" },
  proDesc: { en: "For growth and stable income", fr: "Pour la croissance et un revenu stable", uk: "Для зростання та стабільного доходу" },
  popular: { en: "Most popular", fr: "Le plus populaire", uk: "Найпопулярніший" },
  proF1: { en: "Everything in Solo", fr: "Tout de Solo", uk: "Усе з Solo" },
  proF2: { en: "Supervision", fr: "Supervision", uk: "Супервізія" },
  proF3: { en: "Group sessions", fr: "Séances de groupe", uk: "Групові сесії" },
  proF4: { en: "Advanced financial tracking", fr: "Suivi financier avancé", uk: "Розширений фінансовий облік" },
  startTrial: { en: "Start free trial", fr: "Démarrer l'essai gratuit", uk: "Почати безкоштовний період" },

  // Trust
  trustTitle: { en: "Try it without overthinking", fr: "Essayez sans réfléchir", uk: "Спробуйте без зайвих сумнівів" },
  trust1: { en: "No credit card required", fr: "Sans carte bancaire", uk: "Без банківської картки" },
  trust2: { en: "Cancel anytime", fr: "Annulable à tout moment", uk: "Скасування будь-коли" },
  trust3: { en: "Takes less than 2 minutes to start", fr: "Moins de 2 minutes pour démarrer", uk: "Менше 2 хвилин, щоб почати" },
  trustCta: { en: "Try it now", fr: "Essayer maintenant", uk: "Спробувати зараз" },

  // Final
  finalTitle1: { en: "You can keep working in chaos.", fr: "Vous pouvez continuer dans le chaos.", uk: "Можна й далі працювати в хаосі." },
  finalTitle2: { en: "Or take control today.", fr: "Ou prendre le contrôle aujourd'hui.", uk: "Або взяти контроль уже сьогодні." },

  // Footer
  rights: { en: "All rights reserved.", fr: "Tous droits réservés.", uk: "Усі права захищено." },
  privacy: { en: "Privacy", fr: "Confidentialité", uk: "Конфіденційність" },
  terms: { en: "Terms", fr: "Conditions", uk: "Умови" },
} satisfies Record<string, Copy>;

type CopyKey = keyof typeof C;

// ── Local i18n provider ───────────────────────────────────────────────

const LandingLangContext = createContext<{
  lang: Language;
  t: (key: CopyKey) => string;
  toggle: () => void;
}>({ lang: "en", t: (k) => k as string, toggle: () => {} });

function useLandingLang() {
  return useContext(LandingLangContext);
}

const LANG_CYCLE: Language[] = ["en", "fr", "uk"];

function LandingLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(() => getStoredLang());

  const toggle = useCallback(() => {
    setLang((prev) => {
      const idx = LANG_CYCLE.indexOf(prev);
      const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length];
      setStoredLang(next);
      return next;
    });
  }, []);

  const t = useCallback(
    (key: CopyKey): string => {
      const entry = C[key];
      return entry[lang] || entry.en;
    },
    [lang]
  );

  return (
    <LandingLangContext.Provider value={{ lang, t, toggle }}>
      {children}
    </LandingLangContext.Provider>
  );
}

// ── Billing cycle context (shared with pricing + CTA analytics) ───────

type Cycle = "monthly" | "quarterly" | "yearly";
const BillingCycleContext = createContext<Cycle>("monthly");
const useBillingCycle = () => useContext(BillingCycleContext);

// ── Reusable CTA helper ───────────────────────────────────────────────

function PrimaryCta({
  label,
  source,
  cta,
  size = "lg",
  className = "",
  extra,
}: {
  label: string;
  source: string;
  cta: string;
  size?: "sm" | "lg" | "default";
  className?: string;
  extra?: Record<string, unknown>;
}) {
  const { lang } = useLandingLang();
  const billing_cycle = useBillingCycle();
  return (
    <Link
      to={`/auth?plan=solo_${billing_cycle}`}
      onClick={() =>
        track("cta_clicked", { source_page: source, cta, lang, billing_cycle, ...extra })
      }
    >
      <Button size={size} className={`gap-2 ${className}`}>
        {label} <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────

function LandingNav() {
  const { lang, t, toggle } = useLandingLang();
  const links = [
    { label: t("navFeatures"), href: "#solution" },
    { label: t("navHow"), href: "#how" },
    { label: t("navPricing"), href: "#pricing" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-foreground tracking-tight">
          Solo<span className="text-primary">Bizz</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="px-2.5 py-1 rounded-md border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors"
            aria-label="Switch language"
            title={`Language: ${lang.toUpperCase()}`}
          >
            {lang === "en" ? "🇬🇧 EN" : lang === "fr" ? "🇫🇷 FR" : "🇺🇦 UA"}
          </button>
          <Link to="/auth" className="hidden sm:block">
            <Button variant="ghost" size="sm">{t("navLogin")}</Button>
          </Link>
          <Link to="/auth" onClick={() => track("cta_clicked", { source_page: "/", cta: "nav", lang })}>
            <Button size="sm">{t("navTry")}</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Dashboard preview (visual-only mock) ──────────────────────────────

function DashboardPreview() {
  const { t } = useLandingLang();
  return (
    <div className="relative mx-auto max-w-4xl">
      {/* Glow */}
      <div aria-hidden className="absolute -inset-4 sm:-inset-8 bg-primary/20 blur-3xl rounded-full opacity-40" />
      <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/40">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
          <span className="ml-3 text-xs text-muted-foreground">solo-bizz.com / dashboard</span>
        </div>

        <div className="p-5 sm:p-7 grid sm:grid-cols-3 gap-4">
          {/* Metric cards */}
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{t("dpClients")}</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">24</div>
            <div className="text-xs text-primary mt-1">+3 this month</div>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{t("dpSessions")}</span>
              <CalendarIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">18</div>
            <div className="text-xs text-muted-foreground mt-1">6 today</div>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{t("dpIncome")}</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">€4,820</div>
            <div className="text-xs text-primary mt-1">+12% vs last</div>
          </div>
        </div>

        {/* Upcoming list */}
        <div className="px-5 sm:px-7 pb-6">
          <div className="text-xs font-medium text-muted-foreground mb-3">{t("dpUpcoming")}</div>
          <div className="space-y-2">
            {[
              { name: "Anna L.", time: "10:00", price: "€80", paid: true },
              { name: "Marc D.", time: "11:30", price: "€80", paid: true },
              { name: "Sofia P.", time: "14:00", price: "€80", paid: false },
            ].map((row) => (
              <div key={row.name} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                    {row.name[0]}
                  </div>
                  <span className="text-sm font-medium text-foreground">{row.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{row.time}</span>
                  <span className="text-sm font-semibold text-foreground">{row.price}</span>
                  <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${
                    row.paid ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {row.paid ? t("dpPaid") : t("dpPending")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────

function HeroSection() {
  const { t } = useLandingLang();
  return (
    <section className="pt-28 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          {t("heroBadge")}
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1] mb-5">
          {t("heroTitle1")}
          <br />
          <span className="text-primary">{t("heroTitle2")}</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
          {t("heroSub")}
        </p>
        <div className="flex flex-col items-center gap-3 mb-12">
          <PrimaryCta label={t("heroCta")} source="/" cta="hero" className="text-base px-8 h-12" />
          <p className="text-sm text-muted-foreground">{t("heroSubCta")}</p>
        </div>
        <DashboardPreview />
      </div>
    </section>
  );
}

// ── Pain ──────────────────────────────────────────────────────────────

function PainSection() {
  const { t } = useLandingLang();
  const items: CopyKey[] = ["pain1", "pain2", "pain3", "pain4"];
  return (
    <section className="py-20 px-4 sm:px-6 bg-secondary">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-secondary-foreground text-center mb-10">
          {t("painTitle")}
        </h2>
        <div className="space-y-3 mb-10">
          {items.map((key) => (
            <div key={key} className="flex items-start gap-4 p-4 rounded-xl bg-accent/40 border border-sidebar-border">
              <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-base sm:text-lg text-secondary-foreground/90 font-medium">{t(key)}</p>
            </div>
          ))}
        </div>
        <div className="text-center mb-8">
          <p className="text-lg text-secondary-foreground/70">{t("painBottom1")}</p>
          <p className="text-2xl sm:text-3xl font-bold text-secondary-foreground mt-1">{t("painBottom2")}</p>
        </div>
        <div className="flex justify-center">
          <PrimaryCta label={t("painCta")} source="/#pain" cta="pain" className="text-base px-8 h-12" />
        </div>
      </div>
    </section>
  );
}

// ── Solution ──────────────────────────────────────────────────────────

function SolutionSection() {
  const { t } = useLandingLang();
  const items: CopyKey[] = ["sol1", "sol2", "sol3", "sol4"];
  return (
    <section id="solution" className="py-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-10">
          {t("solTitle")}
        </h2>
        <div className="space-y-3 mb-10">
          {items.map((key) => (
            <div key={key} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <span className="text-base sm:text-lg text-foreground font-medium">{t(key)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <PrimaryCta label={t("solCta")} source="/#solution" cta="solution" className="text-base px-8 h-12" />
        </div>
      </div>
    </section>
  );
}

// ── Demo / Wow ────────────────────────────────────────────────────────

function DemoSection() {
  const { t } = useLandingLang();
  return (
    <section className="py-20 px-4 sm:px-6 bg-muted/40">
      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide mb-4">
          <Eye className="h-3.5 w-3.5" /> Live preview
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          {t("demoTitle")}
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
          {t("demoText")}
        </p>
        <DashboardPreview />
        <div className="mt-10 flex justify-center">
          <PrimaryCta label={t("demoCta")} source="/#demo" cta="demo" className="text-base px-8 h-12" />
        </div>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────

function HowSection() {
  const { t } = useLandingLang();
  const steps = [
    { n: "1", label: t("how1") },
    { n: "2", label: t("how2") },
    { n: "3", label: t("how3") },
  ];
  return (
    <section id="how" className="py-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          {t("howTitle")}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="text-center p-6 rounded-2xl bg-card border border-border">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-4">
                {s.n}
              </div>
              <p className="text-lg font-semibold text-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────

function PricingSection() {
  const { t } = useLandingLang();
  const [cycle, setCycle] = useState<Cycle>("monthly");

  // Display prices (effective €/month). Plans:
  //  - Solo: €19/mo
  //  - Pro:  €49/mo
  // Quarterly ≈ -20%, Yearly ≈ -40%.
  const computed = {
    monthly:   { solo: 19,  pro: 49,  billed: t("billedMo") },
    quarterly: { solo: 15,  pro: 39,  billed: t("billedQ") },
    yearly:    { solo: 11,  pro: 29,  billed: t("billedY") },
  } as const;

  const data = computed[cycle];

  const tabs: { id: Cycle; label: string; badge?: string }[] = [
    { id: "monthly", label: t("monthly") },
    { id: "quarterly", label: t("quarterly"), badge: t("save20") },
    { id: "yearly", label: t("yearly"), badge: t("save40") },
  ];

  return (
    <BillingCycleContext.Provider value={cycle}>
    <section id="pricing" className="py-20 px-4 sm:px-6 bg-muted/40">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t("pricingTitle")}</h2>
          <p className="text-lg text-muted-foreground">{t("pricingSub")}</p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-card border border-border">
            {tabs.map((tab) => {
              const active = cycle === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setCycle(tab.id);
                    track("pricing_cycle_changed", { billing_cycle: tab.id });
                  }}
                  className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Solo */}
          <PlanCard
            plan="solo"
            name={t("soloName")}
            desc={t("soloDesc")}
            price={data.solo}
            perMonth={t("perMonth")}
            billed={data.billed}
            features={[t("soloF1"), t("soloF2"), t("soloF3"), t("soloF4")]}
            cta={t("startTrial")}
          />
          {/* Pro */}
          <PlanCard
            plan="pro"
            name={t("proName")}
            desc={t("proDesc")}
            price={data.pro}
            perMonth={t("perMonth")}
            billed={data.billed}
            features={[t("proF1"), t("proF2"), t("proF3"), t("proF4")]}
            cta={t("startTrial")}
            popular
            popularLabel={t("popular")}
          />
        </div>
      </div>
    </section>
    </BillingCycleContext.Provider>
  );
}

function PlanCard({
  plan, name, desc, price, perMonth, billed, features, cta, popular, popularLabel,
}: {
  plan: "solo" | "pro";
  name: string; desc: string; price: number; perMonth: string; billed: string;
  features: string[]; cta: string;
  popular?: boolean; popularLabel?: string;
}) {
  const { lang } = useLandingLang();
  const billing_cycle = useBillingCycle();
  return (
    <div className={`relative p-7 rounded-2xl bg-card border-2 ${
      popular ? "border-primary shadow-lg" : "border-border"
    }`}>
      {popular && popularLabel && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {popularLabel}
        </span>
      )}
      <h3 className="text-xl font-semibold text-foreground">{name}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-5">{desc}</p>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-4xl font-bold text-foreground">€{price}</span>
        <span className="text-muted-foreground text-base">{perMonth}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-6">{billed}</p>
      <ul className="space-y-2.5 mb-7">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-3 text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm">{f}</span>
          </li>
        ))}
      </ul>
      <Link
        to={`/auth?plan=${plan}_${billing_cycle}`}
        onClick={() =>
          track("cta_clicked", {
            source_page: `/#pricing-${billing_cycle}-${plan}`,
            cta: "pricing_plan",
            plan_type: plan,
            billing_cycle,
            lang,
          })
        }
        className="block"
      >
        <Button className="w-full h-11 gap-2" variant={popular ? "default" : "outline"}>
          {cta} <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

// ── Trust ─────────────────────────────────────────────────────────────

function TrustSection() {
  const { t } = useLandingLang();
  const items: CopyKey[] = ["trust1", "trust2", "trust3"];
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-5">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-8">{t("trustTitle")}</h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {items.map((key) => (
            <div key={key} className="p-5 rounded-xl bg-card border border-border">
              <CheckCircle2 className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-base text-foreground font-medium">{t(key)}</p>
            </div>
          ))}
        </div>
        <PrimaryCta label={t("trustCta")} source="/#trust" cta="trust" className="text-base px-8 h-12" />
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────

function FinalCTA() {
  const { t } = useLandingLang();
  return (
    <section className="py-24 px-4 sm:px-6 bg-secondary">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-5xl font-bold text-secondary-foreground leading-[1.15] mb-3">
          {t("finalTitle1")}
          <br />
          <span className="text-primary">{t("finalTitle2")}</span>
        </h2>
        <div className="mt-8 flex justify-center">
          <PrimaryCta label={t("startTrial")} source="/" cta="final" className="text-base px-8 h-12" />
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  useEffect(() => {
    track("landing_view");
  }, []);

  return (
    <LandingLangProvider>
      <div className="min-h-screen bg-background">
        <LandingNav />
        <HeroSection />
        <PainSection />
        <SolutionSection />
        <DemoSection />
        <HowSection />
        <PricingSection />
        <TrustSection />
        <FinalCTA />
        <PublicFooter />
      </div>
    </LandingLangProvider>
  );
}
