/**
 * Helpers for materialized recurring expenses.
 *
 * Recurring expenses are stored as a TEMPLATE row (`is_template=true`,
 * `recurrence_type` set) plus N materialized INSTANCE rows (`template_id`
 * set, `instance_status` of `planned` | `paid` | `cancelled`).
 *
 * The legacy "expand virtually" helpers are gone — instances are real DB rows
 * now. This file provides the day-clamping and instance-generation utilities
 * used by `useCreateExpense` and the rolling-horizon top-up.
 */

export type ExpenseRow = {
  id: string;
  date: string; // yyyy-mm-dd
  amount: number | string;
  category: string;
  description?: string | null;
  is_recurring: boolean;
  recurring_start_date?: string | null;
  recurring_group_id?: string | null;
  payment_status?: string | null;
  instance_status?: "planned" | "paid" | "cancelled" | null;
  paid_date?: string | null;
  template_id?: string | null;
  is_template?: boolean | null;
  recurrence_type?: "monthly" | "yearly" | null;
  is_last_day_of_month?: boolean | null;
  tax_setting_id?: string | null;
  [k: string]: any;
};

function pad(n: number) { return String(n).padStart(2, "0"); }

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function isLastDayOfItsMonth(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  return d === daysInMonth(y, m - 1);
}

/** Compute the occurrence date for a recurring template in the given (year, monthIndex0). */
export function occurrenceDateFor(
  startDate: string,
  isLastDay: boolean,
  year: number,
  monthIndex0: number,
): string {
  const startDay = Number(startDate.split("-")[2]);
  const last = daysInMonth(year, monthIndex0);
  const day = isLastDay ? last : Math.min(startDay, last);
  return `${year}-${pad(monthIndex0 + 1)}-${pad(day)}`;
}

/** Generate `count` future occurrences for a monthly template, starting at startDate. */
export function generateMonthlyOccurrences(startDate: string, isLastDay: boolean, count = 12): string[] {
  const [sy, sm] = startDate.split("-").map(Number);
  const out: string[] = [];
  let y = sy; let m = sm - 1;
  for (let i = 0; i < count; i++) {
    out.push(occurrenceDateFor(startDate, isLastDay, y, m));
    m++; if (m > 11) { m = 0; y++; }
  }
  return out;
}

/** Generate `count` yearly occurrences, starting at startDate. */
export function generateYearlyOccurrences(startDate: string, count = 5): string[] {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const y = sy + i;
    const last = daysInMonth(y, sm - 1);
    const day = Math.min(sd, last);
    out.push(`${y}-${pad(sm)}-${pad(day)}`);
  }
  return out;
}

/** Human helper text describing how a chosen date will be used. */
export function explainExpenseDate(opts: {
  recurrence: "one_time" | "monthly" | "yearly";
  date: string | null;
  t?: (key: string) => string;
}): string | null {
  const { recurrence, date } = opts;
  if (!date) return null;
  if (recurrence === "one_time") {
    return "This date will be used as the expense date.";
  }
  if (recurrence === "yearly") {
    return "This date defines the day and month when this expense will be planned every year.";
  }
  // monthly
  if (isLastDayOfItsMonth(date)) {
    return "You selected the last day of the month. This recurring expense will be planned on the last day of each following month (e.g. Jan 31 → Feb 28/29 → Mar 31 → Apr 30).";
  }
  return "This date defines the day of the month when this expense will be planned. The recurring expense will be included in calculations starting from this date.";
}
