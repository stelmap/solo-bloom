-- Apply a payment to a client's oldest outstanding debts first (FIFO).
-- For each pending expected_payments row of this client:
--   * deduct from the payment, create an income_session_allocations row,
--   * if fully covered: mark expected_payments status='paid'; if partial: decrement amount.
-- Returns leftover amount (>= 0).
CREATE OR REPLACE FUNCTION public.apply_payment_to_client_debts(
  p_user_id uuid,
  p_client_id uuid,
  p_income_id uuid,
  p_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_remaining numeric := COALESCE(p_amount, 0);
  v_take numeric;
  r record;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_remaining <= 0 OR p_client_id IS NULL THEN
    RETURN GREATEST(v_remaining, 0);
  END IF;

  FOR r IN
    SELECT ep.id, ep.amount, ep.appointment_id
    FROM public.expected_payments ep
    WHERE ep.client_id = p_client_id
      AND ep.user_id  = p_user_id
      AND ep.status   = 'pending'
      AND ep.amount   > 0
    ORDER BY ep.created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(r.amount, v_remaining);

    INSERT INTO public.income_session_allocations
      (user_id, income_id, appointment_id, allocated_amount, from_prepayment)
    VALUES (p_user_id, p_income_id, r.appointment_id, v_take, false)
    ON CONFLICT (income_id, appointment_id) DO UPDATE
      SET allocated_amount = public.income_session_allocations.allocated_amount + EXCLUDED.allocated_amount,
          updated_at = now();

    IF v_take >= r.amount THEN
      UPDATE public.expected_payments
        SET status = 'paid',
            amount = 0,
            paid_at = now(),
            updated_at = now()
        WHERE id = r.id;
    ELSE
      UPDATE public.expected_payments
        SET amount = amount - v_take,
            updated_at = now()
        WHERE id = r.id;
    END IF;

    PERFORM public.recalc_appointment_payment_status(r.appointment_id);

    v_remaining := v_remaining - v_take;
  END LOOP;

  RETURN GREATEST(v_remaining, 0);
END $function$;