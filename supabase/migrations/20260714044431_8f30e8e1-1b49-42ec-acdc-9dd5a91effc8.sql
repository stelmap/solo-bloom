-- Data repair: cancelled/no-show sessions must never retain a "reserved funds"
-- payment_status. Collapse any stale paid_in_advance / paid_from_prepayment /
-- partially_paid* rows on cancelled or no-show appointments to not_applicable,
-- and clear any lingering income/expected_payments rows attached to them so
-- the prepayment balance recomputes correctly.

-- 1) Delete stray income rows attached to cancelled/no-show appointments.
DELETE FROM public.income i
USING public.appointments a
WHERE i.appointment_id = a.id
  AND a.status IN ('cancelled', 'no-show');

-- 2) Delete expected_payments rows attached to cancelled/no-show appointments.
DELETE FROM public.expected_payments ep
USING public.appointments a
WHERE ep.appointment_id = a.id
  AND a.status IN ('cancelled', 'no-show');

-- 3) Collapse payment_status on cancelled/no-show sessions that still carry a
--    reserved-funds label.
UPDATE public.appointments
SET payment_status = 'not_applicable'
WHERE status IN ('cancelled', 'no-show')
  AND payment_status IN (
    'paid_in_advance',
    'paid_from_prepayment',
    'partially_paid',
    'partially_paid_from_prepayment',
    'waiting_for_payment'
  );