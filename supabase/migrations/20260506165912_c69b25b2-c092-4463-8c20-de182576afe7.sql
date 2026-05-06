-- 1. Cleanup: set non-payable sessions to not_applicable
UPDATE public.appointments
SET payment_status = 'not_applicable'
WHERE status IN ('scheduled','confirmed','reminder_sent','cancelled','no-show','rescheduled')
  AND payment_status IN ('unpaid','waiting_for_payment');

-- 2. Remove expected_payments tied to non-completed sessions (they shouldn't be Awaiting)
DELETE FROM public.expected_payments ep
USING public.appointments a
WHERE ep.appointment_id = a.id
  AND ep.status = 'pending'
  AND a.status <> 'completed';

-- 3. Update recalc function: when no allocations, only set 'unpaid' for completed sessions; otherwise 'not_applicable'
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
  v_new_status text;
BEGIN
  SELECT user_id, price, scheduled_at, status
  INTO v_user, v_price, v_scheduled, v_status
  FROM public.appointments WHERE id = p_appointment_id;
  IF v_user IS NULL THEN RETURN; END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(SUM(isa.allocated_amount), 0), MIN(i.date)
  INTO v_alloc, v_min_pay_date
  FROM public.income_session_allocations isa
  JOIN public.income i ON i.id = isa.income_id
  WHERE isa.appointment_id = p_appointment_id
    AND i.status = 'confirmed';

  IF v_status IN ('cancelled','no-show','rescheduled') THEN
    UPDATE public.appointments
    SET payment_status = CASE
      WHEN payment_status IN ('paid_now','paid_in_advance','partially_paid') THEN payment_status
      ELSE 'not_applicable'
    END
    WHERE id = p_appointment_id;
    RETURN;
  END IF;

  IF v_alloc <= 0 THEN
    -- Non-completed sessions are not payable yet
    IF v_status <> 'completed' THEN
      UPDATE public.appointments
      SET payment_status = 'not_applicable'
      WHERE id = p_appointment_id
        AND payment_status NOT IN ('paid_now','paid_in_advance','partially_paid');
    ELSE
      UPDATE public.appointments
      SET payment_status = CASE
        WHEN payment_status IN ('paid_now','paid_in_advance','partially_paid') THEN 'unpaid'
        WHEN payment_status = 'not_applicable' THEN 'waiting_for_payment'
        ELSE payment_status
      END
      WHERE id = p_appointment_id;
    END IF;
    RETURN;
  END IF;

  IF v_alloc >= COALESCE(v_price, 0) AND COALESCE(v_price,0) > 0 THEN
    IF v_min_pay_date IS NOT NULL AND v_min_pay_date < v_scheduled::date THEN
      v_new_status := 'paid_in_advance';
    ELSE
      v_new_status := 'paid_now';
    END IF;
  ELSE
    v_new_status := 'partially_paid';
  END IF;

  UPDATE public.appointments
  SET payment_status = v_new_status
  WHERE id = p_appointment_id;
END $function$;