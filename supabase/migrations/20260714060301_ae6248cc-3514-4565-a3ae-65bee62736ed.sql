
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
  ri record;
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

  -- Pass 1: consume legacy client_credits rows FIFO.
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

  -- Pass 2: allocate from unspent confirmed income remainders (matches the
  -- transactional formula used by useClientCreditBalance). This covers manual
  -- prepayments and overpayments that were never mirrored into client_credits.
  IF v_remaining > 0 THEN
    FOR ri IN
      WITH inc AS (
        SELECT i.id, i.amount, i.appointment_id, i.created_at
        FROM public.income i
        WHERE i.client_id = p_client_id
          AND i.user_id = v_user
          AND i.status = 'confirmed'
          AND COALESCE(i.source, 'manual') <> 'prepayment_withdrawal'
      ),
      alloc AS (
        SELECT isa.income_id, COALESCE(SUM(isa.allocated_amount), 0) AS total
        FROM public.income_session_allocations isa
        WHERE isa.income_id IN (SELECT id FROM inc)
        GROUP BY isa.income_id
      )
      SELECT inc.id,
             GREATEST(
               0,
               inc.amount
                 - COALESCE(alloc.total, 0)
                 - CASE
                     WHEN COALESCE(alloc.total, 0) = 0 AND inc.appointment_id IS NOT NULL
                       THEN inc.amount
                     ELSE 0
                   END
             ) AS remaining
      FROM inc
      LEFT JOIN alloc ON alloc.income_id = inc.id
      ORDER BY inc.created_at ASC
    LOOP
      EXIT WHEN v_remaining <= 0;
      IF ri.remaining <= 0 THEN CONTINUE; END IF;
      v_take := LEAST(ri.remaining, v_remaining);

      INSERT INTO public.income_session_allocations
        (user_id, income_id, appointment_id, allocated_amount, from_prepayment)
      VALUES (v_user, ri.id, p_appointment_id, v_take, true)
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
