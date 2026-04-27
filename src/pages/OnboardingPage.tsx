import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CircleDollarSign, Sparkles, Target, UserPlus, Users, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { track } from "@/lib/analytics";

const ONBOARDING_STATE_KEY = "psych_onboarding_state_v1";
const ONBOARDING_STARTED_KEY = "psych_onboarding_started_v1";

type PracticeType = "individual" | "groups" | null;
type PainPoint = "income" | "clients" | "workflow" | "sessions" | null;
type Goal = "control" | "more_clients" | "stable_income" | null;
type Stage = "entry" | "value" | "setup" | "action" | "impact";

type OnboardingState = {
  stage: Stage;
  substep: number;
  practiceType: PracticeType;
  painPoint: PainPoint;
  goal: Goal;
  clientName: string;
  sessionDate: string;
  sessionTime: string;
  price: string;
  savedImpact: { clients: number; sessions: number; income: number } | null;
};

const VALUE_SCREEN_KEYS = ["one", "two", "three"] as const;
const STEPS = ["Entry", "Value", "Setup", "Action", "Impact"];

const practiceOptions: Array<{ value: Exclude<PracticeType, null>; labelKey: string }> = [
  { value: "individual", labelKey: "onboarding.practice.individual" },
  { value: "groups", labelKey: "onboarding.practice.groups" },
];

const painOptions: Array<{ value: Exclude<PainPoint, null>; labelKey: string }> = [
  { value: "income", labelKey: "onboarding.pain.income" },
  { value: "clients", labelKey: "onboarding.pain.clients" },
  { value: "workflow", labelKey: "onboarding.pain.workflow" },
  { value: "sessions", labelKey: "onboarding.pain.sessions" },
];

const goalOptions: Array<{ value: Exclude<Goal, null>; labelKey: string }> = [
  { value: "control", labelKey: "onboarding.goal.control" },
  { value: "more_clients", labelKey: "onboarding.goal.moreClients" },
  { value: "stable_income", labelKey: "onboarding.goal.stableIncome" },
];

const defaultState = (): OnboardingState => ({
  stage: "entry",
  substep: 0,
  practiceType: null,
  painPoint: null,
  goal: null,
  clientName: "",
  sessionDate: new Date().toISOString().split("T")[0],
  sessionTime: "10:00",
  price: "",
  savedImpact: null,
});

