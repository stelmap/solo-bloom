/**
 * Tax expense generation utilities.
 * Generates expense entries from active tax rules for display and syncing.
 */

import { startOfMonth, endOfMonth, addMonths, format, startOfQuarter, addQuarters } from "date-fns";

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
  
  if (tax.frequency === "quarterly") {
    let current = startOfQuarter(startDate);
    while (current <= endDate) {
      const periodKey = format(current, "yyyy-'Q'") + Math.ceil((current.getMonth() + 1) / 3);
      const dateStr = format(current, "yyyy-MM-dd");
      
      if (dateStr >= tax.start_calculation_date) {
        const amount = calculateTaxAmount(tax, periodKey, periodIncomeMap, periodExpenseMap);
        results.push({
          tax_setting_id: tax.id,
          tax_name: tax.tax_name,
          category: "Tax",
          amount,
          date: dateStr,
          description: `${tax.tax_name} — Q${Math.ceil((current.getMonth() + 1) / 3)} ${current.getFullYear()}`,
          is_recurring: true,
          frequency: "quarterly",
          period_label: `Q${Math.ceil((current.getMonth() + 1) / 3)} ${current.getFullYear()}`,
        });
      }
      current = addQuarters(current, 1);
    }
  } else {
    // monthly
    let current = startOfMonth(startDate);
    while (current <= endDate) {
      const dateStr = format(current, "yyyy-MM-dd");
      const periodKey = format(current, "yyyy-MM");
      
      if (dateStr >= format(startOfMonth(startDate), "yyyy-MM-dd")) {
        const amount = calculateTaxAmount(tax, periodKey, periodIncomeMap, periodExpenseMap);
        results.push({
          tax_setting_id: tax.id,
          tax_name: tax.tax_name,
          category: "Tax",
          amount,
          date: dateStr,
          description: `${tax.tax_name} — ${format(current, "MMM yyyy")}`,
          is_recurring: true,
          frequency: "monthly",
          period_label: format(current, "MMM yyyy"),
        });
      }
      current = addMonths(current, 1);
    }
  }
  
  return results;
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
