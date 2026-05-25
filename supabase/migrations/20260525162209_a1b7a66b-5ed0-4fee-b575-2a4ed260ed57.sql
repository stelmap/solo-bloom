CREATE OR REPLACE FUNCTION public.auto_apply_credits_to_client_outstanding(
  p_client_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_consumed_total numeric := 0;
  v_sessions_updated integer := 0;
  r record;
  v_owed numeric;
  v_consumed numeric;
BEGIN
  SELECT user_id INTO v_user FROM public.clients WHERE id = p_client_id;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR r IN
    SELECT a.id, a.price, a.scheduled_at
    FROM public.appointments a
    WHERE a.client_id = p_client_id
      AND a.user_id = v_user
      AND a.status = 'completed'
      AND a.payment_status IN ('waiting_for_payment','unpaid','partially_paid')
    ORDER BY a.scheduled_at ASC
  LOOP
    -- Available credits left?
    IF NOT EXISTS (
      SELECT 1 FROM public.client_credits
      WHERE client_id = p_client_id AND user_id = v_user AND amount > 0 AND income_id IS NOT NULL
    ) THEN
      EXIT;
    END IF;

    -- Compute remaining owed for this session = price - already-allocated
    SELECT GREATEST(COALESCE(r.price,0) - COALESCE(SUM(isa.allocated_amount),0), 0)
      INTO v_owed
    FROM public.income_session_allocations isa
    WHERE isa.appointment_id = r.id;

    IF v_owed <= 0 THEN
      CONTINUE;
    END IF;

    v_consumed := public.consume_client_credit_for_appointment(r.id, p_client_id, v_owed);
    IF v_consumed > 0 THEN
      v_consumed_total := v_consumed_total + v_consumed;
      v_sessions_updated := v_sessions_updated + 1;

      -- Reduce / clear matching expected_payments for this session up to v_consumed.
      UPDATE public.expected_payments
      SET status = 'paid'
      WHERE appointment_id = r.id
        AND status = 'pending'
        AND amount <= v_consumed + 0.001;
    END IF;
  END LOOP;

  RETURN v_sessions_updated;
END $function$;