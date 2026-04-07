import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, DollarSign, Users, Calculator, Settings, Info, AlertTriangle, Receipt } from "lucide-react";
import { useExpenses, useIncome, useServices, useAppointments, useBreakevenGoals, useUpsertBreakevenGoals, useWorkingSchedule, useDaysOff, useProfile, useTaxSettings } from "@/hooks/useData";
import { useLanguage } from "@/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { calculateCapacity, sessionsNeededForTarget } from "@/lib/capacity";

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
  const { data: schedule = [] } = useWorkingSchedule();
  const { data: daysOff = [] } = useDaysOff();
  const { data: profile } = useProfile();
  const { data: taxSettings = [] } = useTaxSettings();
  const upsertGoals = useUpsertBreakevenGoals();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [goalForms, setGoalForms] = useState<GoalForm[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.substring(0, 7) + "-01";
  const monthlyExpenses = expenses.filter(e => e.date >= monthStart).reduce((s, e) => s + Number(e.amount), 0);
  const monthlyExpensesExTax = expenses.filter(e => e.date >= monthStart && e.category !== "Tax").reduce((s, e) => s + Number(e.amount), 0);
  const monthlyTaxExpenses = expenses.filter(e => e.date >= monthStart && e.category === "Tax").reduce((s, e) => s + Number(e.amount), 0);
  const monthlyIncome = income.filter(i => i.date >= monthStart).reduce((s, i) => s + Number(i.amount), 0);
  const avgServicePrice = services.length > 0 ? services.reduce((s, sv) => s + Number(sv.price), 0) / services.length : 1;
  const sessionsCompleted = appointments.filter(a => a.status === "completed" && a.scheduled_at >= monthStart + "T00:00:00").length;
  const bookedSessions = appointments.filter(a => (a.status === "scheduled" || a.status === "confirmed") && a.scheduled_at >= today + "T00:00:00" && a.scheduled_at < today.substring(0, 7) + "-31T23:59:59").length;

  // Tax calculation
  const activeTaxes = (taxSettings as any[]).filter((ts: any) => ts.is_active);
  const estimatedTax = useMemo(() => {
    let total = 0;
    for (const tax of activeTaxes) {
      if (tax.tax_type === "percentage") total += monthlyIncome * (Number(tax.tax_rate) / 100);
      else if (tax.tax_type === "fixed") {
        const amt = Number(tax.fixed_amount);
        total += tax.frequency === "quarterly" ? amt / 3 : amt;
      }
    }
    return Math.round(total);
  }, [activeTaxes, monthlyIncome]);

  const netAfterTax = monthlyIncome - estimatedTax;
  const netProfit = netAfterTax - monthlyExpensesExTax;

  const capacity = useMemo(() => calculateCapacity(
    schedule as any[], daysOff as any[],
    (profile as any)?.default_duration ?? 60, new Date(),
    (profile as any)?.working_days_per_week ?? 5,
    (profile as any)?.sessions_per_day ?? 6,
  ), [schedule, daysOff, profile]);

  const remainingCapacity = Math.max(capacity.maxMonthlyCapacity - bookedSessions, 0);

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
      dg[0].fixed_expenses = monthlyExpensesExTax;
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

        {/* Financial overview with tax separation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard title={t("finance.grossIncome")} value={`€${monthlyIncome.toLocaleString()}`} icon={DollarSign} />
          <MetricCard title={t("finance.totalExpenses")} value={`€${monthlyExpensesExTax.toLocaleString()}`} icon={Calculator} />
          <div className={cn("bg-card rounded-xl border p-5 animate-fade-in", estimatedTax > 0 ? "border-warning/30" : "border-border")}>
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="h-4 w-4 text-warning" />
              <p className={cn("text-sm", estimatedTax > 0 ? "text-warning" : "text-muted-foreground")}>{t("finance.totalTaxes")}</p>
            </div>
            <p className={cn("text-2xl font-bold", estimatedTax > 0 ? "text-warning" : "text-foreground")}>€{estimatedTax.toLocaleString()}</p>
          </div>
          <MetricCard title={t("finance.netAfterTax")} value={`€${netAfterTax.toLocaleString()}`} icon={Target} />
          <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <p className="text-sm text-muted-foreground">{t("finance.netProfit")}</p>
            <p className={cn("text-2xl font-bold mt-1", netProfit >= 0 ? "text-success" : "text-destructive")}>€{netProfit.toLocaleString()}</p>
          </div>
        </div>

        <MetricCard title={t("breakevenPage.sessionsCompleted")} value={sessionsCompleted.toString()} icon={Users}
          subtitle={`${capacity.remainingWorkingDays} ${t("capacity.remainingSlots", { slots: remainingCapacity }).toLowerCase()}`} />

        {/* Tax impact notice */}
        {activeTaxes.length > 0 && (
          <div className="bg-warning/5 rounded-xl border border-warning/20 p-4 flex items-start gap-3 animate-fade-in">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("finance.taxImpact", { amount: estimatedTax })}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTaxes.map((tax: any) => 
                  tax.tax_type === "percentage" ? `${tax.tax_name}: ${tax.tax_rate}%` : `${tax.tax_name}: €${Number(tax.fixed_amount).toLocaleString()}/${tax.frequency}`
                ).join(" · ")}
              </p>
            </div>
          </div>
        )}

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
              // Include estimated tax in goal target
              const taxAdjustedTarget = activeTaxes.length > 0
                ? goal.target + activeTaxes.reduce((sum: number, tax: any) => {
                    if (tax.tax_type === "percentage") return sum + goal.target * (Number(tax.tax_rate) / 100);
                    if (tax.tax_type === "fixed") return sum + (tax.frequency === "quarterly" ? Number(tax.fixed_amount) / 3 : Number(tax.fixed_amount));
                    return sum;
                  }, 0)
                : goal.target;
              const target = Math.round(taxAdjustedTarget);
              const progress = Math.min((monthlyIncome / Math.max(target, 1)) * 100, 100);
              const remaining = Math.max(target - monthlyIncome, 0);
              const { sessionsNeeded, isRealistic } = sessionsNeededForTarget(remaining, avgServicePrice, remainingCapacity);
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
                  {activeTaxes.length > 0 && target !== goal.target && (
                    <p className="text-xs text-warning mb-2">
                      {t("finance.taxImpact", { amount: (target - goal.target).toLocaleString() })}
                    </p>
                  )}
                  <Progress value={progress} className={cn("h-3 mb-2", reached ? "[&>div]:bg-success" : "")} />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>€{monthlyIncome.toLocaleString()} / €{target.toLocaleString()}</span>
                    {remaining > 0 ? (
                      <div className="flex items-center gap-2">
                        <span>{t("goals.remaining", { amount: remaining.toLocaleString() })} · {t("goals.sessionsNeeded", { count: sessionsNeeded })}</span>
                        {!isRealistic && (
                          <span className="inline-flex items-center gap-0.5 text-warning" title={t("capacity.unrealisticWarning", { slots: remainingCapacity })}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                  {remaining > 0 && !isRealistic && (
                    <p className="text-xs text-warning mt-1">{t("capacity.unrealisticWarning", { slots: remainingCapacity })}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
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
              <div className="text-center"><Button onClick={openWizard}>{t("goals.wizard")}</Button></div>
            </div>
          </div>
        )}
      </div>

      {/* Goals Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("goals.wizard")}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {goalForms.map((goal, idx) => {
              const target = goal.fixed_expenses + goal.desired_income + goal.buffer;
              return (
                <div key={idx} className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
                  <h4 className="font-semibold text-foreground">{t("goals.goal", { n: goal.goal_number })}</h4>
                  <div className="space-y-2"><Label>{t("goals.goalLabel")}</Label><Input value={goal.label} onChange={e => updateGoalForm(idx, "label", e.target.value)} /></div>
                  <div className="space-y-2"><Label>{t("goals.goalDescription")}</Label><Input value={goal.description} onChange={e => updateGoalForm(idx, "description", e.target.value)} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1"><Label className="text-xs">{t("goals.fixedExpenses")}</Label><Input type="number" step="0.01" value={goal.fixed_expenses || ""} onChange={e => updateGoalForm(idx, "fixed_expenses", parseFloat(e.target.value) || 0)} /></div>
                    <div className="space-y-1"><Label className="text-xs">{t("goals.desiredIncome")}</Label><Input type="number" step="0.01" value={goal.desired_income || ""} onChange={e => updateGoalForm(idx, "desired_income", parseFloat(e.target.value) || 0)} /></div>
                    <div className="space-y-1"><Label className="text-xs">{t("goals.buffer")}</Label><Input type="number" step="0.01" value={goal.buffer || ""} onChange={e => updateGoalForm(idx, "buffer", parseFloat(e.target.value) || 0)} /></div>
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
