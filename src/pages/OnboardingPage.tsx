import { useEffect, useMemo, useState } from "react";
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

type PracticeType = "individual" | "groups" | null;
type PainPoint = "income" | "clients" | "workflow" | "sessions" | null;
type Goal = "control" | "more_clients" | "stable_income" | null;

const VALUE_SCREENS = [
  {
    title: "You’re losing time and money in chaos",
    lines: ["Clients are scattered", "Sessions get lost", "Income is unclear"],
  },
  {
    title: "We fix this",
    lines: ["Clients in one place", "Sessions in a calendar", "Finances tracked automatically"],
  },
  {
    title: "See your entire practice in 1 minute",
    lines: ["Start with one client", "Schedule one session", "Feel the control immediately"],
  },
];

const practiceOptions: Array<{ value: Exclude<PracticeType, null>; label: string }> = [
  { value: "individual", label: "Individual psychologist" },
  { value: "groups", label: "Psychologist working with groups" },
];

const painOptions: Array<{ value: Exclude<PainPoint, null>; label: string }> = [
  { value: "income", label: "I don’t understand my income" },
  { value: "clients", label: "I lose clients" },
  { value: "workflow", label: "My workflow is chaotic" },
  { value: "sessions", label: "I forget sessions" },
];

const goalOptions: Array<{ value: Exclude<Goal, null>; label: string }> = [
  { value: "control", label: "Control" },
  { value: "more_clients", label: "More clients" },
  { value: "stable_income", label: "Stable income" },
];

