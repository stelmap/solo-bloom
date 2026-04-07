import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, DollarSign, Users, Calculator, Settings, Info } from "lucide-react";
import { useExpenses, useIncome, useServices, useAppointments, useBreakevenGoals, useUpsertBreakevenGoals } from "@/hooks/useData";
import { useLanguage } from "@/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface GoalForm {
  goal_number: number;
  label: string;
  description: string;
  fixed_expenses: number;
  desired_income: number;
  buffer: number;
}

const defaultGoals = (t: any): GoalForm[] => [
  { goal_number: 1, label: t("goals.defaultLabel1"), description: t("goals.defaultDesc1"), fixed_expenses: 0, desired_income: 0, buffer: 0 },
  { goal_number: 2, label: t("goals.defaultLabel2"), description: t("goals.defaultDesc2"), fixed_expenses: 0, desired_income: 0, buffer: 0 },
  { goal_number: 3, label: t("goals.defaultLabel3"), description: t("goals.defaultDesc3"), fixed_expenses: 0, desired_income: 0, buffer: 0 },
];

export default function BreakevenPage() {
  const { data: expenses = [] } = useExpenses();
  const { data: income = [] } = useIncome();
  const { data: services = [] } = useServices();
  const { data: appointments = [] } = useAppointments();
  const { data: goals = [] } = useBreakevenGoals();
  const upsertGoals = useUpsertBreakevenGoals();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [goalForms, setGoalForms] = useState<GoalForm[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.substring(0, 7) + "-01";
  const monthlyExpenses = expenses.filter(e => e.date >= monthStart).reduce((s, e) => s + Number(e.amount), 0);
  const monthlyIncome = income.filter(i => i.date >= monthStart).reduce((s, i) => s + Number(i.amount), 0);
  const avgServicePrice = services.length > 0 ? services.reduce((s, sv) => s + Number(sv.price), 0) / services.length : 1;
  const sessionsCompleted = appointments.filter(a => a.status === "completed" && a.scheduled_at >= monthStart + "T00:00:00").length;

  const goalTargets = (goals as any[]).map((g: any) => ({
    ...g,
    target: Number(g.fixed_expenses) + Number(g.desired_income) + Number(g.buffer),
  }));

  const openWizard = () => {
    if (goals.length > 0) {
      setGoalForms((goals as any[]).map((g: any) => ({
        goal_number: g.goal_number, label: g.label, description: g.description || "",
        fixed_expenses: Number(g.fixed_expenses), desired_income: Number(g.desired_income), buffer: Number(g.buffer),
      })));
    } else {
      const dg = defaultGoals(t);
      dg[0].fixed_expenses = monthlyExpenses;
      setGoalForms(dg);
    }
    setWizardOpen(true);
  };

  const handleSaveGoals = async () => {
    try {
      await upsertGoals.mutateAsync(goalForms);
      setWizardOpen(false);
      toast({ title: t("goals.saved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const updateGoalForm = (idx: number, field: string, value: any) => {
    setGoalForms(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("goals.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("goals.subtitle")}</p>
          </div>
          <Button onClick={openWizard} variant="outline">
            <Settings className="h-4 w-4 mr-1" /> {goals.length > 0 ? t("goals.editGoals") : t("goals.wizard")}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title={t("breakevenPage.monthlyExpenses")} value={`€${monthlyExpenses.toLocaleString()}`} icon={DollarSign} />
          <MetricCard title={t("breakevenPage.sessionsCompleted")} value={sessionsCompleted.toString()} icon={Calculator} />
          <MetricCard title={t("breakevenPage.currentIncome")} value={`€${monthlyIncome.toLocaleString()}`} icon={Target} />
          <MetricCard title={t("breakevenPage.netProfit")} value={`€${(monthlyIncome - monthlyExpenses).toLocaleString()}`} icon={Users}
            subtitle={monthlyIncome >= monthlyExpenses ? "✓" : `€${(monthlyExpenses - monthlyIncome).toLocaleString()} ${t("breakeven.moreToGo")}`} />
        </div>

        {/* How goals work */}
        <div className="bg-muted/50 rounded-xl border border-border p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground text-sm">{t("goals.howItWorks")}</h3>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• {t("goals.explanation1")}</li>
            <li>• {t("goals.explanation2")}</li>
            <li>• {t("goals.explanation3")}</li>
          </ul>
        </div>

        {/* Goal progress cards */}
        {goalTargets.length > 0 ? (
          <div className="space-y-4">
            {goalTargets.map((goal: any) => {
              const target = goal.target;
              const progress = Math.min((monthlyIncome / Math.max(target, 1)) * 100, 100);
              const remaining = Math.max(target - monthlyIncome, 0);
              const sessionsNeeded = remaining > 0 ? Math.ceil(remaining / avgServicePrice) : 0;
              const reached = monthlyIncome >= target;

              return (
                <div key={goal.id} className="bg-card rounded-xl border border-border p-6 animate-fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{t("goals.goal", { n: goal.goal_number })} — {goal.label}</h3>
                      {reached && <span className="text-success text-sm font-medium">{t("goals.reached")}</span>}
                    </div>
                    <span className="text-sm font-medium text-foreground">{t("goals.targetAmount", { amount: target.toLocaleString() })}</span>
                  </div>
                  {goal.description && <p className="text-xs text-muted-foreground mb-3">{goal.description}</p>}
                  <Progress value={progress} className={cn("h-3 mb-2", reached ? "[&>div]:bg-success" : "")} />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>€{monthlyIncome.toLocaleString()} / €{target.toLocaleString()}</span>
                    {remaining > 0 ? (
                      <span>{t("goals.remaining", { amount: remaining.toLocaleString() })} · {t("goals.sessionsNeeded", { count: sessionsNeeded })}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Fallback: simple breakeven */
          <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
            <h3 className="font-semibold text-foreground mb-4">{t("breakevenPage.monthlyProgress")}</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{t("breakevenPage.incomeVsExpenses")}</span>
                  <span className="font-medium text-foreground">{Math.min(Math.round((monthlyIncome / Math.max(monthlyExpenses, 1)) * 100), 100)}%</span>
                </div>
                <Progress value={Math.min((monthlyIncome / Math.max(monthlyExpenses, 1)) * 100, 100)} className="h-4" />
              </div>
              <p className="text-sm text-muted-foreground text-center">{t("goals.noGoals")}</p>
              <div className="text-center">
                <Button onClick={openWizard}>{t("goals.wizard")}</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Goals Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("goals.wizard")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {goalForms.map((goal, idx) => {
              const target = goal.fixed_expenses + goal.desired_income + goal.buffer;
              return (
                <div key={idx} className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
                  <h4 className="font-semibold text-foreground">{t("goals.goal", { n: goal.goal_number })}</h4>
                  <div className="space-y-2">
                    <Label>{t("goals.goalLabel")}</Label>
                    <Input value={goal.label} onChange={e => updateGoalForm(idx, "label", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("goals.goalDescription")}</Label>
                    <Input value={goal.description} onChange={e => updateGoalForm(idx, "description", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("goals.fixedExpenses")}</Label>
                      <Input type="number" step="0.01" value={goal.fixed_expenses || ""} onChange={e => updateGoalForm(idx, "fixed_expenses", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("goals.desiredIncome")}</Label>
                      <Input type="number" step="0.01" value={goal.desired_income || ""} onChange={e => updateGoalForm(idx, "desired_income", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("goals.buffer")}</Label>
                      <Input type="number" step="0.01" value={goal.buffer || ""} onChange={e => updateGoalForm(idx, "buffer", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-primary">{t("goals.targetAmount", { amount: target.toLocaleString() })}</p>
                </div>
              );
            })}
            <Button onClick={handleSaveGoals} className="w-full" disabled={upsertGoals.isPending}>
              {upsertGoals.isPending ? t("common.saving") : t("goals.saveGoals")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
