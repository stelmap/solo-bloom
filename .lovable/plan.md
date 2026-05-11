## Problem

Today, when you add a monthly recurring expense, the app creates 12 real database rows up front. After 12 months they run out, and aggregations across the app double‑count or miss them inconsistently. The Financial Dashboard's "future" months already use a virtual approach, but past/current months and Breakeven/Dashboard totals add up every materialized row, which is wrong (a 100€ recurring with 12 generated rows currently inflates the monthly total).

## Fix: one template row, virtual monthly expansion

Store **a single row** per recurring expense (the template, with `is_recurring=true` and `recurring_start_date`). Wherever expenses are summed for finance, expand it virtually: for each calendar month from `recurring_start_date` onward, count one occurrence on `min(selected_day, last_day_of_that_month)`. This gives true rolling logic — no manual duplication, no horizon limit, correct day-clamping for Feb / 30‑day months.

## Changes

1. **Create expense (`useCreateExpense`)** — insert ONE row only when `is_recurring`. Stop generating 12 rows.
2. **New helper `src/lib/recurringExpenses.ts`** — pure function `expandRecurringExpenses(expenses, fromDate, toDate)` that returns one virtual occurrence per month per recurring template, with the day clamped to month length. Plus `monthlyAmountForRecurring(expense, monthKey)` for single-month sums.
3. **Financial Dashboard (`FinancialOverviewPage`)** — use the helper for both past/current and future months so a recurring expense appears in every month from its start, not just future ones.
4. **Breakeven page (`BreakevenPage`)** — current calculation sums every recurring row; switch to "one occurrence per recurring template for the current month".
5. **Dashboard stats (`useData.ts useDashboardStats`)** — same fix for the `monthlyExpenses` total on the Dashboard widget.
6. **Expenses page (`ExpensesPage`)** — list shows the single template row with its existing "Recurring" badge plus a small "Monthly from {start_date}" hint. Date-range filter and CSV export expand recurring expenses virtually so a recurring expense appears in every selected month, but the editable list still shows one template row per series.
7. **Edit / delete series** — already operate on `recurring_group_id`; keep working since the template row carries that id (single row series).
8. **Migration for existing data** — for every existing `recurring_group_id` group, keep only the earliest row (template) and delete the rest. Amount/category/description are identical across the group so no data loss. Recurring expense rows that were marked `payment_status = paid` for a specific month will be collapsed into the template; payment status per virtual month isn't tracked today and isn't part of the dashboard calculations, so this matches the requested behavior.

## Day-clamping rule

`day = min(start_day, daysInMonth(year, month))` — so Jan 31 → Feb 28/29, Apr 30, May 31, etc., per the spec.

## Out of scope

- Per-month paid/unpaid toggling for recurring expenses (today only the template carries one status; can be added later if needed).
- Weekly/yearly recurrence (current UI is monthly only).
