import { ArrowRight, BarChart3, Check, CreditCard, Euro, Link2, UserCircle2, X } from "lucide-react";
import type { AppLanguage } from "@/i18n/translations";
import { lt, type LandingCopyKey } from "@/lib/landingRedesignCopy";

const STEPS: { key: LandingCopyKey; icon: typeof Check }[] = [
  { key: "step1", icon: Link2 },
  { key: "step2", icon: Check },
  { key: "step3", icon: UserCircle2 },
  { key: "step4", icon: CreditCard },
  { key: "step5", icon: Euro },
  { key: "step6", icon: BarChart3 },
];

const BEFORE: LandingCopyKey[] = ["before1", "before2", "before3", "before4"];
const AFTER: LandingCopyKey[] = ["after1", "after2", "after3", "after4"];

/** Connected workflow (booking → session → payment → report) + before/after. */
export function WorkflowSection({ lang }: { lang: AppLanguage }) {
  return (
    <section id="workflow" className="bg-muted/30 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary">{lt(lang, "workflowEyebrow")}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{lt(lang, "workflowTitle")}</h2>
        </div>

        <ol className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STEPS.map((step) => (
            <li key={step.key} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <step.icon className="h-4 w-4 text-primary" />
              </span>
              <strong className="text-xs font-semibold leading-snug text-foreground sm:text-sm">{lt(lang, step.key)}</strong>
            </li>
          ))}
        </ol>

        <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-2xl border border-border bg-card p-6">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{lt(lang, "beforeLabel")}</span>
            <h3 className="mt-2 text-lg font-bold text-foreground">{lt(lang, "beforeTitle")}</h3>
            <ul className="mt-4 space-y-2">
              {BEFORE.map((k) => (
                <li key={k} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                  {lt(lang, k)}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-center">
            <ArrowRight aria-hidden="true" className="h-6 w-6 rotate-90 text-muted-foreground lg:rotate-0" />
          </div>
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">{lt(lang, "afterLabel")}</span>
            <h3 className="mt-2 text-lg font-bold text-foreground">{lt(lang, "afterTitle")}</h3>
            <ul className="mt-4 space-y-2">
              {AFTER.map((k) => (
                <li key={k} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  {lt(lang, k)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WorkflowSection;