const loadStoredState = (): OnboardingState => {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = sessionStorage.getItem(ONBOARDING_STATE_KEY) || localStorage.getItem(ONBOARDING_STATE_KEY);
    return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
  } catch {
    return defaultState();
  }
};

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { symbol } = useCurrency();
  const { t, lang } = useLanguage();
  const initialState = useMemo(() => loadStoredState(), []);

  const [showSplash, setShowSplash] = useState(true);
  const [stage, setStage] = useState<Stage>(initialState.stage);
  const [substep, setSubstep] = useState(initialState.substep);
  const [saving, setSaving] = useState(false);
  const [practiceType, setPracticeType] = useState<PracticeType>(initialState.practiceType);
  const [painPoint, setPainPoint] = useState<PainPoint>(initialState.painPoint);
  const [goal, setGoal] = useState<Goal>(initialState.goal);
  const [clientName, setClientName] = useState(initialState.clientName);
  const [sessionDate, setSessionDate] = useState(initialState.sessionDate);
  const [sessionTime, setSessionTime] = useState(initialState.sessionTime);
  const [price, setPrice] = useState(initialState.price);
  const [savedImpact, setSavedImpact] = useState(initialState.savedImpact);
  const stepStartedAt = useRef(Date.now());
  const persistAfterLoginRef = useRef(false);

  const stateSnapshot = useMemo<OnboardingState>(() => ({
    stage, substep, practiceType, painPoint, goal, clientName, sessionDate, sessionTime, price, savedImpact,
  }), [stage, substep, practiceType, painPoint, goal, clientName, sessionDate, sessionTime, price, savedImpact]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowSplash(false), 1400);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(stateSnapshot));
      localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(stateSnapshot));
    } catch {}
  }, [stateSnapshot]);

  useEffect(() => {
    if (!sessionStorage.getItem(ONBOARDING_STARTED_KEY)) {
      sessionStorage.setItem(ONBOARDING_STARTED_KEY, "1");
      track("onboarding_started", { lang });
    }
  }, [lang]);

  useEffect(() => {
    const stepId = `${stage}_${substep}`;
    stepStartedAt.current = Date.now();
    track("onboarding_step_viewed", { step_id: stepId, lang });
    return () => {
      track("onboarding_dropped", { step_id: stepId, time_ms: Date.now() - stepStartedAt.current, lang });
    };
  }, [stage, substep, lang]);

  const activeStepIndex = useMemo(() => STEPS.indexOf(stage === "entry" ? "Entry" : stage[0].toUpperCase() + stage.slice(1)), [stage]);

  const recordOption = (question_id: string, option: string) => {
    track("onboarding_option_selected", { question_id, option, lang });
  };

  const moveTo = (nextStage: Stage, nextSubstep = 0) => {
    setStage(nextStage);
    setSubstep(nextSubstep);
  };

  const next = () => {
    if (stage === "value") {
      if (substep < VALUE_SCREEN_KEYS.length - 1) setSubstep((s) => s + 1);
      else moveTo("setup");
      return;
    }
    if (stage === "setup") {
      if (substep < 2) setSubstep((s) => s + 1);
      else moveTo("action");
      return;
    }
    if (stage === "action" && substep < 2) setSubstep((s) => s + 1);
  };

  const back = () => {
    if (stage === "impact" || saving) return;
    if (substep > 0) {
      setSubstep((s) => s - 1);
      return;
    }
    if (stage === "value") moveTo("entry");
    else if (stage === "setup") moveTo("value", VALUE_SCREEN_KEYS.length - 1);
    else if (stage === "action") moveTo("setup", 2);
  };

  const canContinue = () => {
    if (stage === "setup") {
      if (substep === 0) return Boolean(practiceType);
      if (substep === 1) return Boolean(painPoint);
      if (substep === 2) return Boolean(goal);
    }
    if (stage === "action") {
      if (substep === 0) return clientName.trim().length > 0;
      if (substep === 1) return Boolean(sessionDate && sessionTime);
      if (substep === 2) return Number(price) > 0;
    }
    return true;
  };

  const persistOnboardingData = useCallback(async () => {
    if (!user || saving || Number(price) <= 0 || !clientName.trim()) return;
    setSaving(true);
    try {
      const dedupeKey = `onboarding_first_action_saved:${user.id}`;
      if (!localStorage.getItem(dedupeKey)) {
        const amount = Number(price);
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .insert({ name: clientName.trim(), user_id: user.id, base_price: amount, pricing_mode: "fixed" } as any)
          .select("id")
          .single();
        if (clientError) throw clientError;

        const { data: service, error: serviceError } = await supabase
          .from("services")
          .insert({ name: t("onboarding.firstSessionService"), duration_minutes: 60, price: amount, user_id: user.id } as any)
          .select("id")
          .single();
        if (serviceError) throw serviceError;

        const scheduledAt = new Date(`${sessionDate}T${sessionTime}:00`).toISOString();
        const { error: appointmentError } = await supabase.from("appointments").insert({
          client_id: client.id,
          service_id: service.id,
          scheduled_at: scheduledAt,
          price: amount,
          duration_minutes: 60,
          user_id: user.id,
        } as any);
        if (appointmentError) throw appointmentError;
        localStorage.setItem(dedupeKey, "1");
        track("onboarding_client_added", { lang });
        track("onboarding_session_created", { lang });
        track("onboarding_price_set", { lang, price_bucket: amount < 50 ? "under_50" : amount < 100 ? "50_99" : "100_plus" });
      }

      await supabase
        .from("profiles")
        .update({ onboarding_completed: true, language: lang } as any)
        .eq("user_id", user.id);

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["profile"] }),
        qc.invalidateQueries({ queryKey: ["clients"] }),
        qc.invalidateQueries({ queryKey: ["services"] }),
        qc.invalidateQueries({ queryKey: ["appointments"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] }),
      ]);

      const impact = { clients: 1, sessions: 1, income: Number(price) };
      setSavedImpact(impact);
      track("onboarding_completed", {
        lang,
        answers: { practiceType, painPoint, goal },
        total_time_ms: Date.now() - stepStartedAt.current,
      });
      moveTo("impact");
    } catch (error: any) {
      toast({ title: t("onboarding.saveErrorTitle"), description: error?.message ?? String(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [user, saving, price, clientName, t, sessionDate, sessionTime, lang, qc, practiceType, painPoint, goal, toast]);

  useEffect(() => {
    if (user && stage === "action" && substep === 2 && Number(price) > 0 && clientName.trim() && !persistAfterLoginRef.current) {
      persistAfterLoginRef.current = true;
      persistOnboardingData();
    }
  }, [user, stage, substep, price, clientName, persistOnboardingData]);

  const completeFirstAction = async () => {
    if (!canContinue()) return;
    if (!user) {
      try {
        sessionStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(stateSnapshot));
        localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(stateSnapshot));
      } catch {}
      navigate("/auth?mode=signup&next=onboarding", { replace: true });
      return;
    }
    await persistOnboardingData();
  };

  const skipToPaywall = async () => {
    if (user) {
      await supabase.from("profiles").update({ onboarding_completed: true, language: lang } as any).eq("user_id", user.id);
      await qc.invalidateQueries({ queryKey: ["profile"] });
    }
    navigate("/plans", { replace: true, state: { from: "/onboarding" } });
  };

  if (showSplash) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-5 animate-fade-in">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <Sparkles className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">SoloBizz</h1>
            <p className="text-lg text-muted-foreground">{t("onboarding.splashTagline")}</p>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const maxDate = addDays(new Date(), 90).toISOString().split("T")[0];
  const valueKey = VALUE_SCREEN_KEYS[substep] ?? "one";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-card/60 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            {STEPS.map((label, index) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                    index < activeStepIndex
                      ? "bg-primary text-primary-foreground"
                      : index === activeStepIndex
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {index < activeStepIndex ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span className={cn("hidden sm:inline text-sm font-medium", index === activeStepIndex ? "text-foreground" : "text-muted-foreground")}>{t(`onboarding.step.${label.toLowerCase()}` as any)}</span>
              </div>
            ))}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((activeStepIndex + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <section className="w-full max-w-2xl space-y-8 animate-fade-in" key={`${stage}-${substep}`}>
          {stage === "entry" && (
            <ChoiceScreen
              title={t("onboarding.entryTitle")}
              subtitle={t("onboarding.entrySubtitle")}
              icon={<Users className="h-8 w-8" />}
              options={[
                { value: "new", label: t("onboarding.entryNew") },
                { value: "existing", label: t("onboarding.entryExisting") },
              ] as Array<{ value: "new" | "existing"; label: string }>}
              value={null}
              onChange={(value) => {
                recordOption("entry_choice", value);
                if (value === "existing") navigate("/auth?mode=login");
                else moveTo("value");
              }}
            />
          )}

          {stage === "value" && (
            <div className="text-center space-y-8">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                {substep === 0 ? <Zap className="h-8 w-8" /> : substep === 1 ? <Sparkles className="h-8 w-8" /> : <Target className="h-8 w-8" />}
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{t(`onboarding.value.${valueKey}.title` as any)}</h1>
                <div className="space-y-2 text-lg text-muted-foreground">
                  {[0, 1, 2].map((line) => <p key={line}>{t(`onboarding.value.${valueKey}.line${line + 1}` as any)}</p>)}
                </div>
              </div>
            </div>
          )}

          {stage === "setup" && substep === 0 && (
            <ChoiceScreen title={t("onboarding.whoAreYou")} subtitle={t("onboarding.choiceSubtitle")} icon={<Users className="h-8 w-8" />} options={practiceOptions.map((o) => ({ value: o.value, label: t(o.labelKey as any) }))} value={practiceType} onChange={(value) => { setPracticeType(value); recordOption("practice_type", value); }} />
          )}
          {stage === "setup" && substep === 1 && (
            <ChoiceScreen title={t("onboarding.biggestPain")} subtitle={t("onboarding.choiceSubtitle")} icon={<Zap className="h-8 w-8" />} options={painOptions.map((o) => ({ value: o.value, label: t(o.labelKey as any) }))} value={painPoint} onChange={(value) => { setPainPoint(value); recordOption("biggest_pain", value); }} />
          )}
          {stage === "setup" && substep === 2 && (
            <ChoiceScreen title={t("onboarding.whatWant")} subtitle={t("onboarding.choiceSubtitle")} icon={<Target className="h-8 w-8" />} options={goalOptions.map((o) => ({ value: o.value, label: t(o.labelKey as any) }))} value={goal} onChange={(value) => { setGoal(value); recordOption("desired_outcome", value); }} />
          )}

          {stage === "action" && substep === 0 && (
            <div className="space-y-6">
              <ScreenHeader icon={<UserPlus className="h-8 w-8" />} title={t("onboarding.addFirstClient")} subtitle="" />
              <div className="space-y-2">
                <Label htmlFor="client-name">{t("common.name")}</Label>
                <Input id="client-name" value={clientName} onChange={(e) => setClientName(e.target.value)} autoFocus placeholder={t("onboarding.clientNamePlaceholder")} />
              </div>
            </div>
          )}
          {stage === "action" && substep === 1 && (
            <div className="space-y-6">
              <ScreenHeader icon={<CalendarDays className="h-8 w-8" />} title={t("onboarding.scheduleSession")} subtitle="" />
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="session-date">{t("calendar.dateTime").split(" & ")[0]}</Label><Input id="session-date" type="date" min={today} max={maxDate} value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="session-time">{t("onboarding.time")}</Label><Input id="session-time" type="time" value={sessionTime} onChange={(e) => setSessionTime(e.target.value)} /></div>
              </div>
            </div>
          )}
          {stage === "action" && substep === 2 && (
            <div className="space-y-6">
              <ScreenHeader icon={<CircleDollarSign className="h-8 w-8" />} title={t("onboarding.priceQuestion")} subtitle="" />
              <div className="space-y-2">
                <Label htmlFor="session-price">{t("calendar.price")} ({symbol})</Label>
                <Input id="session-price" type="number" min="1" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} autoFocus placeholder="80" />
              </div>
            </div>
          )}

          {stage === "impact" && (
            <div className="text-center space-y-8">
              <ScreenHeader icon={<Sparkles className="h-8 w-8" />} title={t("onboarding.impactTitle")} subtitle={t("onboarding.impactSubtitle")} />
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <ImpactMetric label={t("clients.title")} value="1" />
                <ImpactMetric label={t("dashboard.sessions")} value="1" />
                <ImpactMetric label={t("nav.income")} value={`${symbol}${(savedImpact?.income ?? Number(price) ?? 0).toLocaleString()}`} />
              </div>
              <div className="rounded-xl border border-border bg-card p-5 text-left space-y-4">
                <div><h2 className="text-xl font-semibold text-foreground">{t("onboarding.unlockFullAccess")}</h2><p className="text-muted-foreground mt-1">{t("onboarding.paywallHint")}</p></div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm font-medium">
                  <div className="rounded-lg bg-muted px-3 py-2 text-foreground">{t("plans.monthly")}</div>
                  <div className="rounded-lg bg-muted px-3 py-2 text-foreground">{t("plans.quarterly")}</div>
                  <div className="rounded-lg bg-primary/10 px-3 py-2 text-primary">{t("plans.yearly")}</div>
                </div>
              </div>
            </div>
          )}

          {stage !== "entry" && (
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={back} disabled={(stage === "value" && substep === 0) || stage === "impact" || saving}><ArrowLeft className="h-4 w-4 mr-2" /> {t("onboarding.back")}</Button>
              <div className="flex items-center gap-3">
                {stage !== "impact" && <Button variant="ghost" onClick={skipToPaywall} disabled={saving} className="text-muted-foreground">{t("onboarding.skipSetup")}</Button>}
                {stage === "impact" ? (
                  <Button onClick={() => navigate("/plans", { replace: true, state: { from: "/onboarding" } })}>{t("onboarding.unlockFullAccess")} <ArrowRight className="h-4 w-4 ml-2" /></Button>
                ) : stage === "action" && substep === 2 ? (
                  <Button onClick={completeFirstAction} disabled={!canContinue() || saving}>{saving ? t("common.saving") : t("onboarding.save")} <ArrowRight className="h-4 w-4 ml-2" /></Button>
                ) : (
                  <Button onClick={next} disabled={!canContinue()}>{stage === "value" && substep === 2 ? t("onboarding.startFreeTrial") : stage === "action" && substep === 0 ? t("onboarding.addClientCta") : stage === "action" && substep === 1 ? t("onboarding.scheduleCta") : t("onboarding.continue")}<ArrowRight className="h-4 w-4 ml-2" /></Button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ScreenHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return <div className="text-center space-y-4"><div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div><div className="space-y-2"><h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>{subtitle ? <p className="text-muted-foreground text-lg">{subtitle}</p> : null}</div></div>;
}

function ChoiceScreen<T extends string>({ title, subtitle, icon, options, value, onChange }: { title: string; subtitle: string; icon: React.ReactNode; options: Array<{ value: T; label: string }>; value: T | null; onChange: (value: T) => void }) {
  return <div className="space-y-6"><ScreenHeader icon={icon} title={title} subtitle={subtitle} /><div className="grid gap-3">{options.map((option) => <button key={option.value} type="button" onClick={() => onChange(option.value)} className={cn("w-full rounded-xl border p-4 text-left font-medium transition-colors", value === option.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-muted")}>{option.label}</button>)}</div></div>;
}

function ImpactMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-4 min-h-24 flex flex-col items-center justify-center"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl sm:text-3xl font-bold text-foreground mt-1 break-all">{value}</p></div>;
}
