import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import { Progress } from "@/components/ui/progress";
import { Target, DollarSign, Users, Calculator } from "lucide-react";
import { useExpenses, useIncome, useServices, useAppointments } from "@/hooks/useData";
import { useLanguage } from "@/i18n/LanguageContext";

export default function BreakevenPage() {
  const { data: expenses = [] } = useExpenses();
  const { data: income = [] } = useIncome();
  const { data: services = [] } = useServices();
  const { data: appointments = [] } = useAppointments();
  const { t } = useLanguage();

  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.substring(0, 7) + "-01";

  const monthlyExpenses = expenses.filter(e => e.date >= monthStart).reduce((s, e) => s + Number(e.amount), 0);
  const monthlyIncome = income.filter(i => i.date >= monthStart).reduce((s, i) => s + Number(i.amount), 0);

  const avgServicePrice = services.length > 0
    ? services.reduce((s, sv) => s + Number(sv.price), 0) / services.length
    : 1;

  const sessionsNeeded = Math.ceil(monthlyExpenses / avgServicePrice);
  const sessionsCompleted = appointments.filter(a =>
    a.status === "completed" && a.scheduled_at >= monthStart + "T00:00:00"
  ).length;

  const breakevenTarget = Math.max(monthlyExpenses, 1);
  const progressPercent = Math.min((monthlyIncome / breakevenTarget) * 100, 150);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("breakevenPage.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("breakevenPage.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title={t("breakevenPage.monthlyExpenses")} value={`€${monthlyExpenses.toLocaleString()}`} icon={DollarSign} />
          <MetricCard title={t("breakevenPage.breakevenAmount")} value={`€${monthlyExpenses.toLocaleString()}`} icon={Target} subtitle={t("breakevenPage.incomeNeeded")} />
          <MetricCard title={t("breakevenPage.sessionsNeeded")} value={sessionsNeeded.toString()} icon={Users} subtitle={t("breakevenPage.atAvg", { price: avgServicePrice.toFixed(0) })} />
          <MetricCard title={t("breakevenPage.sessionsCompleted")} value={sessionsCompleted.toString()} icon={Calculator} />
        </div>

        <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
          <h3 className="font-semibold text-foreground mb-4">{t("breakevenPage.monthlyProgress")}</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{t("breakevenPage.incomeVsExpenses")}</span>
                <span className="font-medium text-foreground">{Math.min(Math.round(progressPercent), 100)}%</span>
              </div>
              <Progress value={Math.min(progressPercent, 100)} className="h-4" />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>€0</span>
                <span className="text-primary font-medium">{t("breakeven.title")}: €{monthlyExpenses.toLocaleString()}</span>
                <span>€{monthlyIncome.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">€{monthlyIncome.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{t("breakevenPage.currentIncome")}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">€{monthlyExpenses.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{t("breakevenPage.totalExpenses")}</p>
              </div>
              <div className={`text-center p-4 rounded-lg ${monthlyIncome >= monthlyExpenses ? "bg-success/10" : "bg-destructive/10"}`}>
                <p className={`text-2xl font-bold ${monthlyIncome >= monthlyExpenses ? "text-success" : "text-destructive"}`}>
                  €{(monthlyIncome - monthlyExpenses).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">{t("breakevenPage.netProfit")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
