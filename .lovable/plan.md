# Client Prepayment Balance Logic

Build a full prepayment system where any client payment exceeding session cost becomes a balance that automatically covers future sessions — without duplicating income.

## Core concept

Client balance = sum(confirmed incomes for client) − sum(completed billable sessions for client).

- Balance > 0 → prepayment (credit)
- Balance = 0 → settled
- Balance < 0 → debt

One income record is created when money is actually received. Sessions consumed from prepayment never create new income — they only mark payment status and allocate against existing income.

## Data model changes

**`income` table** — add:
- `is_prepayment` boolean default false (set true when income amount > session amount at creation, or when added without a session)
- `remaining_balance` numeric — unallocated portion of this income, decremented as future sessions consume it

**`appointments` table** — extend `payment_status` to allow:
- `paid_from_prepayment`
- `partially_paid_from_prepayment`

Add columns:
- `prepaid_amount_used` numeric default 0
- `remaining_due` numeric default 0

**`income_session_allocations`** (already exists) — reuse: each row links an income to an appointment with `allocated_amount`. Prepayment consumption creates allocation rows pointing back to the original income.

## Allocation algorithm

When a new income is recorded for a client, OR when a session is completed:

1. Get all unpaid completed sessions for client, oldest first → cover with available balance.
2. Remaining money becomes prepayment (income.remaining_balance > 0).
3. When completing a session: if client has positive balance, offer "Pay from prepayment". On confirm, create allocation row(s) consuming oldest income first (FIFO), update session payment_status accordingly, decrement income.remaining_balance.

Triggered recalculation on: income create/update/delete, session complete/cancel, session price change, payment status change.

## Backend (DB) work

Single migration:
- Add the new income + appointment columns
- Add CHECK constraint relaxation / update for new payment_status values
- Create `recalculate_client_balance(client_id)` SQL function that recomputes allocations + remaining_balance + appointment payment_status using FIFO logic
- Trigger this function from triggers on income and appointments

## Frontend work

**New shared hook** `useClientBalance(clientId)` returning `{ totalPaid, totalSessions, balance, prepaidAmount, prepaidSessionsCount, debt }`.

**Calendar — Complete Session modal** (`src/components/calendar/...CompleteSession...`):
- Show client balance banner
- If balance ≥ session price → preselect "Pay from prepayment", primary button "Complete & deduct from prepayment"
- If 0 < balance < session price → show partial coverage UI: "Prepayment covers X €, remaining Y €" with options [leave as debt] / [add payment now]
- If balance ≤ 0 → existing flow

On submit:
- `paid_from_prepayment` → no income insert, only allocation row + status update
- `partially_paid_from_prepayment` → allocation row for prepaid portion + new income for the rest (if user adds payment) or leave remaining_due

**Manual income (Finance → Income → Add)**:
- After insert, call recalc; if no outstanding sessions, mark `is_prepayment=true` and surface "Added as prepayment for {client}".

**Client card** (`src/components/clients/ClientCard...` or detail page) — add Financial Balance block:
- Total paid, total session value, current balance
- Prepayment + estimated sessions (using client's avg or default session price)
- Debt + unpaid session count

**Calendar appointment popover/details** — show "Balance: +X €, Prepaid sessions: N" when client has credit.

**Payment audit / income list** — for sessions paid from prepayment, show source income date; for prepayment incomes, show which sessions consumed them and remaining.

**i18n** — add keys in en/fr/pl/uk for: paid from prepayment, partially paid from prepayment, prepayment available, prepaid sessions, complete and deduct, prepayment covers X remaining Y, financial balance, total paid, total sessions, current balance, debt.

## Files to touch (estimate)

- migration (1)
- `src/hooks/useClientBalance.ts` (new)
- `src/hooks/useData.ts` (invalidations, manual income hook)
- `src/components/calendar/CompleteSessionDialog.tsx` (or equivalent) — prepayment UI
- `src/components/calendar/AppointmentDetails*.tsx` — balance banner
- `src/components/clients/ClientDetail*.tsx` — financial block
- `src/components/finance/IncomeForm*.tsx` — post-insert recalc messaging
- `src/components/finance/PaymentAudit*.tsx` — show prepayment source
- `src/i18n/locales/{en,fr,pl,uk}.ts`

## Out of scope (confirm)

- Refunding prepayment back to client
- Manual reassignment of an allocation to a different session
- Prepayment expiry

These can be follow-ups.

## Acceptance

All AC1–AC6 covered by the allocation algorithm above. After approval I'll inspect actual file names, then ship the migration first, then the UI in one pass.
