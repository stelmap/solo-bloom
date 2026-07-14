
-- 1) Repair orphaned client_credits that point to deleted income rows.
UPDATE public.client_credits cc
SET income_id = NULL
WHERE cc.income_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.income i WHERE i.id = cc.income_id);

-- 2) Harden consume_client_credit_for_appointment: if a credit references an
-- income row that no longer exists, still consume the credit (keep balance
-- correct) but skip the allocation insert to avoid FK violations. The parent
-- withdraw_from_prepayment_for_appointment RPC writes the €0 audit row.
CREATE OR REPLACE FUNCTION public.consume_client_credit_for_appointment(p_appointment_id uuid, p_client_id uuid, p_max_amount numeric)
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
  v_income_exists boolean;
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

  IF p_max_amount <= 0 THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT cc.id, cc.amount, cc.income_id
    FROM public.client_credits cc
    WHERE cc.client_id = p_client_id
      AND cc.user_id = v_user
      AND cc.amount > 0
    ORDER BY cc.created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(r.amount, v_remaining);

    v_income_exists := false;
    IF r.income_id IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM public.income WHERE id = r.income_id)
        INTO v_income_exists;
    END IF;

    IF v_income_exists THEN
      INSERT INTO public.income_session_allocations
        (user_id, income_id, appointment_id, allocated_amount, from_prepayment)
      VALUES (v_user, r.income_id, p_appointment_id, v_take, true)
      ON CONFLICT (income_id, appointment_id) DO UPDATE
        SET allocated_amount = public.income_session_allocations.allocated_amount + EXCLUDED.allocated_amount,
            from_prepayment = true,
            updated_at = now();
    END IF;

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
