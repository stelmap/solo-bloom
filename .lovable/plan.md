# Payment/Prepayment/Balance Synchronization

## Goal
Every financial action creates its own record. Sessions, balances, prepayments, Income Requests and Confirmed Income stay in sync. Never create an Expected Payment when the session was paid from prepayment. Client balance is computed from real financial operations.

## Scope of change

### A. Session completion dialog (`SessionDetailSheet.tsx` + `CalendarPage.tsx`)
Replace the current 3-option payment picker with a new set:
1. **Pay now** — copy: *"Client paid before or during the session"*. Creates Confirmed Income = session price, links to client/session/service/payment method, session → `completed` + `paid_now`. No Expected Payment.
2. **Waiting for payment** — session → `completed` + `waiting_for_payment`. Creates Expected Payment for full price. Client debt increases.
3. **Complete & deduct from prepayment** — shown only when the client has an available prepaid balance.
   - Preview card: total prepayment, approx sessions covered, session price, amount to deduct, prepayment left after deduction.
   - If prepayment < session price → show "Not enough prepayment" hint and force the user to pick Waiting for payment (no partial auto-mix in this feature).
   - On confirm: create `PREPAYMENT_DEDUCTION` record + a **Confirmed Income row with amount = 0** tagged `paid_from_prepayment`. Session → `completed` + `paid_from_prepayment`. No Expected Payment.

**Remove the "Pay in advance" option entirely** from session completion.

### B. Backend (migration + atomic RPC)
Add a single SECURITY DEFINER function `public.complete_session_with_payment(p_appointment_id uuid, p_mode text, p_payment_method_id uuid, p_paid_at date)` where `p_mode ∈ ('pay_now','waiting','from_prepayment')`. It performs everything in one transaction:
- Locks the appointment row (`FOR UPDATE`).
- Recomputes prepaid pool from `income` − allocated on completed paid sessions, minus prior `PREPAYMENT_DEDUCTION` records.
- Branch `pay_now`: insert `income` (amount = price, `source='session_payment'`), insert `income_session_allocations`, cancel any pending EP for this session.
- Branch `waiting`: insert `expected_payments` (status `pending`, amount = price) if none exists.
- Branch `from_prepayment`: verify pool ≥ price (else `RAISE EXCEPTION 'insufficient_prepayment'`), insert `income` with `amount=0`, `source='prepayment_deduction'`, allocate full price to session via `income_session_allocations` (allocations reference the original prepayment income), cancel any pending EP.
- Calls existing `recalc_appointment_payment_status` (extended to recognize `paid_from_prepayment`).
- Writes to `payment_corrections`/audit table with: actor, before/after prepayment pool, session price, cash received, deducted amount, created income ids, source prepayment income id.

Migration steps:
1. Add `payment_status` enum value `paid_from_prepayment` if not already present (already used in code — verify).
2. Add columns to `income`: `source text` (values: `session_payment | manual | prepayment | prepayment_deduction | refund | correction`), `source_prepayment_income_id uuid references income(id)`.
3. Add partial unique index preventing duplicate `PREPAYMENT_DEDUCTION` per appointment.
4. Create `complete_session_with_payment` RPC. Grant EXECUTE to `authenticated`.
5. Extend audit table (`payment_corrections` or new `payment_audit_log`) with the fields listed in spec §9.

### C. Client balance (single source of truth)
Update `src/lib/clientBalance.ts`:
```
totalReceived = Σ income.amount WHERE source ≠ 'prepayment_deduction'
prepaidPool   = Σ income WHERE source='prepayment' (minus allocations to sessions)
              − Σ PREPAYMENT_DEDUCTION amounts
              − refunds − manual adjustments
debt          = Σ (price − allocated) for completed sessions not fully paid
balance       = prepaidPool − debt
```
Zero-amount `paid_from_prepayment` income rows do **not** inflate `totalReceived`. All UI (`Dashboard`, `ClientsPage`, `ClientDetailPage`, `IncomePage`, `SessionDetailSheet`, KPIs) reads from the same helper.

### D. UI touch-points to update
- `SessionDetailSheet.tsx`: new payment picker + prepayment preview card + confirm labels.
- `CalendarPage.tsx`: replace direct write with `supabase.rpc('complete_session_with_payment', …)`; keep dedupe guard.
- `IncomePage.tsx` / `PaymentAuditPage.tsx`: render `€0` prepayment-deduction rows with badge "Paid from prepayment"; exclude them from income totals.
- `ClientDetailPage.tsx` counters: use the updated balance helper.
- i18n keys for the new copy in `en/uk/ru/pl/fr`.

### E. Automated tests
Extend the "Finance" section of `src/lib/testRegistry.ts` with a new suite `src/lib/__tests__/paymentSync.test.ts` covering all 17 scenarios from the spec (Pay now, Waiting, EP later, prepayment-equal/greater/less, no EP for prepaid, €0 confirmed income, prepayment decrement, no double income, debt, counts, balance sync across surfaces, insufficient-prepayment error path, audit log written, atomic rollback).
Add an e2e `tests/e2e/prepayment-session.spec.ts` that double-clicks the confirm button and asserts a single RPC call + single income row.

## Out of scope
- Partial prepayment + partial EP mixing (spec §8 defers this).
- Redesigning the manual income dialog (already shipped).
- Backfilling historical rows — new logic applies going forward; existing balances remain consistent because we route reads through the shared helper.

## Technical notes
- All writes go through the RPC so the client cannot desync balances.
- The RPC returns `{ income_id, expected_payment_id, prepayment_before, prepayment_after }` so the UI can toast the exact numbers shown in the preview.
- Double-click protection: RPC is idempotent per appointment via the partial unique index + `FOR UPDATE`.
