-- Fix: after a session is completed, "paid_in_advance" must resolve to "paid_now".
-- The status "paid_in_advance" is reserved for FUTURE sessions whose money is
-- still reserved in the prepayment pool. Once the session is completed and its
-- payment has been consumed, it becomes a regular paid session.
--
-- 1) Patch recalc_appointment_payment_status so completed sessions never emit
--    "paid_in_advance" (they collapse to "paid_now").
-- 2) One-time backfill for existing corrupted rows (AC5).

CREATE OR REPLACE FUNCTION public.recalc_appointment_payment_status(p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_price numeric;
  v_scheduled timestamptz;
  v_status text;
  v_alloc numeric;
  v_min_pay_date date;
  v_all_prepay boolean;
  v_any_prepay boolean;
  v_new_status text;
BEGIN
  SELECT user_id, price, scheduled_at, status
  INTO v_user, v_price, v_scheduled, v_status
  FROM public.appointments WHERE id = p_appointment_id;
  IF v_user IS NULL THEN RETURN; END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(SUM(isa.allocated_amount), 0),
         MIN(i.date),
         COALESCE(bool_and(isa.from_prepayment), false),
         COALESCE(bool_or(isa.from_prepayment), false)
  INTO v_alloc, v_min_pay_date, v_all_prepay, v_any_prepay
  FROM public.income_session_allocations isa
  JOIN public.income i ON i.id = isa.income_id
  WHERE isa.appointment_id = p_appointment_id
    AND i.status = 'confirmed';

  IF v_status IN ('cancelled','no-show','rescheduled') THEN
    UPDATE public.appointments
    SET payment_status = CASE
      WHEN payment_status IN ('paid_now','paid_in_advance','partially_paid','paid_from_prepayment','partially_paid_from_prepayment') THEN payment_status
      ELSE 'not_applicable'
    END
    WHERE id = p_appointment_id;
    RETURN;
  END IF;

  IF v_alloc <= 0 THEN
    IF v_status <> 'completed' THEN
      UPDATE public.appointments
      SET payment_status = 'not_applicable'
      WHERE id = p_appointment_id
        AND payment_status NOT IN ('paid_now','paid_in_advance','partially_paid','paid_from_prepayment','partially_paid_from_prepayment');
    ELSE
      UPDATE public.appointments
      SET payment_status = CASE
        WHEN payment_status IN ('paid_now','paid_in_advance','partially_paid','paid_from_prepayment','partially_paid_from_prepayment') THEN 'unpaid'
        WHEN payment_status = 'not_applicable' THEN 'waiting_for_payment'
        ELSE payment_status
      END
      WHERE id = p_appointment_id;
    END IF;
    RETURN;
  END IF;

  IF v_alloc >= COALESCE(v_price, 0) AND COALESCE(v_price,0) > 0 THEN
    IF v_all_prepay THEN
      -- Fully covered by prepayment pool consumption.
      v_new_status := 'paid_from_prepayment';
    ELSIF v_status = 'completed' THEN
      -- Completed sessions never stay "paid_in_advance" — the money is no
      -- longer reserved, it has been earned. Collapse to plain "paid_now".
      v_new_status := 'paid_now';
    ELSIF v_min_pay_date IS NOT NULL AND v_min_pay_date < v_scheduled::date THEN
      v_new_status := 'paid_in_advance';
    ELSE
      v_new_status := 'paid_now';
    END IF;
  ELSE
    IF v_any_prepay THEN
      v_new_status := 'partially_paid_from_prepayment';
    ELSE
      v_new_status := 'partially_paid';
    END IF;
  END IF;

  UPDATE public.appointments
  SET payment_status = v_new_status
  WHERE id = p_appointment_id;
END $function$;

-- One-time backfill: any completed appointment currently flagged as
-- 'paid_in_advance' is inconsistent (its funds have already been earned).
-- Collapse to 'paid_now' so counters, filters and the client card agree.
UPDATE public.appointments
SET payment_status = 'paid_now'
WHERE status = 'completed'
  AND payment_status = 'paid_in_advance';

-- Same for the partial variant — a completed partially-paid-in-advance
-- session is just partially_paid once the session has occurred.
-- (No dedicated status; partially_paid already conveys the outstanding gap.)
