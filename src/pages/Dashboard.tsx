import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import { BreakevenProgress } from "@/components/BreakevenProgress";
import { DollarSign, Users, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { useDashboardStats } from "@/hooks/useData";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading dashboard...</div>
      </AppLayout>
    );
  }

  const s = stats ?? { todayIncome: 0, monthlyIncome: 0, monthlyExpenses: 0, netProfit: 0, clientCount: 0, todayAppointments: [] };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good morning! 👋</h1>
          <p className="text-muted-foreground mt-1">Here's how your business is doing today.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Today's Income" value={`€${s.todayIncome.toLocaleString()}`} icon={DollarSign} />
          <MetricCard title="Monthly Income" value={`€${s.monthlyIncome.toLocaleString()}`} icon={TrendingUp} />
          <MetricCard title="Monthly Expenses" value={`€${s.monthlyExpenses.toLocaleString()}`} icon={TrendingDown} />
          <MetricCard title="Active Clients" value={s.clientCount.toString()} icon={Users} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BreakevenProgress
            currentIncome={s.monthlyIncome}
            requiredIncome={Math.max(s.monthlyExpenses, 1)}
          />

          {/* Today's appointments */}
          <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                <Clock className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Today's Appointments</h3>
                <p className="text-sm text-muted-foreground">{s.todayAppointments.length} sessions</p>
              </div>
            </div>
            <div className="space-y-3">
              {s.todayAppointments.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No appointments today</p>
              )}
              {s.todayAppointments.map((apt: any) => (
                <div key={apt.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="text-center min-w-[50px]">
                    <p className="text-sm font-semibold text-foreground">{format(new Date(apt.scheduled_at), "HH:mm")}</p>
                    <p className="text-xs text-muted-foreground">{apt.duration_minutes}m</p>
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
