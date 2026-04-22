import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useAuth } from "@/contexts/AuthContext";
import { useFinanceSetupStatus } from "@/hooks/useFinanceSetup";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Wallet, Target, ArrowRight, ArrowLeft, Check } from "lucide-react";

const TOTAL_STEPS = 3;

export default function FinanceOnboardingPage() {
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: status } = useFinanceSetupStatus();

  const [step, setStep] = useState(1);
  const [fixedExpenses, setFixedExpenses] = useState<string>("");
  const [desiredIncome, setDesiredIncome] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // If the user re-enters with setup already done, send them straight to dashboard
  if (status?.completed) {
    return <NavigateToFinances />;
  }

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  async function finish() {
    if (!user) return;
    setSaving(true);
    try {
      const expensesNum = Number(fixedExpenses) || 0;
      const desiredNum = Number(desiredIncome) || 0;

      // Always create a starter break-even goal so setup is detectably complete
      await supabase.from("breakeven_goals").insert({
        user_id: user.id,
        goal_number: 1,
        label: "Monthly target",
        fixed_expenses: expensesNum,
        desired_income: desiredNum,
        buffer: 0,
        goal_type: "monthly",
      } as any);

      // Optionally seed a single fixed-expense entry the user can edit later
      if (expensesNum > 0) {
        const today = new Date().toISOString().split("T")[0];
        await supabase.from("expenses").insert({
          user_id: user.id,
          amount: expensesNum,
          category: "other",
          description: "Estimated monthly fixed expenses",
          date: today,
          is_recurring: true,
          recurring_start_date: today,
        } as any);
      }

      await qc.invalidateQueries({ queryKey: ["finance-setup-status"] });
      await qc.invalidateQueries({ queryKey: ["expenses"] });
      await qc.invalidateQueries({ queryKey: ["breakeven-goals"] });

      navigate("/finances", { replace: true });
    } catch (e: any) {
      toast({ title: "Error", description: e.message ?? "Could not save setup", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function skip() {
    if (!user) return;
    setSaving(true);
    try {
      // Create an empty starter goal so the user can still enter Finances
      await supabase.from("breakeven_goals").insert({
        user_id: user.id,
        goal_number: 1,
        label: "Monthly target",
        fixed_expenses: 0,
        desired_income: 0,
        buffer: 0,
        goal_type: "monthly",
      } as any);
      await qc.invalidateQueries({ queryKey: ["finance-setup-status"] });
      await qc.invalidateQueries({ queryKey: ["breakeven-goals"] });
      navigate("/finances", { replace: true });
    } finally {
      setSaving(false);
    }
  }

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("financeWizard.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("financeWizard.subtitle")}</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("financeWizard.step", { current: step, total: TOTAL_STEPS })}</span>
            <button
              onClick={skip}
              className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
              disabled={saving}
            >
              {t("financeWizard.skip")}
            </button>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <div className="bg-card border border-border rounded-xl p-8 min-h-[280px] animate-fade-in">
          {step === 1 && (
            <div className="space-y-4 text-center">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">{t("financeWizard.intro.title")}</h2>
              <p className="text-muted-foreground max-w-md mx-auto">{t("financeWizard.intro.body")}</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t("financeWizard.expenses.title")}</h2>
                  <p className="text-sm text-muted-foreground">{t("financeWizard.expenses.body")}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fixed-expenses">{t("financeWizard.expenses.amountLabel")} ({cs})</Label>
                <Input
                  id="fixed-expenses"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  placeholder="0"
                  value={fixedExpenses}
                  onChange={(e) => setFixedExpenses(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                  <Target className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t("financeWizard.goal.title")}</h2>
                  <p className="text-sm text-muted-foreground">{t("financeWizard.goal.body")}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desired-income">{t("financeWizard.goal.desiredLabel")} ({cs})</Label>
                <Input
                  id="desired-income"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  placeholder="0"
                  value={desiredIncome}
                  onChange={(e) => setDesiredIncome(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 1 || saving}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t("financeWizard.back")}
          </Button>
          {step < TOTAL_STEPS ? (
            <Button onClick={next} disabled={saving}>
              {t("financeWizard.next")} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={saving}>
              <Check className="h-4 w-4 mr-2" /> {t("financeWizard.finish")}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function NavigateToFinances() {
  const navigate = useNavigate();
  // Use effect-less redirect via Navigate component
  return <RedirectTo path="/finances" />;
}

function RedirectTo({ path }: { path: string }) {
  const navigate = useNavigate();
  // immediate redirect
  if (typeof window !== "undefined") {
    queueMicrotask(() => navigate(path, { replace: true }));
  }
  return null;
}
