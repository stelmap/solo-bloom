
- Client acquisition metrics (CAC, revenue/cost) are computed client-side in src/lib/clientSources.ts from clients/expenses/income; revenue excludes prepayment withdrawals to avoid double counting.

- Appointment queries use stable scheduled_at/id ordering and pagination through fetchAllPages so API row limits cannot hide later meetings.
- Treat appointment timestamps as UTC-labelled practice wall clocks; use calendarClock for practice-timezone comparisons and date navigation without shifting stored hours.
- Subscribe to practice changes in the shared AppLayout so Calendar and Dashboard refresh the same query families on every authenticated page.
- Initialize only new profile languages from validated signup metadata; preserve existing profile preferences and keep manual pre-login selection explicit.
- Checkout and discount preview share promoCode normalization; reject invalid supplied codes before creating a transaction so a displayed code is never silently omitted.
- Meeting duration drafts use shared minute validation and end-time arithmetic; save the meeting's chosen duration, not its service default, and only propagate explicitly changed durations across a recurring series to preserve overrides.
- Excel client imports use an idempotent atomic owner-scoped RPC; opening credits use orphan client credits and opening debts use a separate income-linked ledger, so imports never fabricate meetings or current revenue and debt payments never inflate prepaid balances.
- Invoice creation is atomic with confirmed incoming payments, deduplicated by income ID; preserve the existing numbering function and snapshot payment details, and exclude internal prepaid withdrawals to avoid duplicate invoices.
