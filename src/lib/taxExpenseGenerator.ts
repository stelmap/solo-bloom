/**
 * Tax expense generation utilities.
 *
 * Two flavours:
 *  - Fixed taxes: a flat amount per period. Emit one entry per period from
 *    the configured start date through the CURRENT period (inclusive). Entry
 *    is dated on the first day of that period — so a fixed tax is visible in
 *    the current month immediately.
 *  - Percentage taxes: amount depends on actual income/expense data, so the
 *    entry can only be calculated after the source period has CLOSED. Emit
 *    one entry per closed period (from start through the previous period),
 *    dated on the first day of the FOLLOWING period — e.g. April's income
 *    produces a tax entry dated May 1st.
 */

import { startOfMonth, addMonths, format, startOfQuarter, addQuarters } from "date-fns";

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
  date: string; // entry date (period the tax appears in)
  description: string;
  is_recurring: true;
  frequency: string;
  period_label: string;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function quarterKey(d: Date) {
  return `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
}

export function generateTaxExpensePeriods(
  tax: TaxRule,
  _endDate: Date,
  periodIncomeMap?: Map<string, number>,
  periodExpenseMap?: Map<string, number>,
): GeneratedTaxExpense[] {
  if (!tax.is_active) return [];

  const startDate = new Date(tax.start_calculation_date + "T12:00:00");
  const today = new Date();
  const results: GeneratedTaxExpense[] = [];
  const isQuarterly = tax.frequency === "quarterly";
  const stepFn = isQuarterly ? addQuarters : addMonths;
  const startOfPeriodFn = isQuarterly ? startOfQuarter : startOfMonth;
  const keyFn = isQuarterly ? quarterKey : monthKey;

  if (tax.tax_type === "fixed") {
    // Fixed amount — emit immediately for every period from start through current.
    let periodStart = startOfPeriodFn(startDate);
    const lastPeriodStart = startOfPeriodFn(today);
    while (periodStart <= lastPeriodStart) {
      // Never date entries before the configured start date.
      const entryDate = periodStart < startDate ? startDate : periodStart;
      const label = isQuarterly
        ? `Q${Math.ceil((periodStart.getMonth() + 1) / 3)} ${periodStart.getFullYear()}`
        : format(periodStart, "MMM yyyy");
      results.push({
        tax_setting_id: tax.id,
        tax_name: tax.tax_name,
        category: "Tax",
        amount: Number(tax.fixed_amount) || 0,
        date: format(entryDate, "yyyy-MM-dd"),
        description: `${tax.tax_name} — ${label}`,
        is_recurring: true,
        frequency: tax.frequency,
        period_label: label,
      });
      periodStart = stepFn(periodStart, 1);
    }
    return results;
  }

  // Percentage — emit one entry per CLOSED source period, posted in the NEXT period.
  let sourceStart = startOfPeriodFn(startDate);
  const previousPeriodStart = stepFn(startOfPeriodFn(today), -1);
  while (sourceStart <= previousPeriodStart) {
    const sourceKey = keyFn(sourceStart);
    const amount = calculateTaxAmount(tax, sourceKey, periodIncomeMap, periodExpenseMap);
    const accrualDate = stepFn(sourceStart, 1);
    const sourceLabel = isQuarterly
      ? `Q${Math.ceil((sourceStart.getMonth() + 1) / 3)} ${sourceStart.getFullYear()}`
      : format(sourceStart, "MMM yyyy");
    if (amount > 0) {
      results.push({
        tax_setting_id: tax.id,
        tax_name: tax.tax_name,
        category: "Tax",
        amount,
        date: format(accrualDate, "yyyy-MM-dd"),
        description: `${tax.tax_name} — ${sourceLabel}`,
        is_recurring: true,
        frequency: tax.frequency,
        period_label: sourceLabel,
      });
    }
    sourceStart = stepFn(sourceStart, 1);
  }
  return results;
}

/**
 * Next accrual date — first day of the next period after the most recent
 * completed source period. Returns null for inactive rules.
 */
export function nextAccrualDate(tax: TaxRule, now: Date = new Date()): Date | null {
  if (!tax.is_active) return null;
  const startDate = new Date(tax.start_calculation_date + "T12:00:00");
  if (tax.frequency === "quarterly") {
    const base = now > startDate ? now : startDate;
    return addQuarters(startOfQuarter(base), 1);
  }
  const base = now > startDate ? now : startDate;
  return addMonths(startOfMonth(base), 1);
}

function calculateTaxAmount(
  tax: TaxRule,
  periodKey: string,
  periodIncomeMap?: Map<string, number>,
  periodExpenseMap?: Map<string, number>,
): number {
  if (tax.tax_type === "fixed") return Number(tax.fixed_amount) || 0;

  const rate = Number(tax.tax_rate) / 100;

  if (tax.calculate_on === "expenses" && periodExpenseMap) {
    return Math.round((periodExpenseMap.get(periodKey) || 0) * rate);
  }
  if (tax.calculate_on === "profit" && periodIncomeMap && periodExpenseMap) {
    const income = periodIncomeMap.get(periodKey) || 0;
    const expenses = periodExpenseMap.get(periodKey) || 0;
    return Math.round(Math.max(income - expenses, 0) * rate);
  }
  if (periodIncomeMap) {
    return Math.round((periodIncomeMap.get(periodKey) || 0) * rate);
  }
  return 0;
}
