import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import { Progress } from "@/components/ui/progress";
import { Target, DollarSign, Users, Calculator } from "lucide-react";

const monthlyExpenses = 1850;
const monthlyIncome = 4280;
const avgServicePrice = 76;
const sessionsNeeded = Math.ceil(monthlyExpenses / avgServicePrice);
const sessionsCompleted = Math.floor(monthlyIncome / avgServicePrice);
const progressPercent = Math.min((monthlyIncome / monthlyExpenses) * 100, 100);

export default function BreakevenPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Break-even Analysis</h1>
          <p className="text-muted-foreground mt-1">Understand how much you need to earn to cover costs</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Monthly Expenses" value={`€${monthlyExpenses.toLocaleString()}`} icon={DollarSign} />
          <MetricCard title="Break-even Amount" value={`€${monthlyExpenses.toLocaleString()}`} icon={Target} subtitle="Income needed to cover costs" />
          <MetricCard title="Sessions Needed" value={sessionsNeeded.toString()} icon={Users} subtitle={`At avg €${avgServicePrice}/session`} />
          <MetricCard title="Sessions Done" value={sessionsCompleted.toString()} icon={Calculator} trend={{ value: `${sessionsCompleted}/${sessionsNeeded}`, positive: sessionsCompleted >= sessionsNeeded }} />
        </div>

        <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
          <h3 className="font-semibold text-foreground mb-4">Monthly Progress</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Income vs Expenses</span>
                <span className="font-medium text-foreground">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-4" />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>€0</span>
                <span className="text-primary font-medium">Break-even: €{monthlyExpenses.toLocaleString()}</span>
                <span>€{monthlyIncome.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">€{monthlyIncome.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Current Income</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">€{monthlyExpenses.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-success/10">
                <p className="text-2xl font-bold text-success">€{(monthlyIncome - monthlyExpenses).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Net Profit</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
