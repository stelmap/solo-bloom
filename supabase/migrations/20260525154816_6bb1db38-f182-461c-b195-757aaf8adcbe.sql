
ALTER TABLE public.income_session_allocations
  ADD COLUMN IF NOT EXISTS from_prepayment boolean NOT NULL DEFAULT false;

-- Update the recalc function to emit prepayment-aware statuses
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
      v_new_status := 'paid_from_prepayment';
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

-- Atomic FIFO consumption of a client's prepayment balance for a single appointment.
-- Creates allocation rows flagged from_prepayment=true and decrements client_credits.
-- Returns the total amount consumed.
CREATE OR REPLACE FUNCTION public.consume_client_credit_for_appointment(
  p_appointment_id uuid,
  p_client_id uuid,
  p_max_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_apt_user uuid;
  v_remaining numeric := p_max_amount;
  v_consumed numeric := 0;
  v_take numeric;
  r record;
BEGIN
  SELECT user_id INTO v_apt_user FROM public.appointments WHERE id = p_appointment_id;
  IF v_apt_user IS NULL THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;
  v_user := v_apt_user;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_max_amount <= 0 THEN RETURN 0; END IF;

  FOR r IN
    SELECT cc.id, cc.amount, cc.income_id
    FROM public.client_credits cc
    WHERE cc.client_id = p_client_id
      AND cc.user_id = v_user
      AND cc.income_id IS NOT NULL
      AND cc.amount > 0
    ORDER BY cc.created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(r.amount, v_remaining);

    -- Try to merge into an existing allocation for this (income, appointment) pair
    INSERT INTO public.income_session_allocations
      (user_id, income_id, appointment_id, allocated_amount, from_prepayment)
    VALUES (v_user, r.income_id, p_appointment_id, v_take, true)
    ON CONFLICT (income_id, appointment_id) DO UPDATE
      SET allocated_amount = public.income_session_allocations.allocated_amount + EXCLUDED.allocated_amount,
          from_prepayment = true,
          updated_at = now();

    IF v_take >= r.amount THEN
      DELETE FROM public.client_credits WHERE id = r.id;
    ELSE
      UPDATE public.client_credits SET amount = amount - v_take WHERE id = r.id;
    END IF;

    v_consumed := v_consumed + v_take;
    v_remaining := v_remaining - v_take;
  END LOOP;

  PERFORM public.recalc_appointment_payment_status(p_appointment_id);
  RETURN v_consumed;
END $function$;

-- Make sure (income_id, appointment_id) is unique so the ON CONFLICT above works.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'income_session_allocations_income_apt_unique'
  ) THEN
    CREATE UNIQUE INDEX income_session_allocations_income_apt_unique
      ON public.income_session_allocations (income_id, appointment_id);
  END IF;
END $$;
