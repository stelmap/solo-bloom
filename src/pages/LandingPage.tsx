import { useState, useCallback, createContext, useContext } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { translations, Language, TranslationKey } from "@/i18n/translations";
import {
  LayoutDashboard, Users, Calendar, DollarSign, Target,
  CheckCircle2, ArrowRight, MessageSquareQuote, Zap,
  ChevronRight, BarChart3,
} from "lucide-react";


// ── Lightweight i18n for the public landing page ──────────────────────

const LandingLangContext = createContext<{
  lang: Language;
  t: (key: TranslationKey) => string;
  toggle: () => void;
}>({ lang: "en", t: (k) => k, toggle: () => {} });

function useLandingLang() {
  return useContext(LandingLangContext);
}

function LandingLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    const stored = localStorage.getItem("landing_lang");
    return stored === "uk" ? "uk" : "en";
  });

  const toggle = useCallback(() => {
    setLang((prev) => {
      const next = prev === "en" ? "uk" : "en";
      localStorage.setItem("landing_lang", next);
      return next;
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const entry = translations[key];
      if (!entry) return key;
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

// ── Nav ───────────────────────────────────────────────────────────────

function LandingNav() {
  const { lang, t, toggle } = useLandingLang();

  const NAV_LINKS = [
    { label: t("landing.nav.features"), href: "#features" },
    { label: t("landing.nav.howItWorks"), href: "#how-it-works" },
    { label: t("landing.nav.pricing"), href: "#pricing" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-foreground tracking-tight">
          Solo<span className="text-primary">Bizz</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
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
          >
            {lang === "en" ? "🇺🇦 UA" : "🇬🇧 EN"}
          </button>
          <Link to="/auth">
            <Button variant="ghost" size="sm">{t("landing.nav.login")}</Button>
          </Link>
          <Link to="/auth">
            <Button size="sm">{t("landing.nav.startTrial")}</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────

function HeroSection() {
  const { t } = useLandingLang();
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-base font-medium mb-8">
          <Zap className="h-3.5 w-3.5" />
          {t("landing.hero.badge")}
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1] mb-6">
          {t("landing.hero.title1")}{" "}
          <span className="text-primary">{t("landing.hero.title2")}</span>
        </h1>
        <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          {t("landing.hero.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/auth">
            <Button size="lg" className="text-base px-8 h-12 gap-2">
              {t("landing.hero.cta")} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <p className="text-base text-muted-foreground mt-4">
          {t("landing.hero.subtext")}
        </p>
      </div>
    </section>
  );
}

// ── Audience ──────────────────────────────────────────────────────────

function AudienceSection() {
  const { t } = useLandingLang();
  const AUDIENCES: TranslationKey[] = [
    "landing.audience.psychologists", "landing.audience.massage", "landing.audience.beauty",
    "landing.audience.nails", "landing.audience.coaches", "landing.audience.freelancers",
  ];
  return (
    <section className="py-16 px-4 sm:px-6 bg-muted/30">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-base font-medium text-primary mb-3">{t("landing.audience.label")}</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-8">
          {t("landing.audience.title")}
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {AUDIENCES.map((key) => (
            <span key={key} className="px-5 py-2.5 rounded-full bg-card border border-border text-base font-medium text-foreground">
              {t(key)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Problem ──────────────────────────────────────────────────────────

function ProblemSection() {
  const { t } = useLandingLang();
  const PROBLEMS: TranslationKey[] = [
    "landing.problem.1", "landing.problem.2", "landing.problem.3", "landing.problem.4",
  ];
  return (
    <section className="py-20 px-4 sm:px-6 bg-secondary">
      <div className="max-w-4xl mx-auto">
        <p className="text-base font-medium text-primary mb-3 text-center">{t("landing.problem.label")}</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-secondary-foreground text-center mb-12">
          {t("landing.problem.title")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {PROBLEMS.map((key) => (
            <div key={key} className="flex items-start gap-4 p-5 rounded-xl bg-accent/50 border border-sidebar-border">
              <MessageSquareQuote className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-base text-secondary-foreground/90 font-medium">"{t(key)}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Solution ─────────────────────────────────────────────────────────

function SolutionSection() {
  const { t } = useLandingLang();
  const SOLUTIONS: TranslationKey[] = [
    "landing.solution.1", "landing.solution.2", "landing.solution.3", "landing.solution.4",
  ];
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <p className="text-base font-medium text-primary mb-3 text-center">{t("landing.solution.label")}</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          {t("landing.solution.title")}
        </h2>
        <div className="max-w-lg mx-auto space-y-4">
          {SOLUTIONS.map((key) => (
            <div key={key} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <span className="text-base text-foreground font-medium">{t(key)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────

function FeaturesSection() {
  const { t } = useLandingLang();
  const FEATURES = [
    { icon: LayoutDashboard, title: t("landing.features.dashboard"), desc: t("landing.features.dashboardDesc") },
    { icon: Users, title: t("landing.features.clients"), desc: t("landing.features.clientsDesc") },
    { icon: Calendar, title: t("landing.features.calendar"), desc: t("landing.features.calendarDesc") },
    { icon: DollarSign, title: t("landing.features.finance"), desc: t("landing.features.financeDesc") },
    { icon: Target, title: t("landing.features.insights"), desc: t("landing.features.insightsDesc") },
    { icon: BarChart3, title: t("landing.features.reports"), desc: t("landing.features.reportsDesc") },
  ];
  return (
    <section id="features" className="py-20 px-4 sm:px-6 bg-muted/50">
      <div className="max-w-5xl mx-auto">
        <p className="text-base font-medium text-primary mb-3 text-center">{t("landing.features.label")}</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          {t("landing.features.title")}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="p-6 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-base text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works ─────────────────────────────────────────────────────

function HowItWorksSection() {
  const { t } = useLandingLang();
  const STEPS = [
    { step: "1", title: t("landing.howItWorks.step1Title"), desc: t("landing.howItWorks.step1Desc") },
    { step: "2", title: t("landing.howItWorks.step2Title"), desc: t("landing.howItWorks.step2Desc") },
    { step: "3", title: t("landing.howItWorks.step3Title"), desc: t("landing.howItWorks.step3Desc") },
  ];
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <p className="text-base font-medium text-primary mb-3 text-center">{t("landing.howItWorks.label")}</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          {t("landing.howItWorks.title")}
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-4">
                {s.step}
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-base text-muted-foreground">{s.desc}</p>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-5 w-5 text-muted-foreground/40 mx-auto mt-4 hidden md:block rotate-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Founder / About ──────────────────────────────────────────────────

function FounderSection() {
  const { t } = useLandingLang();
  return (
    <section className="py-20 px-4 sm:px-6 bg-secondary">
      <div className="max-w-3xl mx-auto">
        <p className="text-base font-medium text-primary mb-3 text-center">{t("landing.founder.label")}</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-secondary-foreground text-center mb-10">
          {t("landing.founder.title")}
        </h2>
        <div className="p-8 sm:p-10 rounded-2xl bg-accent/40 border border-sidebar-border space-y-5 text-secondary-foreground/90 text-lg leading-relaxed">
          <p>{t("landing.founder.p1")}</p>
          <p>{t("landing.founder.p2")}</p>
          <p>{t("landing.founder.p3")}</p>
          <p>{t("landing.founder.p4")}</p>
          <p className="text-primary font-semibold">{t("landing.founder.p5")}</p>
          <p>{t("landing.founder.p6")}</p>
          <p className="font-medium text-secondary-foreground">{t("landing.founder.p7")}</p>
        </div>
      </div>
    </section>
  );
}

// ── Pricing ──────────────────────────────────────────────────────────

function PricingSection() {
  const { t } = useLandingLang();

  const PLANS = [
    { name: t("landing.pricing.monthly"), price: "20€", period: t("landing.pricing.perMonth"), savings: null, popular: false, planId: "monthly" },
    { name: t("landing.pricing.quarterly"), price: "50€", period: t("landing.pricing.per3Months"), savings: t("landing.pricing.save17"), popular: true, planId: "quarterly" },
    { name: t("landing.pricing.yearly"), price: "200€", period: t("landing.pricing.perYear"), savings: t("landing.pricing.save17"), popular: false, planId: "yearly" },
  ];

  const PLAN_FEATURES: TranslationKey[] = [
    "landing.pricing.feature1", "landing.pricing.feature2",
    "landing.pricing.feature3", "landing.pricing.feature4",
  ];

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-base font-medium text-primary mb-3">{t("landing.pricing.label")}</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          {t("landing.pricing.title")}
        </h2>
        <p className="text-lg text-muted-foreground mb-12">{t("landing.pricing.subtitle")}</p>

        <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {PLANS.map((plan, i) => (
            <div
              key={i}
              className={`relative p-8 rounded-2xl bg-card border-2 ${
                plan.popular ? "border-primary shadow-lg scale-[1.03]" : "border-border"
              } transition-shadow`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {t("landing.pricing.mostPopular")}
                </span>
              )}
              <h3 className="text-xl font-semibold text-foreground mb-1">{plan.name}</h3>
              {plan.savings && (
                <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
                  {plan.savings}
                </span>
              )}
              <div className="flex items-baseline justify-center gap-1 mb-1 mt-2">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground text-base">{plan.period}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{t("landing.pricing.afterTrial")}</p>
              <ul className="space-y-3 text-left mb-8">
                {PLAN_FEATURES.map((key) => (
                  <li key={key} className="flex items-center gap-3 text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-base">{t(key)}</span>
                  </li>
                ))}
              </ul>
              <Link to={`/auth?plan=${plan.planId}`}>
                <Button className={`w-full h-11 text-base gap-2`} variant={plan.popular ? "default" : "outline"}>
                  {t("landing.hero.cta")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
        <p className="text-base text-muted-foreground mt-6">{t("landing.pricing.noCreditCard")}</p>
      </div>
    </section>
  );
}

// ── Final CTA ────────────────────────────────────────────────────────

function FinalCTA() {
  const { t } = useLandingLang();
  return (
    <section className="py-20 px-4 sm:px-6 bg-secondary">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-secondary-foreground mb-4">
          {t("landing.cta.title")}
        </h2>
        <p className="text-lg text-secondary-foreground/70 mb-8">
          {t("landing.cta.subtitle")}
        </p>
        <Link to="/auth">
          <Button size="lg" className="text-base px-8 h-12 gap-2">
            {t("landing.hero.cta")} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────

function Footer() {
  const { t } = useLandingLang();
  return (
    <footer className="py-10 px-4 sm:px-6 border-t border-border bg-background">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-base text-muted-foreground">
          © {new Date().getFullYear()} SoloBizz. {t("landing.footer.rights")}
        </p>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="text-base text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.footer.privacy")}
          </Link>
          <Link to="/terms" className="text-base text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.footer.terms")}
          </Link>
        </div>
      </div>
    </footer>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <LandingLangProvider>
      <div className="min-h-screen bg-background">
        <LandingNav />
        <HeroSection />
        <AudienceSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <HowItWorksSection />
        <FounderSection />
        <PricingSection />
        <FinalCTA />
        <Footer />
      </div>
    </LandingLangProvider>
  );
}
