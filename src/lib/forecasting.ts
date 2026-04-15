/**
 * Forecasting utilities for break-even and goal tracking.
 * Uses historical data to predict future performance.
 */

import { format, subMonths, startOfMonth, endOfMonth, addMonths } from "date-fns";

export interface MonthlyData {
  month: string; // "YYYY-MM"
  label: string; // "Jan", "Feb", etc.
  income: number;
  expenses: number;
  taxExpenses: number;
  net: number;
  sessions: number;
  isActual: boolean;
  isForecast: boolean;
}

export interface GoalForecast {
  monthlyData: MonthlyData[];
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  avgMonthlySessions: number;
  trendDirection: "up" | "down" | "flat";
  monthsToGoal: number | null; // null if unreachable
  goalReachedMonth: string | null;
  progressPercent: number;
}

/**
 * Build 12-month timeline with actuals and forecast.
 */
export function buildGoalForecast(
  incomeByMonth: Map<string, number>,
  expensesByMonth: Map<string, number>,
  taxByMonth: Map<string, number>,
  sessionsByMonth: Map<string, number>,
  goalTarget: number,
  referenceDate = new Date(),
  lookbackMonths = 6,
): GoalForecast {
  const months: MonthlyData[] = [];
  
  // Collect last 6 months of actual data for trend
  const actualMonths: { income: number; expenses: number; sessions: number }[] = [];
  for (let i = lookbackMonths; i >= 1; i--) {
    const d = subMonths(referenceDate, i);
    const key = format(d, "yyyy-MM");
    actualMonths.push({
      income: incomeByMonth.get(key) || 0,
      expenses: (expensesByMonth.get(key) || 0) + (taxByMonth.get(key) || 0),
      sessions: sessionsByMonth.get(key) || 0,
    });
  }
  
  // Calculate averages from non-zero months
  const nonZeroActuals = actualMonths.filter(a => a.income > 0 || a.expenses > 0);
  const avgIncome = nonZeroActuals.length > 0
    ? nonZeroActuals.reduce((s, a) => s + a.income, 0) / nonZeroActuals.length
    : 0;
  const avgExpenses = nonZeroActuals.length > 0
    ? nonZeroActuals.reduce((s, a) => s + a.expenses, 0) / nonZeroActuals.length
    : 0;
  const avgSessions = nonZeroActuals.length > 0
    ? nonZeroActuals.reduce((s, a) => s + a.sessions, 0) / nonZeroActuals.length
    : 0;
  
  // Trend: compare last 3 months vs previous 3
  let trendDirection: "up" | "down" | "flat" = "flat";
  if (nonZeroActuals.length >= 4) {
    const mid = Math.floor(nonZeroActuals.length / 2);
    const firstHalf = nonZeroActuals.slice(0, mid).reduce((s, a) => s + a.income, 0) / mid;
    const secondHalf = nonZeroActuals.slice(mid).reduce((s, a) => s + a.income, 0) / (nonZeroActuals.length - mid);
    if (secondHalf > firstHalf * 1.05) trendDirection = "up";
    else if (secondHalf < firstHalf * 0.95) trendDirection = "down";
  }
  
  // Growth factor for forecasting
  const growthFactor = trendDirection === "up" ? 1.03 : trendDirection === "down" ? 0.97 : 1.0;
  
  // Build 12-month view: past months + current + future
  let goalReachedMonth: string | null = null;
  let monthsToGoal: number | null = null;
  
  for (let i = -5; i <= 6; i++) {
    const d = addMonths(startOfMonth(referenceDate), i);
    const key = format(d, "yyyy-MM");
    const label = format(d, "MMM");
    const isCurrentOrPast = d <= endOfMonth(referenceDate);
    
    const actualIncome = incomeByMonth.get(key) || 0;
    const actualExpenses = expensesByMonth.get(key) || 0;
    const actualTax = taxByMonth.get(key) || 0;
    const actualSessions = sessionsByMonth.get(key) || 0;
    
    if (isCurrentOrPast) {
      const totalExp = actualExpenses + actualTax;
      months.push({
        month: key,
        label,
        income: actualIncome,
        expenses: actualExpenses,
        taxExpenses: actualTax,
        net: actualIncome - totalExp,
        sessions: actualSessions,
        isActual: true,
        isForecast: false,
      });
      
      if (actualIncome >= goalTarget && !goalReachedMonth) {
        goalReachedMonth = key;
      }
    } else {
      // Forecast
      const monthsFromNow = i;
      const forecastIncome = Math.round(avgIncome * Math.pow(growthFactor, monthsFromNow));
      const forecastExpenses = Math.round(avgExpenses);
      const forecastSessions = Math.round(avgSessions);
      
      months.push({
        month: key,
        label,
        income: forecastIncome,
        expenses: forecastExpenses,
        taxExpenses: 0,
        net: forecastIncome - forecastExpenses,
        sessions: forecastSessions,
        isActual: false,
        isForecast: true,
      });
      
      if (forecastIncome >= goalTarget && !goalReachedMonth) {
        goalReachedMonth = key;
        monthsToGoal = monthsFromNow;
      }
    }
  }
  
  // If goal not reached in forecast period
  if (!goalReachedMonth && avgIncome > 0) {
    const monthlyNet = avgIncome - avgExpenses;
    if (monthlyNet > 0 && goalTarget > avgIncome) {
      // Won't reach in single month, estimate based on accumulation 
      monthsToGoal = null;
    }
  }
  
  // Current month progress
  const currentKey = format(referenceDate, "yyyy-MM");
  const currentIncome = incomeByMonth.get(currentKey) || 0;
  const progressPercent = goalTarget > 0 ? Math.min((currentIncome / goalTarget) * 100, 100) : 0;
  
  return {
    monthlyData: months,
    avgMonthlyIncome: Math.round(avgIncome),
    avgMonthlyExpenses: Math.round(avgExpenses),
    avgMonthlySessions: Math.round(avgSessions),
    trendDirection,
    monthsToGoal,
    goalReachedMonth,
    progressPercent,
  };
}
