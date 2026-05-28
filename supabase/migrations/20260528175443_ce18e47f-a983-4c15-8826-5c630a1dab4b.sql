-- Mark stale expected_payments as resolved when their appointment is
-- already paid, cancelled or no-show. These rows currently make
-- Payment Audit show "Awaiting" debts that the Income page no longer
-- considers unpaid, causing the two views to diverge.
UPDATE public.expected_payments ep
SET status = 'paid', updated_at = now()
FROM public.appointments a
WHERE ep.appointment_id = a.id
  AND ep.status = 'pending'
  AND (
    a.payment_status IN ('paid_now','paid_in_advance','paid_from_prepayment')
    OR a.status IN ('cancelled','no_show')
  );