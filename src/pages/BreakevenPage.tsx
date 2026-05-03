import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, DollarSign, Users, Calculator, Settings, Info, AlertTriangle, Receipt, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useExpenses, useIncome, useServices, useAppointments, useBreakevenGoals, useUpsertBreakevenGoals, useWorkingSchedule, useDaysOff, useProfile, useTaxSettings } from "@/hooks/useData";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { calculateCapacity, sessionsNeededForTarget } from "@/lib/capacity";
import { buildGoalForecast } from "@/lib/forecasting";
import { format, startOfMonth, subMonths } from "date-fns";
import { track } from "@/lib/analytics";

interface GoalForm {
  goal_number: number;
  label: string;
  description: string;
  fixed_expenses: number;
  desired_income: number;
  buffer: number;
  goal_type: string;
}

const defaultGoals = (t: any): GoalForm[] => [
  { goal_number: 1, label: t("goals.defaultLabel1"), description: t("goals.defaultDesc1"), fixed_expenses: 0, desired_income: 0, buffer: 0, goal_type: "monthly" },
  { goal_number: 2, label: t("goals.defaultLabel2"), description: t("goals.defaultDesc2"), fixed_expenses: 0, desired_income: 0, buffer: 0, goal_type: "monthly" },
  { goal_number: 3, label: t("goals.defaultLabel3"), description: t("goals.defaultDesc3"), fixed_expenses: 0, desired_income: 0, buffer: 0, goal_type: "monthly" },
];

