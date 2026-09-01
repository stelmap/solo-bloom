import { ArrowRight, CalendarDays, Clock, Users } from "lucide-react";
import type { AppLanguage } from "@/i18n/translations";
import { lt, type LandingCopyKey } from "@/lib/landingRedesignCopy";

const ITEMS: { icon: typeof Clock; title: LandingCopyKey; text: LandingCopyKey }[] = [
  { icon: CalendarDays, title: "outcome1Title", text: "outcome1Text" },
  { icon: Users, title: "outcome2Title", text: "outcome2Text" },
  { icon: Clock, title: "outcome3Title", text: "outcome3Text" },
];

/** Compact "From routine to result" value strip. */
export function OutcomeStrip({ lang }: { lang: AppLanguage }) {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-8 text-center text-2xl font-bold text-foreground sm:text-3xl">
          {lt(lang, "outcomeTitle")}
        </h2>
        <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center">
          {ITEMS.map((item, i) => (
            <div key={item.title} className="flex flex-1 items-center gap-4">
              <div className="flex flex-1 items-start gap-3 rounded-2xl border border-border bg-card p-5">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <strong className="block text-base font-semibold text-foreground">{lt(lang, item.title)}</strong>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{lt(lang, item.text)}</span>
                </div>
              </div>
              {i < ITEMS.length - 1 && (
                <ArrowRight aria-hidden="true" className="hidden h-5 w-5 shrink-0 text-muted-foreground md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default OutcomeStrip;
