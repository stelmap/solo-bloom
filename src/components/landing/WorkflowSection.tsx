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
    <section
      id="workflow"
      className="bg-muted/30 py-16 sm:py-20"
      style={{ paddingInline: "clamp(16px, 4vw, 64px)" }}
    >
      <div className="mx-auto w-full" style={{ width: "min(92vw, 1720px)", maxWidth: "100%" }}>
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary">{lt(lang, "workflowEyebrow")}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{lt(lang, "workflowTitle")}</h2>
        </div>

        <ol
          className="mb-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
          style={{ gap: "clamp(12px, 1.4vw, 24px)" }}
        >
          {STEPS.map((step) => (
            <li key={step.key} className="flex h-full flex-col items-center justify-start gap-3 rounded-xl border border-border bg-card text-center"
              style={{ padding: "clamp(16px, 1.6vw, 28px)" }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 xl:h-12 xl:w-12">
                <step.icon className="h-5 w-5 text-primary xl:h-6 xl:w-6" />
              </span>
              <strong className="text-sm font-semibold leading-snug text-foreground xl:text-base">{lt(lang, step.key)}</strong>
            </li>
          ))}
        </ol>

        <div className="grid items-stretch lg:grid-cols-[1fr_auto_1fr]" style={{ gap: "clamp(16px, 2vw, 32px)" }}>
          <div className="rounded-2xl border border-border bg-card" style={{ padding: "clamp(20px, 2vw, 40px)" }}>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{lt(lang, "beforeLabel")}</span>
            <h3 className="mt-2 text-lg font-bold text-foreground xl:text-xl">{lt(lang, "beforeTitle")}</h3>
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
          <div className="rounded-2xl border border-primary/40 bg-primary/5" style={{ padding: "clamp(20px, 2vw, 40px)" }}>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">{lt(lang, "afterLabel")}</span>
            <h3 className="mt-2 text-lg font-bold text-foreground xl:text-xl">{lt(lang, "afterTitle")}</h3>
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
