import {
  TrendingUp, TrendingDown, Target, AlertTriangle,
  CalendarCheck, Zap, CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { translations, Language } from "@/i18n/translations";

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

function tt(key: keyof typeof translations, lang: Language, params?: Record<string, string | number>): string {
  const entry = translations[key];
  if (!entry) return key;
  let text: string = entry[lang] || entry.en;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}

export function generateInsights(data: SmartInsightsProps, lang: Language = "en", currencySymbol: string = "€"): Insight[] {
  const insights: Insight[] = [];
  const {
    monthlyIncome, monthlyExpenses, lastWeekIncome, thisWeekIncome,
    monthlyAppointments, maxMonthlyCapacity, daysLeftInMonth, daysPastInMonth,
  } = data;

  if (thisWeekIncome > 0) {
    insights.push({
      id: "week-income", type: "info",
      message: tt("insights.weekIncome", lang, { amount: thisWeekIncome.toLocaleString(), currency: currencySymbol }),
      icon: TrendingUp,
    });
  }

  if (lastWeekIncome > 0 && thisWeekIncome > 0) {
    const diff = thisWeekIncome - lastWeekIncome;
    const pct = Math.round(Math.abs(diff / lastWeekIncome) * 100);
    if (diff > 0) {
      insights.push({ id: "income-trend", type: "success", message: tt("insights.incomeUp", lang, { pct }), icon: TrendingUp });
    } else if (diff < 0) {
      insights.push({ id: "income-trend", type: "warning", message: tt("insights.incomeDown", lang, { pct }), icon: TrendingDown });
    }
  }

  if (monthlyExpenses > 0) {
    const breakevenPct = Math.min(Math.round((monthlyIncome / monthlyExpenses) * 100), 100);
    if (monthlyIncome >= monthlyExpenses) {
      insights.push({ id: "breakeven-reached", type: "success", message: tt("insights.breakevenReached", lang), icon: CheckCircle });
    } else {
      const remaining = monthlyExpenses - monthlyIncome;
      insights.push({ id: "breakeven-progress", type: "info", message: tt("insights.breakevenProgress", lang, { pct: breakevenPct, remaining: remaining.toLocaleString(), currency: currencySymbol }), icon: Target });

      if (daysPastInMonth > 7 && daysLeftInMonth > 0) {
        const dailyRate = monthlyIncome / daysPastInMonth;
        const projected = monthlyIncome + dailyRate * daysLeftInMonth;
        if (projected < monthlyExpenses) {
          insights.push({ id: "breakeven-risk", type: "risk", message: tt("insights.breakevenRisk", lang), icon: AlertTriangle });
        }
      }
    }
  }

  if (monthlyExpenses > monthlyIncome * 1.5 && monthlyIncome > 0) {
    insights.push({ id: "expense-alert", type: "risk", message: tt("insights.expenseAlert", lang), icon: AlertTriangle });
  }

  if (maxMonthlyCapacity > 0) {
    const capacityPct = Math.round((monthlyAppointments / maxMonthlyCapacity) * 100);
    if (capacityPct >= 90) {
      insights.push({ id: "capacity-full", type: "success", message: tt("insights.capacityFull", lang, { pct: capacityPct }), icon: Zap });
    } else if (capacityPct >= 60) {
      insights.push({ id: "capacity-good", type: "info", message: tt("insights.capacityGood", lang, { pct: capacityPct }), icon: CalendarCheck });
    } else if (monthlyAppointments > 0) {
      const freeSlots = maxMonthlyCapacity - monthlyAppointments;
      insights.push({ id: "capacity-free", type: "info", message: tt("insights.capacityFree", lang, { slots: freeSlots }), icon: CalendarCheck });
    }
  }

  return insights;
}

export function SmartInsights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">{translations["insights.title"]?.en ?? "Smart Insights"}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {insights.map((insight) => (
          <div key={insight.id} className={cn("flex items-start gap-3 p-4 rounded-xl border transition-colors", typeStyles[insight.type])}>
            <insight.icon className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{insight.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