export default function BreakevenPage() {
  // Analytics: user opened the breakeven view
  useEffect(() => { track("breakeven_viewed"); }, []);
  const { data: expenseResult } = useExpenses();
  const expenses = (expenseResult as any)?.data ?? expenseResult ?? [];
  const { data: incomeResult } = useIncome();
  const income = (incomeResult as any)?.data ?? incomeResult ?? [];
  const { data: services = [] } = useServices();
  const { data: appointments = [] } = useAppointments();
  const { data: goals = [] } = useBreakevenGoals();
  const { data: schedule = [] } = useWorkingSchedule();
  const { data: daysOff = [] } = useDaysOff();
  const { data: profile } = useProfile();
  const { data: taxSettings = [] } = useTaxSettings();
  const upsertGoals = useUpsertBreakevenGoals();
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();
  const { toast } = useToast();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [goalForms, setGoalForms] = useState<GoalForm[]>([]);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.substring(0, 7) + "-01";

  const incomeDateField: "date" | "session_date" =
    (profile as any)?.income_recognition_method === "session_date" ? "session_date" : "date";
  const incomeDateOf = (i: any) => i[incomeDateField] || i.date;

  // Build monthly maps for forecasting
  const { incomeByMonth, expensesByMonth, taxByMonth, sessionsByMonth } = useMemo(() => {
    const incMap = new Map<string, number>();
    const expMap = new Map<string, number>();
    const taxMap = new Map<string, number>();
    const sesMap = new Map<string, number>();

    for (const inc of income) {
      const d = incomeDateOf(inc);
      if (!d) continue;
      const key = (d as string).substring(0, 7);
      incMap.set(key, (incMap.get(key) || 0) + Number(inc.amount));
    }
    for (const exp of expenses) {
      const key = exp.date.substring(0, 7);
      if (exp.category === "Tax") {
        taxMap.set(key, (taxMap.get(key) || 0) + Number(exp.amount));
      } else {
        expMap.set(key, (expMap.get(key) || 0) + Number(exp.amount));
      }
    }
    for (const apt of appointments) {
      if (apt.status === "completed") {
        const key = apt.scheduled_at.substring(0, 7);
        sesMap.set(key, (sesMap.get(key) || 0) + 1);
      }
    }
    return { incomeByMonth: incMap, expensesByMonth: expMap, taxByMonth: taxMap, sessionsByMonth: sesMap };
  }, [income, expenses, appointments, incomeDateField]);

  const monthlyExpenses = expenses.filter((e: any) => {
    if (e.is_recurring) {
      const startDate = e.recurring_start_date || e.date;
      return startDate <= today;
    }
    return e.date >= monthStart;
  }).reduce((s: number, e: any) => s + Number(e.amount), 0);

  const monthlyExpensesExTax = expenses.filter((e: any) => {
    if (e.is_recurring) {
      const startDate = e.recurring_start_date || e.date;
      return startDate <= today && e.category !== "Tax";
    }
    return e.date >= monthStart && e.category !== "Tax";
  }).reduce((s: number, e: any) => s + Number(e.amount), 0);

  const monthlyTaxExpenses = expenses.filter((e: any) => {
    if (e.is_recurring) {
      const startDate = e.recurring_start_date || e.date;
      return startDate <= today && e.category === "Tax";
    }
    return e.date >= monthStart && e.category === "Tax";
  }).reduce((s: number, e: any) => s + Number(e.amount), 0);

  const monthlyIncome = income.filter((i: any) => (incomeDateOf(i) ?? "") >= monthStart).reduce((s: number, i: any) => s + Number(i.amount), 0);
  const avgServicePrice = services.length > 0 ? services.reduce((s, sv) => s + Number(sv.price), 0) / services.length : 1;
  const sessionsCompleted = appointments.filter(a => a.status === "completed" && a.scheduled_at >= monthStart + "T00:00:00").length;
  const bookedSessions = appointments.filter(a => (a.status === "scheduled" || a.status === "confirmed") && a.scheduled_at >= today + "T00:00:00" && a.scheduled_at < today.substring(0, 7) + "-31T23:59:59").length;

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
    goal_type: g.goal_type || "monthly",
  }));

  // Average progress across all goals
  const avgProgress = goalTargets.length > 0
    ? goalTargets.reduce((s: number, g: any) => {
        const target = g.target + (activeTaxes.length > 0 ? activeTaxes.reduce((sum: number, tax: any) => {
          if (tax.tax_type === "percentage") return sum + g.target * (Number(tax.tax_rate) / 100);
          if (tax.tax_type === "fixed") return sum + (tax.frequency === "quarterly" ? Number(tax.fixed_amount) / 3 : Number(tax.fixed_amount));
          return sum;
        }, 0) : 0);
        return s + Math.min((monthlyIncome / Math.max(target, 1)) * 100, 100);
      }, 0) / goalTargets.length
    : 0;

  const openWizard = () => {
    if (goals.length > 0) {
      setGoalForms((goals as any[]).map((g: any) => ({
        goal_number: g.goal_number, label: g.label, description: g.description || "",
        fixed_expenses: Number(g.fixed_expenses), desired_income: Number(g.desired_income), buffer: Number(g.buffer),
        goal_type: g.goal_type || "monthly",
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

        {/* Average Progress */}
        {goalTargets.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">{t("goals.averageProgress")}</p>
              <span className="text-lg font-bold text-foreground">{Math.round(avgProgress)}%</span>
            </div>
            <Progress value={avgProgress} className={cn("h-3", avgProgress >= 100 ? "[&>div]:bg-success" : "")} />
          </div>
        )}

        {/* Financial overview with tax separation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard title={t("finance.grossIncome")} value={`${cs}${monthlyIncome.toLocaleString()}`} icon={DollarSign} />
          <MetricCard title={t("finance.totalExpenses")} value={`${cs}${monthlyExpensesExTax.toLocaleString()}`} icon={Calculator} />
          <div className={cn("bg-card rounded-xl border p-5 animate-fade-in", estimatedTax > 0 ? "border-warning/30" : "border-border")}>
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="h-4 w-4 text-warning" />
              <p className={cn("text-sm", estimatedTax > 0 ? "text-warning" : "text-muted-foreground")}>{t("finance.totalTaxes")}</p>
            </div>
            <p className={cn("text-2xl font-bold", estimatedTax > 0 ? "text-warning" : "text-foreground")}>{cs}{estimatedTax.toLocaleString()}</p>
          </div>
          <MetricCard title={t("finance.netAfterTax")} value={`${cs}${netAfterTax.toLocaleString()}`} icon={Target} />
          <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <p className="text-sm text-muted-foreground">{t("finance.netProfit")}</p>
            <p className={cn("text-2xl font-bold mt-1", netProfit >= 0 ? "text-success" : "text-destructive")}>{cs}{netProfit.toLocaleString()}</p>
          </div>
        </div>

        <MetricCard title={t("breakevenPage.sessionsCompleted")} value={sessionsCompleted.toString()} icon={Users}
          subtitle={`${capacity.remainingWorkingDays} ${t("capacity.remainingSlots", { slots: remainingCapacity }).toLowerCase()}`} />

        {/* Tax impact notice */}
        {activeTaxes.length > 0 && (
          <div className="bg-warning/5 rounded-xl border border-warning/20 p-4 flex items-start gap-3 animate-fade-in">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("finance.taxImpact", { amount: estimatedTax, currency: cs })}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTaxes.map((tax: any) =>
                  tax.tax_type === "percentage" ? `${tax.tax_name}: ${tax.tax_rate}%` : `${tax.tax_name}: ${cs}${Number(tax.fixed_amount).toLocaleString()}/${tax.frequency}`
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
              const taxAdjustedTarget = activeTaxes.length > 0
                ? goal.target + activeTaxes.reduce((sum: number, tax: any) => {
                    if (tax.tax_type === "percentage") return sum + goal.target * (Number(tax.tax_rate) / 100);
                    if (tax.tax_type === "fixed") return sum + (tax.frequency === "quarterly" ? Number(tax.fixed_amount) / 3 : Number(tax.fixed_amount));
                    return sum;
                  }, 0)
                : goal.target;
              const target = Math.round(taxAdjustedTarget);
              const isYearly = goal.goal_type === "yearly";
              const effectiveTarget = isYearly ? Math.round(target / 12) : target;
              const progress = Math.min((monthlyIncome / Math.max(effectiveTarget, 1)) * 100, 100);
              const remaining = Math.max(effectiveTarget - monthlyIncome, 0);
              const { sessionsNeeded, isRealistic } = sessionsNeededForTarget(remaining, avgServicePrice, remainingCapacity);
              const reached = monthlyIncome >= effectiveTarget;
              const isExpanded = expandedGoal === goal.id;

              // Build forecast for drill-down
              const forecast = buildGoalForecast(
                incomeByMonth, expensesByMonth, taxByMonth, sessionsByMonth,
                effectiveTarget,
              );

              const TrendIcon = forecast.trendDirection === "up" ? TrendingUp : forecast.trendDirection === "down" ? TrendingDown : Minus;
              const trendLabel = forecast.trendDirection === "up" ? t("goals.trendUp") : forecast.trendDirection === "down" ? t("goals.trendDown") : t("goals.trendFlat");

              return (
                <div key={goal.id} className="bg-card rounded-xl border border-border animate-fade-in overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{t("goals.goal", { n: goal.goal_number })} — {goal.label}</h3>
                        <Badge variant="outline" className="text-xs">
                          {isYearly ? t("goals.yearlyGoal") : t("goals.monthlyGoal")}
                        </Badge>
                        {reached && <span className="text-success text-sm font-medium">{t("goals.reached")}</span>}
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {t("goals.targetAmount", { amount: effectiveTarget.toLocaleString(), currency: cs })}
                        {isYearly && <span className="text-xs text-muted-foreground ml-1">({cs}{target.toLocaleString()}/yr)</span>}
                      </span>
                    </div>
                    {goal.description && <p className="text-xs text-muted-foreground mb-3">{goal.description}</p>}
                    {activeTaxes.length > 0 && target !== goal.target && (
                      <p className="text-xs text-warning mb-2">
                        {t("finance.taxImpact", { amount: (target - goal.target).toLocaleString(), currency: cs })}
                      </p>
                    )}
                    <Progress value={progress} className={cn("h-3 mb-2", reached ? "[&>div]:bg-success" : "")} />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{cs}{monthlyIncome.toLocaleString()} / {cs}{effectiveTarget.toLocaleString()}</span>
                      {remaining > 0 ? (
                        <div className="flex items-center gap-2">
                          <span>{t("goals.remaining", { amount: remaining.toLocaleString(), currency: cs })} · {t("goals.sessionsNeeded", { count: sessionsNeeded })}</span>
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

                    {/* Trend & Forecast summary */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendIcon className={cn("h-3.5 w-3.5",
                          forecast.trendDirection === "up" ? "text-success" :
                          forecast.trendDirection === "down" ? "text-destructive" : "text-muted-foreground"
                        )} />
                        {trendLabel}
                      </div>
                      {forecast.monthsToGoal && (
                        <span className="text-xs text-muted-foreground">
                          {t("goals.monthsToGoal", { count: forecast.monthsToGoal })}
                        </span>
                      )}
                      <Button
                        variant="ghost" size="sm" className="ml-auto text-xs h-7"
                        onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                        {isExpanded ? t("goals.close") : t("goals.drillDown")}
                      </Button>
                    </div>
                  </div>

                  {/* 12-month drill-down */}
                  {isExpanded && (
                    <div className="border-t border-border p-6 bg-muted/30">
                      <h4 className="text-sm font-semibold text-foreground mb-4">{t("goals.monthlyBreakdown")}</h4>

                      {/* Visual bar chart */}
                      <div className="flex items-end gap-1 h-32 mb-4">
                        {forecast.monthlyData.map((md) => {
                          const maxVal = Math.max(...forecast.monthlyData.map(d => d.income), effectiveTarget);
                          const barHeight = maxVal > 0 ? (md.income / maxVal) * 100 : 0;
                          const targetLine = maxVal > 0 ? (effectiveTarget / maxVal) * 100 : 0;
                          return (
                            <div key={md.month} className="flex-1 flex flex-col items-center gap-1 relative">
                              <div className="w-full flex flex-col justify-end h-24 relative">
                                <div
                                  className={cn(
                                    "w-full rounded-t transition-all",
                                    md.isActual
                                      ? md.income >= effectiveTarget ? "bg-success" : "bg-primary"
                                      : "bg-primary/30 border border-dashed border-primary/50"
                                  )}
                                  style={{ height: `${Math.max(barHeight, 2)}%` }}
                                />
                                {/* Target line */}
                                <div
                                  className="absolute w-full border-t-2 border-dashed border-warning/60"
                                  style={{ bottom: `${targetLine}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground">{md.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Data table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-2 font-medium text-muted-foreground">{t("financial.month")}</th>
                              <th className="text-right p-2 font-medium text-muted-foreground">{t("goals.actuals")}</th>
                              <th className="text-right p-2 font-medium text-muted-foreground">{t("goals.forecast")}</th>
                              <th className="text-right p-2 font-medium text-muted-foreground">{t("goals.variance")}</th>
                              <th className="text-right p-2 font-medium text-muted-foreground">{t("goals.progress")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {forecast.monthlyData.map((md) => {
                              const variance = md.income - effectiveTarget;
                              const prog = Math.min((md.income / Math.max(effectiveTarget, 1)) * 100, 100);
                              return (
                                <tr key={md.month} className={cn("border-b border-border last:border-0", md.isForecast && "opacity-60")}>
                                  <td className="p-2 font-medium text-foreground">{md.label} {md.isForecast && `(${t("goals.forecast")})`}</td>
                                  <td className="p-2 text-right text-foreground">{md.isActual ? `${cs}${md.income.toLocaleString()}` : "—"}</td>
                                  <td className="p-2 text-right text-muted-foreground">{md.isForecast ? `${cs}${md.income.toLocaleString()}` : "—"}</td>
                                  <td className={cn("p-2 text-right", variance >= 0 ? "text-success" : "text-destructive")}>
                                    {variance >= 0 ? "+" : ""}{cs}{variance.toLocaleString()}
                                  </td>
                                  <td className="p-2 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className={cn("h-full rounded-full", prog >= 100 ? "bg-success" : "bg-primary")} style={{ width: `${prog}%` }} />
                                      </div>
                                      <span className="text-muted-foreground w-8 text-right">{Math.round(prog)}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
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
                  <div className="space-y-2">
                    <Label>{t("goals.goalType")}</Label>
                    <Select value={goal.goal_type} onValueChange={v => updateGoalForm(idx, "goal_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">{t("goals.monthlyGoal")}</SelectItem>
                        <SelectItem value="yearly">{t("goals.yearlyGoal")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1"><Label className="text-xs">{t("goals.fixedExpenses")}</Label><Input type="number" step="0.01" value={goal.fixed_expenses || ""} onChange={e => updateGoalForm(idx, "fixed_expenses", parseFloat(e.target.value) || 0)} /></div>
                    <div className="space-y-1"><Label className="text-xs">{t("goals.desiredIncome")}</Label><Input type="number" step="0.01" value={goal.desired_income || ""} onChange={e => updateGoalForm(idx, "desired_income", parseFloat(e.target.value) || 0)} /></div>
                    <div className="space-y-1"><Label className="text-xs">{t("goals.buffer")}</Label><Input type="number" step="0.01" value={goal.buffer || ""} onChange={e => updateGoalForm(idx, "buffer", parseFloat(e.target.value) || 0)} /></div>
                  </div>
                  <p className="text-sm font-medium text-primary">
                    {t("goals.targetAmount", { amount: target.toLocaleString(), currency: cs })}
                    {goal.goal_type === "yearly" && <span className="text-xs text-muted-foreground ml-1">({cs}{Math.round(target / 12).toLocaleString()}/mo)</span>}
                  </p>
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
