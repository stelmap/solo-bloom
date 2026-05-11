/**
 * Helpers for monthly recurring expenses.
 *
 * Recurring expenses are stored as a single template row (`is_recurring=true`,
 * `recurring_start_date` set). At read time they are expanded virtually for each
 * month from their start date onward, with the day clamped to the last day of
 * shorter months (so Jan 31 → Feb 28/29, Apr 30, etc.).
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
  tax_setting_id?: string | null;
  [k: string]: any;
};

export type VirtualExpense = ExpenseRow & {
  virtual: true;
  template_id: string;
};

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Return yyyy-MM-dd for the given year, monthIndex0 and clamped day-of-month. */
export function recurringDateFor(startDate: string, year: number, monthIndex0: number): string {
  const startDay = Number(startDate.split("-")[2]);
  const day = Math.min(startDay, daysInMonth(year, monthIndex0));
  return `${year}-${pad(monthIndex0 + 1)}-${pad(day)}`;
}

/** True if the recurring template has an occurrence in the given yyyy-MM key. */
export function recurringAppliesToMonth(template: ExpenseRow, monthKey: string): boolean {
  const start = template.recurring_start_date || template.date;
  if (!start) return false;
  const startMonth = start.substring(0, 7);
  return monthKey >= startMonth;
}

/**
 * Expand recurring templates into virtual occurrences for [fromDate, toDate] (inclusive),
 * yielding one occurrence per calendar month. Non-recurring rows are passed through unchanged.
 */
export function expandExpensesForRange(
  expenses: ExpenseRow[],
  fromDate: string,
  toDate: string,
): (ExpenseRow | VirtualExpense)[] {
  if (!expenses?.length) return [];
  const out: (ExpenseRow | VirtualExpense)[] = [];

  const fromY = Number(fromDate.substring(0, 4));
  const fromM = Number(fromDate.substring(5, 7)) - 1;
  const toY = Number(toDate.substring(0, 4));
  const toM = Number(toDate.substring(5, 7)) - 1;

  for (const e of expenses) {
    if (!e.is_recurring) {
      if (e.date >= fromDate && e.date <= toDate) out.push(e);
      continue;
    }
    const start = e.recurring_start_date || e.date;
    if (!start) continue;
    const startY = Number(start.substring(0, 4));
    const startM = Number(start.substring(5, 7)) - 1;

    // Iterate months in [from, to]
    let y = fromY;
    let m = fromM;
    while (y < toY || (y === toY && m <= toM)) {
      // Skip months before start
      if (y > startY || (y === startY && m >= startM)) {
        const occDate = recurringDateFor(start, y, m);
        if (occDate >= fromDate && occDate <= toDate) {
          out.push({
            ...e,
            id: `${e.id}-${y}-${pad(m + 1)}`,
            template_id: e.id,
            date: occDate,
            virtual: true,
          });
        }
      }
      m++;
      if (m > 11) { m = 0; y++; }
    }
  }

  return out;
}

/** Sum of recurring template amounts that apply to the given yyyy-MM key. */
export function recurringTotalForMonth(expenses: ExpenseRow[], monthKey: string, opts?: { categoryFilter?: (cat: string) => boolean }): number {
  let total = 0;
  for (const e of expenses) {
    if (!e.is_recurring) continue;
    if (!recurringAppliesToMonth(e, monthKey)) continue;
    if (opts?.categoryFilter && !opts.categoryFilter(e.category)) continue;
    total += Number(e.amount);
  }
  return total;
}
