import { ArrowRight, CalendarDays, Clock, Users } from "lucide-react";
import type { AppLanguage } from "@/i18n/translations";
import { lt, type LandingCopyKey } from "@/lib/landingRedesignCopy";

const CARDS: { icon: typeof Clock; title: LandingCopyKey; text: LandingCopyKey }[] = [
  { icon: CalendarDays, title: "outcome1Title", text: "outcome1Text" },
  { icon: Users, title: "outcome2Title", text: "outcome2Text" },
  { icon: Clock, title: "outcome3Title", text: "outcome3Text" },
];

/** "From routine to result" — three connected benefit cards, shown right after the hero. */
export function OutcomeStrip({ lang }: { lang: AppLanguage }) {
  return (
    <section className="landing-section landing-section-tight">
      <div className="page-container">
        <div
          className="relative overflow-hidden rounded-3xl border-2 border-primary/40 bg-primary/5 shadow-sm"
          style={{ padding: "clamp(20px, 3vw, 56px)" }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 rounded-bl-full bg-primary/20"
            style={{ width: "clamp(90px, 12vw, 220px)", height: "clamp(90px, 12vw, 220px)" }}
          />

          <h2 className="landing-h2 relative mx-auto max-w-[60ch] text-center font-bold tracking-tight text-secondary">
            {lt(lang, "outcomeTitle")}
          </h2>
          <span
            aria-hidden="true"
            className="relative mx-auto mt-4 block h-1 w-16 rounded-full bg-primary"
          />


          <ul
            className="relative mt-8 grid grid-cols-1 items-stretch lg:grid-cols-[1fr_auto_1fr_auto_1fr]"
            style={{ gap: "clamp(12px, 1.6vw, 28px)" }}
          >
            {CARDS.map((card, i) => (
              <li key={card.title} className="contents">
                <div
                  className="flex h-full items-start gap-4 rounded-2xl border border-border bg-card shadow-md ring-1 ring-secondary/5"
                  style={{ padding: "clamp(16px, 1.6vw, 28px)" }}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <card.icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <strong className="block text-base font-bold leading-snug text-secondary">
                      {lt(lang, card.title)}
                    </strong>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/70">{lt(lang, card.text)}</p>
                  </div>
                </div>
                {i < CARDS.length - 1 && (
                  <div aria-hidden="true" className="flex items-center justify-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/40">
                      <ArrowRight className="h-5 w-5 rotate-90 text-primary lg:rotate-0" strokeWidth={2.5} />
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
