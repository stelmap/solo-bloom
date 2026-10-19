
- Client acquisition metrics (CAC, revenue/cost) are computed client-side in src/lib/clientSources.ts from clients/expenses/income; revenue excludes prepayment withdrawals to avoid double counting.

- Appointment queries use stable scheduled_at/id ordering and pagination through fetchAllPages so API row limits cannot hide later meetings.
- Treat appointment timestamps as UTC-labelled practice wall clocks; use calendarClock for practice-timezone comparisons and date navigation without shifting stored hours.
- Subscribe to practice changes in the shared AppLayout so Calendar and Dashboard refresh the same query families on every authenticated page.
- Initialize only new profile languages from validated signup metadata; preserve existing profile preferences and keep manual pre-login selection explicit.