const STEPS = ["Value", "Setup", "Action", "Impact"];

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { symbol } = useCurrency();

  const [showSplash, setShowSplash] = useState(true);
  const [stage, setStage] = useState<"value" | "setup" | "action" | "impact">("value");
  const [substep, setSubstep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [practiceType, setPracticeType] = useState<PracticeType>(null);
  const [painPoint, setPainPoint] = useState<PainPoint>(null);
  const [goal, setGoal] = useState<Goal>(null);
  const [clientName, setClientName] = useState("");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [sessionTime, setSessionTime] = useState("10:00");
  const [price, setPrice] = useState("");
  const [savedImpact, setSavedImpact] = useState<{ clients: number; sessions: number; income: number } | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowSplash(false), 1400);
    return () => window.clearTimeout(timeout);
  }, []);

  const activeStepIndex = useMemo(() => STEPS.indexOf(stage), [stage]);

  const next = () => {
    if (stage === "value") {
      if (substep < VALUE_SCREENS.length - 1) setSubstep((s) => s + 1);
      else {
        setStage("setup");
        setSubstep(0);
      }
      return;
    }

    if (stage === "setup") {
      if (substep < 2) setSubstep((s) => s + 1);
      else {
        setStage("action");
        setSubstep(0);
      }
      return;
    }

    if (stage === "action") {
      if (substep < 2) setSubstep((s) => s + 1);
    }
  };

  const back = () => {
    if (stage === "impact" || saving) return;
    if (substep > 0) {
      setSubstep((s) => s - 1);
      return;
    }
    if (stage === "setup") {
      setStage("value");
      setSubstep(VALUE_SCREENS.length - 1);
    } else if (stage === "action") {
      setStage("setup");
      setSubstep(2);
    }
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

  const completeFirstAction = async () => {
    if (!user || saving || Number(price) <= 0 || !clientName.trim()) return;
    setSaving(true);
    try {
      const storedLang = (typeof window !== "undefined"
        ? localStorage.getItem("app_lang") || localStorage.getItem("landing_lang")
        : null) || "en";

      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({ name: clientName.trim(), user_id: user.id } as any)
        .select("id")
        .single();
      if (clientError) throw clientError;

      const amount = Number(price);
      const { data: service, error: serviceError } = await supabase
        .from("services")
        .insert({ name: "First session", duration_minutes: 60, price: amount, user_id: user.id } as any)
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

      await supabase
        .from("profiles")
        .update({ onboarding_completed: true, language: storedLang } as any)
        .eq("user_id", user.id);

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["profile"] }),
        qc.invalidateQueries({ queryKey: ["clients"] }),
        qc.invalidateQueries({ queryKey: ["services"] }),
        qc.invalidateQueries({ queryKey: ["appointments"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] }),
      ]);

      setSavedImpact({ clients: 1, sessions: 1, income: amount });
      setStage("impact");
      setSubstep(0);
    } catch (error: any) {
      toast({ title: "Couldn’t save your first action", description: error?.message ?? String(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const skipToPaywall = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const storedLang = (typeof window !== "undefined"
        ? localStorage.getItem("app_lang") || localStorage.getItem("landing_lang")
        : null) || "en";
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true, language: storedLang } as any)
        .eq("user_id", user.id);
      await qc.invalidateQueries({ queryKey: ["profile"] });
      navigate("/plans", { replace: true, state: { from: "/onboarding" } });
    } finally {
      setSaving(false);
    }
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
            <p className="text-lg text-muted-foreground">Your practice. Without chaos.</p>
          </div>
        </div>
      </div>
    );
  }

  const valueScreen = VALUE_SCREENS[substep];
  const today = new Date().toISOString().split("T")[0];
  const maxDate = addDays(new Date(), 90).toISOString().split("T")[0];

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
                <span className={cn("hidden sm:inline text-sm font-medium", index === activeStepIndex ? "text-foreground" : "text-muted-foreground")}>{label}</span>
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
          {stage === "value" && (
            <div className="text-center space-y-8">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                {substep === 0 ? <Zap className="h-8 w-8" /> : substep === 1 ? <Sparkles className="h-8 w-8" /> : <Target className="h-8 w-8" />}
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{valueScreen.title}</h1>
                <div className="space-y-2 text-lg text-muted-foreground">
                  {valueScreen.lines.map((line) => <p key={line}>{line}</p>)}
                </div>
              </div>
            </div>
          )}

          {stage === "setup" && substep === 0 && (
            <ChoiceScreen title="Who are you?" icon={<Users className="h-8 w-8" />} options={practiceOptions} value={practiceType} onChange={(value) => setPracticeType(value)} />
          )}

          {stage === "setup" && substep === 1 && (
            <ChoiceScreen title="Biggest pain?" icon={<Zap className="h-8 w-8" />} options={painOptions} value={painPoint} onChange={(value) => setPainPoint(value)} />
          )}

          {stage === "setup" && substep === 2 && (
            <ChoiceScreen title="What do you want?" icon={<Target className="h-8 w-8" />} options={goalOptions} value={goal} onChange={(value) => setGoal(value)} />
          )}

          {stage === "action" && substep === 0 && (
            <div className="space-y-6">
              <ScreenHeader icon={<UserPlus className="h-8 w-8" />} title="Add your first client" subtitle="10 seconds" />
              <div className="space-y-2">
                <Label htmlFor="client-name">Name</Label>
                <Input id="client-name" value={clientName} onChange={(e) => setClientName(e.target.value)} autoFocus placeholder="Client name" />
              </div>
            </div>
          )}

          {stage === "action" && substep === 1 && (
            <div className="space-y-6">
              <ScreenHeader icon={<CalendarDays className="h-8 w-8" />} title="Schedule session" subtitle="Put one real session on the calendar." />
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session-date">Date</Label>
                  <Input id="session-date" type="date" min={today} max={maxDate} value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-time">Time</Label>
                  <Input id="session-time" type="time" value={sessionTime} onChange={(e) => setSessionTime(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {stage === "action" && substep === 2 && (
            <div className="space-y-6">
              <ScreenHeader icon={<CircleDollarSign className="h-8 w-8" />} title="How much do you charge per session?" subtitle="This creates your first income signal." />
              <div className="space-y-2">
                <Label htmlFor="session-price">Price ({symbol})</Label>
                <Input id="session-price" type="number" min="1" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} autoFocus placeholder="80" />
              </div>
            </div>
          )}

          {stage === "impact" && (
            <div className="text-center space-y-8">
              <ScreenHeader icon={<Sparkles className="h-8 w-8" />} title="This is what control looks like." subtitle="Imagine when you have 20 clients." />
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <ImpactMetric label="Clients" value="1" />
                <ImpactMetric label="Sessions" value="1" />
                <ImpactMetric label="Income" value={`${symbol}${(savedImpact?.income ?? Number(price) ?? 0).toLocaleString()}`} />
              </div>
              <div className="rounded-xl border border-border bg-card p-5 text-left space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Unlock full access</h2>
                  <p className="text-muted-foreground mt-1">Choose Monthly, Quarterly, or Yearly and turn the first moment of control into your daily workflow.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm font-medium">
                  <div className="rounded-lg bg-muted px-3 py-2 text-foreground">Monthly</div>
                  <div className="rounded-lg bg-muted px-3 py-2 text-foreground">Quarterly</div>
                  <div className="rounded-lg bg-primary/10 px-3 py-2 text-primary">Yearly</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={back} disabled={(stage === "value" && substep === 0) || stage === "impact" || saving}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="flex items-center gap-3">
              {stage !== "impact" && (
                <Button variant="ghost" onClick={skipToPaywall} disabled={saving} className="text-muted-foreground">
                  Skip
                </Button>
              )}
              {stage === "impact" ? (
                <Button onClick={() => navigate("/plans", { replace: true, state: { from: "/onboarding" } })}>
                  Unlock full access <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : stage === "action" && substep === 2 ? (
                <Button onClick={completeFirstAction} disabled={!canContinue() || saving}>
                  {saving ? "Saving…" : "Save"} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={next} disabled={!canContinue()}>
                  {stage === "value" && substep === 2 ? "Start Free Trial" : stage === "action" && substep === 0 ? "Add Client" : stage === "action" && substep === 1 ? "Schedule" : "Continue"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ScreenHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="text-muted-foreground text-lg">{subtitle}</p>
      </div>
    </div>
  );
}

function ChoiceScreen<T extends string>({
  title,
  icon,
  options,
  value,
  onChange,
}: {
  title: string;
  icon: React.ReactNode;
  options: Array<{ value: T; label: string }>;
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-6">
      <ScreenHeader icon={icon} title={title} subtitle="One tap. No configuration." />
      <div className="grid gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "w-full rounded-xl border p-4 text-left font-medium transition-colors",
              value === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ImpactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 min-h-24 flex flex-col items-center justify-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1 break-all">{value}</p>
    </div>
  );
}
