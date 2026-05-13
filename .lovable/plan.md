## Goal

Replace the current "single template + virtual expansion" model with **materialized monthly instances** that each carry their own status (Planned / Paid / Cancelled), so users can mark-as-paid, edit/delete one / future / entire series, and see predictable single-count totals everywhere.

## Data model changes (migration)

Add to `public.expenses`:
- `instance_status text not null default 'planned'` — `'planned' | 'paid' | 'cancelled'`
- `paid_date date null`
- `recurrence_type text null` — `'monthly' | 'yearly'` (only on the template row)
- `is_last_day_of_month boolean not null default false` (only on the template row)
- `is_template boolean not null default false`
- `template_id uuid null references public.expenses(id) on delete set null` — on instance rows, points to the template
- Unique partial index: `(template_id, date) where template_id is not null` — prevents duplicates per (series, month-day).

Backfill:
- For every existing recurring template (one row today per `recurring_group_id`): mark it `is_template=true`, set `recurrence_type='monthly'`, set `is_last_day_of_month` from `recurring_start_date` day == last day, then materialize 12 months of instances starting from `recurring_start_date` (skipping any existing month thanks to the unique index). Carry the template's `payment_status` to instances if it was `paid` for the start month only.
- Map old `payment_status` -> `instance_status` on non-recurring rows: `paid` -> `paid`, anything else -> `planned`.

## Generation logic

Helper `src/lib/recurringExpenses.ts`:
- `generateInstances(template, fromMonth, count=12)`: returns rows for N months. Day = `is_last_day_of_month ? lastDayOf(month) : min(template.day, lastDayOf(month))`.
- `ensureRollingHorizon(userId)`: client-side after load — for each active template, find the latest instance month and top-up to (currentMonth + 11). Insert relies on the unique index for idempotency. Runs once per session per template.
- Drop the old `expandExpensesForRange` virtual expansion.

## Status rules

- `planned`: counts in forecasts only.
- `paid`: counts in actual financial calculations (Dashboard, Breakeven, Financial Overview, CSV export). Sets `paid_date`.
- `cancelled`: excluded from all sums.

Update `useDashboardStats`, `BreakevenPage`, `FinancialOverviewPage`, `ExpensesPage` totals/CSV to filter by `instance_status='paid'` for actuals (and `!= 'cancelled'` for forecasts). Remove all virtual-expansion calls — instances are now real rows.

## Expense form (`ExpensesPage`)

- New status field on edit (Planned / Paid / Cancelled) with a "Mark as paid" quick action in the row.
- Recurrence selector now: One-time / Monthly / Yearly.
- Helper text under date field, dynamic by recurrence type (one-time, monthly, yearly, last-day-of-month detected automatically).
- Preview block before save for recurring: lists first 4 generated dates + default status.
- Row actions: Edit, Delete, Mark as paid.

## Edit / Delete scopes

For instances of a template, both Edit and Delete open a scope dialog:
- **Only this** — operate on the single instance.
- **This and future** — operate on selected + all instances with `date >= selected.date` (paid ones skipped on edit; on delete, paid ones also deleted only after explicit confirm).
- **Entire series** — operate on template + all instances. Warn if any `paid` exist.

For one-time expenses: simple Delete with confirm.

## Filters / sorting

Extend the Expenses table:
- Filter by status (Planned / Paid / Cancelled / All).
- Filter by recurrence type (One-time / Monthly / Yearly).
- Existing category filter retained.
- Sortable columns: date, amount, status, category.
- Search by description.

## Files touched

- Migration (new) — schema + backfill.
- `src/lib/recurringExpenses.ts` — new generators, drop virtual expand.
- `src/hooks/useData.ts` — `useCreateExpense` (template + 12 instances), `useUpdateExpense` (scoped), `useDeleteExpense` (scoped), `useDashboardStats` (paid only).
- `src/pages/ExpensesPage.tsx` — form, helper text, preview, status badges, scope dialogs, mark-as-paid, filters/sort.
- `src/pages/FinancialOverviewPage.tsx`, `src/pages/BreakevenPage.tsx` — stop calling virtual expansion; use real rows filtered by status.
- `src/lib/csvExport.ts` (if it expanded virtually) — same.
- i18n strings in `src/i18n/locales/*` for helper text, preview, scope dialogs, statuses.

## Out of scope

- Weekly recurrence (UI stays monthly/yearly).
- Auto-marking as paid based on bank import.
- Per-instance payment method history beyond the existing field.

## Risks

- Migration must be idempotent and safe on existing data; the unique partial index catches double-runs.
- Yearly recurrence is new — only generate 1 instance/year, top-up logic must handle it.
- Many call sites currently sum recurring via `expandExpensesForRange`; missing one will under/over-count. I'll grep for all uses and switch them.
