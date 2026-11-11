
- Client acquisition metrics (CAC, revenue/cost) are computed client-side in src/lib/clientSources.ts from clients/expenses/income; revenue excludes prepayment withdrawals to avoid double counting.

- Appointment queries use stable scheduled_at/id ordering and pagination through fetchAllPages so API row limits cannot hide later meetings.
- Treat appointment timestamps as UTC-labelled practice wall clocks; use calendarClock for practice-timezone comparisons and date navigation without shifting stored hours.
- Subscribe to practice changes in the shared AppLayout so Calendar and Dashboard refresh the same query families on every authenticated page.
- Initialize only new profile languages from validated signup metadata; preserve existing profile preferences and keep manual pre-login selection explicit.
- Checkout and discount preview share promoCode normalization; reject invalid supplied codes before creating a transaction so a displayed code is never silently omitted.
- Meeting duration drafts use shared minute validation and end-time arithmetic; save the meeting's chosen duration, not its service default, and only propagate explicitly changed durations across a recurring series to preserve overrides.
- Excel client imports use an idempotent atomic owner-scoped RPC; opening credits use orphan client credits and opening debts use a separate income-linked ledger, so imports never fabricate meetings or current revenue and debt payments never inflate prepaid balances.
- Invoice creation is atomic with confirmed incoming payments, deduplicated by income ID; preserve the existing numbering function and snapshot payment details, and exclude internal prepaid withdrawals to avoid duplicate invoices.
- Referral rewards live in an append-only ledger computed by DB functions (commissions from the Paddle webhook, refund reversals, own-subscription credits, payout reservations); never store an editable balance, so totals stay auditable and idempotent per payment.
- Admin payout changes use server-validated RPCs with expected-status checks, row locking and audit events; Paid requires an external transfer reference and final states cannot be edited, preventing duplicate payout bookkeeping.
- Recipient bank details are stored separately with admin-only reads and version-checked RPC writes; keep account numbers out of audit events to avoid exposing sensitive transfer information.
- Resolve new-account access through the owner-scoped versioned practice-access RPC; keep app trials separate from Paddle subscriptions and enforce restricted writes with database triggers, preserving legacy access.
- Keep public offer copy and pricing in the landing-offer module and isolated public pages; use actual product screenshots with private details excluded.
