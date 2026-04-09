import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Calendar, DollarSign, Target,
  CheckCircle2, ArrowRight, MessageSquareQuote, Zap,
  ChevronRight, BarChart3, Shield, Clock,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

function LandingNav() {
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
          <Link to="/auth">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/auth">
            <Button size="sm">Start free trial</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
          <Zap className="h-3.5 w-3.5" />
          Built by a solo professional, for solo professionals
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1] mb-6">
          Run your solo business.{" "}
          <span className="text-primary">Don't guess it.</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Manage clients, track sessions, and understand your income in one simple system.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/auth">
            <Button size="lg" className="text-base px-8 h-12 gap-2">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          7 days free. Then 20€/month. Cancel anytime.
        </p>
      </div>
    </section>
  );
}

const PROBLEMS = [
  { icon: MessageSquareQuote, text: "I don't know which sessions are paid" },
  { icon: MessageSquareQuote, text: "I track everything manually" },
  { icon: MessageSquareQuote, text: "I don't know my real income" },
  { icon: MessageSquareQuote, text: "I don't know if my pricing is right" },
];

function ProblemSection() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-secondary">
      <div className="max-w-4xl mx-auto">
        <p className="text-sm font-medium text-primary mb-3 text-center">Sound familiar?</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-secondary-foreground text-center mb-12">
          The daily struggle of solo professionals
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {PROBLEMS.map((p, i) => (
            <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-accent/50 border border-sidebar-border">
              <p.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-secondary-foreground/90 font-medium">"{p.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const SOLUTIONS = [
  "Manage clients and sessions",
  "Track income and expenses",
  "See real profitability",
  "Understand your business",
];

function SolutionSection() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <p className="text-sm font-medium text-primary mb-3 text-center">The solution</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          With SoloBizz, you finally see the full picture
        </h2>
        <div className="max-w-lg mx-auto space-y-4">
          {SOLUTIONS.map((s, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <span className="text-foreground font-medium">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: LayoutDashboard, title: "Dashboard", desc: "See income, expenses, taxes, and profit in one place" },
  { icon: Users, title: "Clients", desc: "Track client history and notes" },
  { icon: Calendar, title: "Calendar", desc: "Manage sessions and scheduling" },
  { icon: DollarSign, title: "Finance", desc: "Track income, expenses, and taxes" },
  { icon: Target, title: "Business Insights", desc: "Understand your break-even and goals" },
  { icon: BarChart3, title: "Reports", desc: "See what's working and what's not" },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 bg-muted/50">
      <div className="max-w-5xl mx-auto">
        <p className="text-sm font-medium text-primary mb-3 text-center">Features</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          Everything you need. Nothing you don't.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="p-6 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { step: "1", title: "Add services & expenses", desc: "Set up what you offer and your fixed costs" },
  { step: "2", title: "Add clients & sessions", desc: "Log your appointments and track payments" },
  { step: "3", title: "See your business clearly", desc: "Understand revenue, profitability, and growth" },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <p className="text-sm font-medium text-primary mb-3 text-center">How it works</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
          Up and running in minutes
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-4">
                {s.step}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
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

function FounderSection() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-secondary">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm font-medium text-primary mb-3 text-center">What is Solo.Bizz?</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-secondary-foreground text-center mb-10">
          Built by a practitioner, for practitioners
        </h2>
        <div className="p-8 sm:p-10 rounded-2xl bg-accent/40 border border-sidebar-border space-y-5 text-secondary-foreground/90 leading-relaxed">
          <p>Solo.Bizz is a business management app designed for professionals who work with people through appointments, sessions, and client-based services.</p>
          <p>The idea came from the founder's personal experience. After many years in IT — building ERP systems, working as a Product Manager, and helping create complex digital products — a severe burnout led to a career change into psychology.</p>
          <p>That's when a familiar problem appeared: it's very hard to organize your workday when everything is scattered across different tools. Sessions in one place, payments in another, notes somewhere else, and client history stored separately. Whenever you need to quickly understand whether a client is attending regularly, see overall dynamics, check payments, or bring all the information together — it takes too much time and energy.</p>
          <p>That was the moment the first profession could help the second one.</p>
          <p className="text-primary font-semibold">This is how Solo.Bizz was created — a tool that brings appointments, sessions, clients, payments, notes, and work analytics together in one place.</p>
          <p>Solo.Bizz is useful for anyone whose work is built around client sessions and appointments — psychologists, coaches, consultants, beauty professionals, nail technicians, and many other specialists whose business depends on one-to-one client work.</p>
          <p className="font-medium text-secondary-foreground">A product created by a practitioner for practitioners — to make working with people simpler, clearer, and easier to manage.</p>
        </div>
      </div>
    </section>
  );
}

const PLANS = [
  { name: "Monthly", price: "20€", period: "/month", savings: null, popular: false },
  { name: "Quarterly", price: "50€", period: "/3 months", savings: "Save 17%", popular: true },
  { name: "Yearly", price: "200€", period: "/year", savings: "Save 17%", popular: false },
];

const PLAN_FEATURES = [
  "Full access to all features",
  "Unlimited clients & sessions",
  "Financial insights & reports",
  "Cancel anytime",
];

function PricingSection() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-sm font-medium text-primary mb-3">Pricing</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Simple, transparent pricing
        </h2>
        <p className="text-muted-foreground mb-12">No hidden fees. No surprises. 7-day free trial on all plans.</p>

        <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {PLANS.map((plan, i) => (
            <div
              key={i}
              className={`relative p-8 rounded-2xl bg-card border-2 ${
                plan.popular ? "border-primary shadow-lg scale-[1.03]" : "border-border"
              } transition-shadow`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground mb-1">{plan.name}</h3>
              {plan.savings && (
                <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                  {plan.savings}
                </span>
              )}
              <div className="flex items-baseline justify-center gap-1 mb-1 mt-2">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">after 7-day free trial</p>
              <ul className="space-y-3 text-left mb-8">
                {PLAN_FEATURES.map((item, j) => (
                  <li key={j} className="flex items-center gap-3 text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button className={`w-full h-11 text-sm gap-2 ${plan.popular ? "" : "variant-outline"}`} variant={plan.popular ? "default" : "outline"}>
                  Start free trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-6">No credit card required to start</p>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-secondary">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-secondary-foreground mb-4">
          Start running your business today.
        </h2>
        <p className="text-secondary-foreground/70 mb-8">
          Join solo professionals who finally understand their business.
        </p>
        <Link to="/auth">
          <Button size="lg" className="text-base px-8 h-12 gap-2">
            Start free trial <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

const AUDIENCES = [
  "Psychologists", "Massage therapists", "Beauty specialists",
  "Nail technicians", "Coaches", "Freelancers",
];

function AudienceSection() {
  return (
    <section className="py-16 px-4 sm:px-6 bg-muted/30">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-sm font-medium text-primary mb-3">Who it's for</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
          Built for session-based professionals
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {AUDIENCES.map((a, i) => (
            <span key={i} className="px-4 py-2 rounded-full bg-card border border-border text-sm font-medium text-foreground">
              {a}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-10 px-4 sm:px-6 border-t border-border bg-background">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} SoloBizz. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Terms & Conditions
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
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
  );
}
