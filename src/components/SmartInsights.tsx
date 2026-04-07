import { useMemo } from "react";
import {
  TrendingUp, TrendingDown, Target, AlertTriangle,
  CalendarCheck, Zap, CheckCircle, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightType = "success" | "info" | "warning" | "risk";

export interface Insight {
  id: string;
  type: InsightType;
  message: string;
  icon: React.ElementType;
}

interface SmartInsightsProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  lastWeekIncome: number;
  thisWeekIncome: number;
  monthlyAppointments: number;
  maxMonthlyCapacity: number;
  daysLeftInMonth: number;
  daysPastInMonth: number;
}

const typeStyles: Record<InsightType, string> = {
  success: "bg-success/10 text-success border-success/20",
  info: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  risk: "bg-destructive/10 text-destructive border-destructive/20",
};

export function generateInsights(data: SmartInsightsProps): Insight[] {
  const insights: Insight[] = [];
  const {
    monthlyIncome, monthlyExpenses, lastWeekIncome, thisWeekIncome,
    monthlyAppointments, maxMonthlyCapacity, daysLeftInMonth, daysPastInMonth,
  } = data;

  // --- Income insights ---
  if (thisWeekIncome > 0) {
    insights.push({
      id: "week-income",
      type: "info",
      message: `You earned €${thisWeekIncome.toLocaleString()} this week.`,
      icon: TrendingUp,
    });
  }

  if (lastWeekIncome > 0 && thisWeekIncome > 0) {
    const diff = thisWeekIncome - lastWeekIncome;
    const pct = Math.round(Math.abs(diff / lastWeekIncome) * 100);
    if (diff > 0) {
      insights.push({
        id: "income-trend",
        type: "success",
        message: `Your income increased ${pct}% compared to last week. Keep it up!`,
        icon: TrendingUp,
      });
    } else if (diff < 0) {
      insights.push({
        id: "income-trend",
        type: "warning",
        message: `Your income decreased ${pct}% compared to last week.`,
        icon: TrendingDown,
      });
    }
  }

  // --- Break-even insights ---
  if (monthlyExpenses > 0) {
    const breakevenPct = Math.min(Math.round((monthlyIncome / monthlyExpenses) * 100), 100);

    if (monthlyIncome >= monthlyExpenses) {
      insights.push({
        id: "breakeven-reached",
        type: "success",
        message: `You've reached your break-even point this month! 🎉`,
        icon: CheckCircle,
      });
    } else {
      const remaining = monthlyExpenses - monthlyIncome;
      insights.push({
        id: "breakeven-progress",
        type: "info",
        message: `You are ${breakevenPct}% toward your break-even. €${remaining.toLocaleString()} more to go.`,
        icon: Target,
      });

      // Risk: projected to miss break-even
      if (daysPastInMonth > 7 && daysLeftInMonth > 0) {
        const dailyRate = monthlyIncome / daysPastInMonth;
        const projected = monthlyIncome + dailyRate * daysLeftInMonth;
        if (projected < monthlyExpenses) {
          insights.push({
            id: "breakeven-risk",
            type: "risk",
            message: `At this pace, you may not reach break-even this month. Consider booking more sessions.`,
            icon: AlertTriangle,
          });
        }
      }
    }
  }

  // --- Expense alert ---
  if (monthlyExpenses > monthlyIncome * 1.5 && monthlyIncome > 0) {
    insights.push({
      id: "expense-alert",
      type: "risk",
      message: `Your expenses are significantly higher than your income this month.`,
      icon: AlertTriangle,
    });
  }

  // --- Capacity insights ---
  if (maxMonthlyCapacity > 0) {
    const capacityPct = Math.round((monthlyAppointments / maxMonthlyCapacity) * 100);

    if (capacityPct >= 90) {
      insights.push({
        id: "capacity-full",
        type: "success",
        message: `You're working at ${capacityPct}% capacity — almost fully booked!`,
        icon: Zap,
      });
    } else if (capacityPct >= 60) {
      insights.push({
        id: "capacity-good",
        type: "info",
        message: `You're working at ${capacityPct}% capacity this month.`,
        icon: CalendarCheck,
      });
    } else if (monthlyAppointments > 0) {
      const freeSlots = maxMonthlyCapacity - monthlyAppointments;
      insights.push({
        id: "capacity-free",
        type: "info",
        message: `You have ${freeSlots} free slots available this month. Time to fill them!`,
        icon: CalendarCheck,
      });
    }
  }

  return insights;
}

export function SmartInsights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Smart Insights</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border transition-colors",
              typeStyles[insight.type]
            )}
          >
            <insight.icon className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{insight.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
