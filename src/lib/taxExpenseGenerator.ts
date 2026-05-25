/**
 * Tax expense generation utilities.
 * Generates expense entries from active tax rules for display and syncing.
 */

import { startOfMonth, endOfMonth, addMonths, format, startOfQuarter, addQuarters, endOfQuarter } from "date-fns";

export interface TaxRule {
  id: string;
  tax_name: string;
  tax_type: string; // "percentage" | "fixed"
  tax_rate: number;
  fixed_amount: number;
  frequency: string; // "monthly" | "quarterly"
  is_active: boolean;
  calculate_on: string; // "actual_income" | "all_income" | "expenses" | "profit"
  start_calculation_date: string; // "YYYY-MM-DD"
}

export interface GeneratedTaxExpense {
  tax_setting_id: string;
  tax_name: string;
  category: "Tax";
  amount: number;
  date: string; // first day of the period
  description: string;
  is_recurring: true;
  frequency: string;
  period_label: string;
}

/**
 * Generate tax expense periods from start_calculation_date to endDate.
 * For monthly taxes: one entry per month
 * For quarterly taxes: one entry per quarter
 */
export function generateTaxExpensePeriods(
  tax: TaxRule,
  endDate: Date,
  periodIncomeMap?: Map<string, number>,
  periodExpenseMap?: Map<string, number>,
): GeneratedTaxExpense[] {
  if (!tax.is_active) return [];

  const startDate = new Date(tax.start_calculation_date + "T12:00:00");
  const results: GeneratedTaxExpense[] = [];
  const today = new Date();

  if (tax.frequency === "quarterly") {
    // Emit one entry per quarter from the configured start date through the
    // current quarter (inclusive). The entry date is the first day of the
    // quarter itself so recurring taxes are visible immediately.
    let periodStart = startOfQuarter(startDate);
    const lastPeriodStart = startOfQuarter(today);
    while (periodStart <= lastPeriodStart && periodStart <= endDate) {
      const periodKey = format(periodStart, "yyyy-'Q'") + Math.ceil((periodStart.getMonth() + 1) / 3);
      const periodLabel = `Q${Math.ceil((periodStart.getMonth() + 1) / 3)} ${periodStart.getFullYear()}`;
      const amount = calculateTaxAmount(tax, periodKey, periodIncomeMap, periodExpenseMap);
      results.push({
        tax_setting_id: tax.id,
        tax_name: tax.tax_name,
        category: "Tax",
        amount,
        date: format(periodStart, "yyyy-MM-dd"),
        description: `${tax.tax_name} — ${periodLabel}`,
        is_recurring: true,
        frequency: "quarterly",
        period_label: periodLabel,
      });
      periodStart = addQuarters(periodStart, 1);
    }
  } else {
    // Emit one entry per month from the start date through the current month
    // (inclusive). The entry date is the first day of the month itself.
    let periodStart = startOfMonth(startDate);
    const lastPeriodStart = startOfMonth(today);
    while (periodStart <= lastPeriodStart && periodStart <= endDate) {
      const periodKey = format(periodStart, "yyyy-MM");
      const periodLabel = format(periodStart, "MMM yyyy");
      const amount = calculateTaxAmount(tax, periodKey, periodIncomeMap, periodExpenseMap);
      results.push({
        tax_setting_id: tax.id,
        tax_name: tax.tax_name,
        category: "Tax",
        amount,
        date: format(periodStart, "yyyy-MM-dd"),
        description: `${tax.tax_name} — ${periodLabel}`,
        is_recurring: true,
        frequency: "monthly",
        period_label: periodLabel,
      });
      periodStart = addMonths(periodStart, 1);
    }
  }

  return results;
}

/**
 * Compute the next accrual date for an active tax rule (the first day of
 * the next period after the most recent completed period). Returns null
 * if the rule is inactive or its start date is in the future.
 */
export function nextAccrualDate(tax: TaxRule, now: Date = new Date()): Date | null {
  if (!tax.is_active) return null;
  const startDate = new Date(tax.start_calculation_date + "T12:00:00");
  if (tax.frequency === "quarterly") {
    const currentPeriodStart = startOfQuarter(now > startDate ? now : startDate);
    return addQuarters(currentPeriodStart, 1);
  }
  const currentPeriodStart = startOfMonth(now > startDate ? now : startDate);
  return addMonths(currentPeriodStart, 1);
}

function calculateTaxAmount(
  tax: TaxRule,
  _periodKey: string,
  periodIncomeMap?: Map<string, number>,
  periodExpenseMap?: Map<string, number>,
): number {
  if (tax.tax_type === "fixed") {
    return Number(tax.fixed_amount);
  }
  
  // Percentage-based
  const rate = Number(tax.tax_rate) / 100;
  
  if (tax.calculate_on === "expenses" && periodExpenseMap) {
    return Math.round((periodExpenseMap.get(_periodKey) || 0) * rate);
  }
  
  if (tax.calculate_on === "profit" && periodIncomeMap && periodExpenseMap) {
    const income = periodIncomeMap.get(_periodKey) || 0;
    const expenses = periodExpenseMap.get(_periodKey) || 0;
    return Math.round(Math.max(income - expenses, 0) * rate);
  }
  
  // Default: income-based
  if (periodIncomeMap) {
    return Math.round((periodIncomeMap.get(_periodKey) || 0) * rate);
  }
  
  return 0;
}
