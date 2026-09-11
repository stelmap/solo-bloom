import { useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronDown, Sparkles, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  ONBOARDING_STEP_KEYS,
  useOnboardingJourney,
  useSetOnboardingState,
  type OnboardingStepKey,
} from "@/hooks/useOnboardingJourney";

/** Deep links for each guided step. */
const STEP_TARGET: Record<OnboardingStepKey, string> = {
  practice: "/settings/practice",
  session: "/calendar?new=1",
  paid: "/calendar",
  unpaid: "/calendar",
  day: "/dashboard#today",
  finance: "/finances/overview",
  expense: "/finances/expenses?new=1",
};

/** Secondary "see the result" link, shown once the step is completed. */
const STEP_RESULT: Partial<Record<OnboardingStepKey, { path: string; key: string; okKey: string }>> = {
  paid: { path: "/finances/income", key: "onbj.s3link", okKey: "onbj.s3ok" },
  unpaid: { path: "/finances/payment-audit", key: "onbj.s4link", okKey: "onbj.s4ok" },
};

const HIDDEN_PREFIXES = ["/auth", "/onboarding", "/book", "/agreement", "/confirm"];

export function OnboardingWidget() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, done, completedCount, total, allDone, currentStep, dismissed, minimized } =
    useOnboardingJourney();
  const { patch } = useSetOnboardingState();

  if (loading || dismissed) return null;
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  const stepIndex = (k: OnboardingStepKey) => ONBOARDING_STEP_KEYS.indexOf(k) + 1;

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => patch({ minimized: false })}
        aria-label={t("onbj.expand")}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-lg hover:bg-accent"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        {t("onbj.mini", { done: completedCount, total })}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {allDone ? t("onbj.doneTitle") : t("onbj.title")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {allDone ? t("onbj.doneSub") : t("onbj.sub")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => patch({ minimized: true })}
            aria-label={t("onbj.minimize")}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => patch({ dismissed: true })}
            aria-label={t("onbj.hide")}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {allDone ? (
        <div className="p-4">
          <Button
            className="w-full"
            onClick={() => {
              patch({ dismissed: true });
              navigate("/dashboard");
            }}
          >
            {t("onbj.doneCta")}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-1.5 px-4 pt-3">
            <Progress value={(completedCount / total) * 100} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {t("onbj.progress", { done: completedCount, total })}
            </p>
          </div>

          <div className="max-h-[52vh] space-y-2 overflow-y-auto p-4">
            {ONBOARDING_STEP_KEYS.map((key) => {
              const isDone = done[key];
              const isCurrent = key === currentStep;
              const n = stepIndex(key);
              const result = STEP_RESULT[key];
              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    isCurrent
                      ? "border-primary bg-primary/5"
                      : isDone
                        ? "border-border bg-muted/40"
                        : "border-border bg-card opacity-80",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                        isDone
                          ? "bg-primary text-primary-foreground"
                          : isCurrent
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isDone ? <Check className="h-3 w-3" /> : n}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium text-foreground",
                          isDone && "line-through decoration-muted-foreground/50",
                        )}
                      >
                        {t(`onbj.s${n}t`)}
                      </p>
                      {(isCurrent || !isDone) && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{t(`onbj.s${n}d`)}</p>
                      )}
                      {isDone && result && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{t(result.okKey)}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {!isDone && (
                          <Button
                            size="sm"
                            variant={isCurrent ? "default" : "outline"}
                            onClick={() => navigate(STEP_TARGET[key])}
                          >
                            {t(`onbj.s${n}c`)}
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isDone && result && (
                          <Button size="sm" variant="ghost" onClick={() => navigate(result.path)}>
                            {t(result.key)}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
