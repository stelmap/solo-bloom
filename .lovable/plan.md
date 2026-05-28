# Fix calculation inconsistencies between Dashboard and Finance

This is a large, cross-cutting refactor. To avoid introducing new mismatches, I'll do it in two phases: **(1) audit + create a single shared metrics layer**, then **(2) wire every page to it and add tooltips**.

## Phase 1 — Single source of truth

Create `src/lib/financeMetrics.ts` exporting pure functions that take raw rows (`appointments`, `income`, `income_session_allocations`, `expected_payments`, `clients`, `group_session_payments`) and return all 9 metrics with the **exact session/payment lists** that compose each total. Every page will read from this — no duplicated formulas.

Metric definitions (locked in):

| Metric | Definition |
|---|---|
| New clients this month | All clients with `created_at` in current month, regardless of status |
| └ active new | Subset where `status='active'` |
| └ ended/left new | Subset where `status` in (`archived`,`ended`,`paused`,`cancelled`) |
| Clients without next session | `status='active'` clients with no future appointment whose status ∉ (`cancelled`,`no-show`) |
| Unpaid sessions | All-time `completed` + payment_status ∈ (`unpaid`,`waiting_for_payment`,`partially_paid`,`partially_paid_from_prepayment`) |
| Paid today | Sum of `income` rows with `date = today` |
| Expected revenue today | Sum of price of today's `scheduled`/`confirmed`/`completed` sessions minus already-allocated payments (i.e. still owed for today's sessions) |
| Today's debt | Unpaid payable sessions with `scheduled_at::date = today` (today only) |
| Total debt | All-time unpaid payable sessions with `scheduled_at <= now` (past + today, never future) |
| Pending payments (Finance) | Same as Total debt — single definition |
| Expected income (future) | Sum of price of future `scheduled`/`confirmed` sessions not yet paid (strictly `scheduled_at > now`) |

Rules applied uniformly:
- Cancelled/no-show sessions → excluded from debt and expected income
- Prepaid sessions (`paid_in_advance`, `paid_from_prepayment`) → counted as paid
- Partially paid → debt = `price - sum(allocations)`, never negative
- Group sessions → use `group_session_payments.amount` and `payment_state`
- Never double-count a session across debt + expected income

## Phase 2 — Wire pages + add explanatory UI

**Dashboard.tsx**
- Replace inline calcs in `useDashboardStats` (in `useData.ts`) with calls to `financeMetrics`
- "New clients this month" card: show `5`, add `Tooltip` reading: `"5 клієнтів зареєстровано цього місяця. X активних, Y завершили/припинили терапію."`
- "Clients without next session" card → link to ClientsPage with explicit filter `status=active&noFutureSession=1`
- "Expected revenue today" card → link opens a detail modal listing today's contributing sessions with running total
- "Today's debt" card → link opens detail listing today's unpaid sessions only (not historical)

**ClientsPage.tsx**
- Add `noFutureSession=1` query-param filter so the dashboard link produces the matching list
- "New clients this month" detail view: add a toggle `Active only / All` defaulting to `All`, with a label `"X активних, Y завершили"`

**IncomePage.tsx**
- "Pending payments" tile = `Total debt` from shared layer (was filtering by `expected_payments` table only, which missed sessions where no expected_payment row was created)
- "Expected income" tile = `confirmed total + future expected income` (separate from debt)
- Add footnote under each tile explaining what's included

**Dashboard detail modal / MonthlyDetailsModal.tsx**
- For each metric, render the exact list returned by `financeMetrics` so totals always reconcile

## Phase 3 — Verification

- Add `src/lib/__tests__/financeMetrics.test.ts` covering: prepayment, partial payment, cancelled session, group session, today vs future boundary, archived new client
- Manually verify on preview that every dashboard card number equals its detail list total

## Technical notes

- No DB schema changes — pure client-side recompute
- Existing hooks (`useAppointments`, `useIncome`, `useExpectedPayments`, `useClients`, `useGroupSessionPayments`) already fetch everything needed; `useDashboardStats` will compose them via the new shared layer instead of inline `.filter().reduce()` chains scattered across `useData.ts` (lines ~2000-2300) and `Dashboard.tsx`
- Tooltips use existing `@/components/ui/tooltip`
- No UI redesign — only added tooltips, footnotes, and a detail modal where missing

## Scope / risk

~1 new file (`financeMetrics.ts` ~300 LOC), ~1 new test file, edits to `useData.ts`, `Dashboard.tsx`, `IncomePage.tsx`, `ClientsPage.tsx`, `MonthlyDetailsModal.tsx`. Estimated 600-900 lines changed. I'll run `tsc --noEmit` and the existing vitest suite before handing back.

**One question before I start:** for **"Today's debt"**, should completed sessions from **earlier today** that are unpaid count, or only sessions scheduled for today regardless of status? I'll assume **both** (any unpaid payable session whose date is today) unless you say otherwise.
