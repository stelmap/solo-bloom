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
    <section className="w-full py-12 sm:py-16" style={{ paddingInline: "clamp(16px, 4vw, 64px)" }}>
      <div className="mx-auto w-full" style={{ width: "min(92vw, 1720px)", maxWidth: "100%" }}>
        <div
          className="relative overflow-hidden rounded-3xl border border-primary/20 bg-orange-50/50"
          style={{ padding: "clamp(20px, 3vw, 56px)" }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 rounded-bl-full bg-primary/10"
            style={{ width: "clamp(90px, 12vw, 220px)", height: "clamp(90px, 12vw, 220px)" }}
          />

          <h2 className="relative text-2xl font-bold tracking-tight text-foreground sm:text-3xl xl:text-4xl">
            {lt(lang, "outcomeTitle")}
          </h2>

          <ul
            className="relative mt-8 grid grid-cols-1 items-stretch lg:grid-cols-[1fr_auto_1fr_auto_1fr]"
            style={{ gap: "clamp(12px, 1.6vw, 28px)" }}
          >
            {CARDS.map((card, i) => (
              <li key={card.title} className="contents">
                <div
                  className="flex h-full items-start gap-4 rounded-2xl border border-primary/15 bg-card shadow-sm"
                  style={{ padding: "clamp(16px, 1.6vw, 28px)" }}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <card.icon className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <strong className="block text-base font-bold leading-snug text-foreground">
                      {lt(lang, card.title)}
                    </strong>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{lt(lang, card.text)}</p>
                  </div>
                </div>
                {i < CARDS.length - 1 && (
                  <div aria-hidden="true" className="flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 rotate-90 text-primary lg:rotate-0" strokeWidth={1.75} />
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
