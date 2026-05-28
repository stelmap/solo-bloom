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
  v_avail numeric;
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

  IF v_remaining > 0 THEN
    FOR r IN
      SELECT i.id AS income_id,
             (i.amount - COALESCE((
               SELECT SUM(isa.allocated_amount)
               FROM public.income_session_allocations isa
               WHERE isa.income_id = i.id
             ), 0)) AS unallocated
      FROM public.income i
      WHERE i.client_id = p_client_id
        AND i.user_id = v_user
        AND COALESCE(i.status, 'confirmed') = 'confirmed'
      ORDER BY i.date ASC, i.created_at ASC
      FOR UPDATE OF i
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_avail := r.unallocated;
      IF v_avail IS NULL OR v_avail <= 0 THEN CONTINUE; END IF;
      v_take := LEAST(v_avail, v_remaining);

      INSERT INTO public.income_session_allocations
        (user_id, income_id, appointment_id, allocated_amount, from_prepayment)
      VALUES (v_user, r.income_id, p_appointment_id, v_take, true)
      ON CONFLICT (income_id, appointment_id) DO UPDATE
        SET allocated_amount = public.income_session_allocations.allocated_amount + EXCLUDED.allocated_amount,
            from_prepayment = true,
            updated_at = now();

      v_consumed := v_consumed + v_take;
      v_remaining := v_remaining - v_take;
    END LOOP;
  END IF;

  PERFORM public.recalc_appointment_payment_status(p_appointment_id);
  RETURN v_consumed;
END $function$;