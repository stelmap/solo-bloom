import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import { BreakevenProgress } from "@/components/BreakevenProgress";
import { SmartInsights, generateInsights } from "@/components/SmartInsights";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Users, TrendingUp, TrendingDown, Clock, Target, AlertTriangle, Receipt } from "lucide-react";
import { useDashboardStats, useBreakevenGoals, useServices, useTaxSettings, useExpectedPayments } from "@/hooks/useData";
import { format } from "date-fns";
import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { sessionsNeededForTarget } from "@/lib/capacity";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: goals = [] } = useBreakevenGoals();
  const { data: services = [] } = useServices();
  const { data: taxSettings = [] } = useTaxSettings();
  const { data: expectedPayments = [] } = useExpectedPayments();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const s = stats ?? {
    todayIncome: 0, monthlyIncome: 0, monthlyExpenses: 0, netProfit: 0,
    clientCount: 0, todayAppointments: [], thisWeekIncome: 0, lastWeekIncome: 0,
    monthlyAppointments: 0, maxMonthlyCapacity: 0, daysPastInMonth: 1, daysLeftInMonth: 0,
    remainingMonthlyCapacity: 0, remainingWorkingDays: 0, totalWorkingDays: 0,
  };

  const avgServicePrice = services.length > 0
    ? services.reduce((sum, sv) => sum + Number(sv.price), 0) / services.length : 1;

  const remainingCapacity = Math.max((s.remainingMonthlyCapacity ?? s.maxMonthlyCapacity) - s.monthlyAppointments, 0);

  // Tax calculations
  const activeTaxes = (taxSettings as any[]).filter((ts: any) => ts.is_active);
  const monthlyTaxEstimate = useMemo(() => {
    let total = 0;
    for (const tax of activeTaxes) {
      if (tax.tax_type === "percentage") {
        total += s.monthlyIncome * (Number(tax.tax_rate) / 100);
      } else if (tax.tax_type === "fixed") {
        const amount = Number(tax.fixed_amount);
        total += tax.frequency === "quarterly" ? amount / 3 : amount;
      }
    }
    return Math.round(total);
  }, [activeTaxes, s.monthlyIncome]);

  const pendingTotal = (expectedPayments as any[]).reduce((sum: number, ep: any) => sum + Number(ep.amount), 0);
  const netAfterTax = s.monthlyIncome - monthlyTaxEstimate;
  const netProfit = netAfterTax - s.monthlyExpenses;

  const insights = useMemo(() => generateInsights({
    monthlyIncome: s.monthlyIncome,
    monthlyExpenses: s.monthlyExpenses,
    lastWeekIncome: s.lastWeekIncome,
    thisWeekIncome: s.thisWeekIncome,
    monthlyAppointments: s.monthlyAppointments,
    maxMonthlyCapacity: s.maxMonthlyCapacity,
    daysLeftInMonth: s.daysLeftInMonth,
    daysPastInMonth: s.daysPastInMonth,
  }, lang), [s, lang]);

  const goalTargets = (goals as any[]).map((g: any) => ({
    ...g,
    target: Number(g.fixed_expenses) + Number(g.desired_income) + Number(g.buffer),
  }));

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">{t("dashboard.loading")}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("dashboard.greeting")}</h1>
          <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
        </div>

        {/* Clickable metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="cursor-pointer" onClick={() => navigate("/income?range=today")}>
            <MetricCard title={t("dashboard.todayIncome")} value={`€${s.todayIncome.toLocaleString()}`} icon={DollarSign} />
          </div>
          <div className="cursor-pointer" onClick={() => navigate("/income?range=month")}>
            <MetricCard title={t("finance.grossIncome")} value={`€${s.monthlyIncome.toLocaleString()}`} icon={TrendingUp}
              subtitle={pendingTotal > 0 ? `+ €${pendingTotal.toLocaleString()} ${t("income.pendingPayments").toLowerCase()}` : undefined} />
          </div>
          <div className="cursor-pointer" onClick={() => navigate("/expenses?range=month")}>
            <MetricCard title={t("dashboard.monthlyExpenses")} value={`€${s.monthlyExpenses.toLocaleString()}`} icon={TrendingDown} />
          </div>
          <MetricCard title={t("dashboard.activeClients")} value={s.clientCount.toString()} icon={Users} />
        </div>

        {/* Tax & net profit row */}
        {activeTaxes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={cn("bg-card rounded-xl border p-5 animate-fade-in border-warning/30")}>
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="h-4 w-4 text-warning" />
                <p className="text-sm text-warning">{t("finance.totalTaxes")}</p>
              </div>
              <p className="text-2xl font-bold text-warning">€{monthlyTaxEstimate.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("finance.taxImpact", { amount: monthlyTaxEstimate })}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
              <p className="text-sm text-muted-foreground">{t("finance.netAfterTax")}</p>
              <p className="text-2xl font-bold text-foreground mt-1">€{netAfterTax.toLocaleString()}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
              <p className="text-sm text-muted-foreground">{t("finance.netProfit")}</p>
              <p className={cn("text-2xl font-bold mt-1", netProfit >= 0 ? "text-success" : "text-destructive")}>€{netProfit.toLocaleString()}</p>
            </div>
          </div>
        )}

        <SmartInsights insights={insights} />

        {/* Goal progress on dashboard */}
        {goalTargets.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                <Target className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">{t("dashboard.goals")}</h3>
            </div>
            <div className="space-y-4">
              {goalTargets.map((goal: any) => {
                // Include tax in goal target
                const taxAdjustedTarget = activeTaxes.length > 0
                  ? goal.target + (activeTaxes.reduce((sum: number, tax: any) => {
                      if (tax.tax_type === "percentage") return sum + goal.target * (Number(tax.tax_rate) / 100);
                      if (tax.tax_type === "fixed") return sum + (tax.frequency === "quarterly" ? Number(tax.fixed_amount) / 3 : Number(tax.fixed_amount));
                      return sum;
                    }, 0))
                  : goal.target;
                const target = Math.round(taxAdjustedTarget);
                const progress = Math.min((s.monthlyIncome / Math.max(target, 1)) * 100, 100);
                const remaining = Math.max(target - s.monthlyIncome, 0);
                const { sessionsNeeded, isRealistic } = sessionsNeededForTarget(remaining, avgServicePrice, remainingCapacity);
                const reached = s.monthlyIncome >= target;
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-foreground">
                        {goal.label}
                        {reached && <span className="text-success ml-2 text-xs">{t("goals.reached")}</span>}
                      </span>
                      <span className="text-muted-foreground">€{s.monthlyIncome.toLocaleString()} / €{target.toLocaleString()}</span>
                    </div>
                    <Progress value={progress} className={cn("h-2", reached ? "[&>div]:bg-success" : "")} />
                    {remaining > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {t("dashboard.appointmentsNeeded", { count: sessionsNeeded })}
                        </p>
                        {!isRealistic && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-warning">
                            <AlertTriangle className="h-3 w-3" />
                            {t("capacity.exceedsCapacity")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BreakevenProgress
            currentIncome={s.monthlyIncome}
            requiredIncome={Math.max(s.monthlyExpenses + monthlyTaxEstimate, 1)}
          />

          <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                <Clock className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t("dashboard.todayAppointments")}</h3>
                <p className="text-sm text-muted-foreground">{s.todayAppointments.length} {t("dashboard.sessions")}</p>
              </div>
            </div>
            <div className="space-y-3">
              {s.todayAppointments.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("dashboard.noAppointments")}</p>
              )}
              {s.todayAppointments.map((apt: any) => (
                <div key={apt.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="text-center min-w-[50px]">
                    <p className="text-sm font-semibold text-foreground">{format(new Date(apt.scheduled_at), "HH:mm")}</p>
                    <p className="text-xs text-muted-foreground">{apt.duration_minutes}{t("common.min")}</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{apt.clients?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{apt.services?.name}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">€{Number(apt.price).toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
