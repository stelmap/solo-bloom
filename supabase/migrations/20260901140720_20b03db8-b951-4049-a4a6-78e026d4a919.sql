CREATE OR REPLACE FUNCTION public.consume_client_credit_for_appointment(
  p_appointment_id uuid,
  p_client_id uuid,
  p_max_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user uuid;
  v_apt_user uuid;
  v_remaining numeric := p_max_amount;
  v_consumed numeric := 0;
  v_take numeric;
  v_free_take numeric;
  v_res_need numeric;
  v_res_take numeric;
  v_income_exists boolean;
  r record;
  ri record;
  rr record;
  v_touched uuid[] := ARRAY[]::uuid[];
  v_apt uuid;
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

  -- Pass 2: allocate from unspent confirmed income. Mirrors the balance formula
  -- used by the app: money tied to an ACTIVE FUTURE session is a reservation
  -- and still counts as available prepaid balance, so it can be consumed here
  -- (the reservation is released below).
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
        SELECT isa.income_id,
               COALESCE(SUM(isa.allocated_amount) FILTER (
                 WHERE a.id IS NULL OR a.status NOT IN ('scheduled','confirmed','reminder_sent')
               ), 0) AS hard_total,
               COALESCE(SUM(isa.allocated_amount) FILTER (
                 WHERE a.status IN ('scheduled','confirmed','reminder_sent')
                   AND isa.appointment_id <> p_appointment_id
               ), 0) AS reserved_total,
               COALESCE(SUM(isa.allocated_amount), 0) AS total
        FROM public.income_session_allocations isa
        LEFT JOIN public.appointments a ON a.id = isa.appointment_id
        WHERE isa.income_id IN (SELECT id FROM inc)
        GROUP BY isa.income_id
      )
      SELECT inc.id,
             COALESCE(alloc.reserved_total, 0) AS reserved,
             GREATEST(
               0,
               inc.amount
                 - COALESCE(alloc.hard_total, 0)
                 - CASE
                     WHEN COALESCE(alloc.total, 0) = 0
                          AND inc.appointment_id IS NOT NULL
                          AND NOT EXISTS (
                            SELECT 1 FROM public.appointments a2
                            WHERE a2.id = inc.appointment_id
                              AND a2.status IN ('scheduled','confirmed','reminder_sent')
                          )
                       THEN inc.amount
                     ELSE 0
                   END
             ) AS available
      FROM inc
      LEFT JOIN alloc ON alloc.income_id = inc.id
      ORDER BY inc.created_at ASC
    LOOP
      EXIT WHEN v_remaining <= 0;
      IF ri.available <= 0 THEN CONTINUE; END IF;
      v_take := LEAST(ri.available, v_remaining);

      -- Free (unreserved) part of this income first.
      v_free_take := LEAST(v_take, GREATEST(ri.available - ri.reserved, 0));
      v_res_need := v_take - v_free_take;

      -- Release reservations on OTHER active future sessions as needed (FIFO).
      IF v_res_need > 0 THEN
        FOR rr IN
          SELECT isa.id, isa.allocated_amount, isa.appointment_id
          FROM public.income_session_allocations isa
          JOIN public.appointments a ON a.id = isa.appointment_id
          WHERE isa.income_id = ri.id
            AND isa.appointment_id <> p_appointment_id
            AND a.status IN ('scheduled','confirmed','reminder_sent')
          ORDER BY a.scheduled_at DESC
          FOR UPDATE OF isa
        LOOP
          EXIT WHEN v_res_need <= 0;
          v_res_take := LEAST(rr.allocated_amount, v_res_need);
          IF v_res_take >= rr.allocated_amount THEN
            DELETE FROM public.income_session_allocations WHERE id = rr.id;
          ELSE
            UPDATE public.income_session_allocations
              SET allocated_amount = allocated_amount - v_res_take, updated_at = now()
              WHERE id = rr.id;
          END IF;
          v_res_need := v_res_need - v_res_take;
          v_touched := array_append(v_touched, rr.appointment_id);
        END LOOP;
        -- Could not free everything we hoped for: shrink the take.
        v_take := v_take - v_res_need;
      END IF;

      IF v_take <= 0 THEN CONTINUE; END IF;

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
  FOREACH v_apt IN ARRAY v_touched LOOP
    PERFORM public.recalc_appointment_payment_status(v_apt);
  END LOOP;

  RETURN v_consumed;
END
$function$;