import { AppLayout } from "@/components/AppLayout";
import { MetricCard } from "@/components/MetricCard";
import { BreakevenProgress } from "@/components/BreakevenProgress";
import { UpcomingAppointments } from "@/components/UpcomingAppointments";
import { DollarSign, Users, TrendingUp, TrendingDown } from "lucide-react";

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good morning! 👋</h1>
          <p className="text-muted-foreground mt-1">Here's how your business is doing today.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Today's Income"
            value="€345"
            icon={DollarSign}
            trend={{ value: "+12%", positive: true }}
          />
          <MetricCard
            title="Monthly Income"
            value="€4,280"
            icon={TrendingUp}
            trend={{ value: "+8%", positive: true }}
          />
          <MetricCard
            title="Monthly Expenses"
            value="€1,850"
            icon={TrendingDown}
            subtitle="Rent, materials, insurance"
          />
          <MetricCard
            title="Active Clients"
            value="32"
            icon={Users}
            trend={{ value: "+3", positive: true }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BreakevenProgress currentIncome={4280} requiredIncome={5200} />
          <UpcomingAppointments />
        </div>
      </div>
    </AppLayout>
  );
}
