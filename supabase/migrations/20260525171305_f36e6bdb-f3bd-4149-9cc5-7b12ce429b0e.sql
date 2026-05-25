CREATE OR REPLACE FUNCTION public.settle_client_debts_from_overpayment(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_total_income numeric;
  v_total_owed numeric;
  v_surplus numeric;
  v_settled_count int := 0;
  v_settled_amount numeric := 0;
  r record;
BEGIN
  SELECT user_id INTO v_user_id FROM public.clients WHERE id = p_client_id;
  IF v_user_id IS NULL OR v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_income
  FROM public.income
  WHERE client_id = p_client_id AND status = 'confirmed';

  SELECT COALESCE(SUM(price), 0) INTO v_total_owed
  FROM public.appointments
  WHERE client_id = p_client_id
    AND status = 'completed'
    AND payment_status <> 'not_applicable';

  v_surplus := v_total_income - v_total_owed;

  IF v_surplus < 0 THEN
    RETURN jsonb_build_object('settled_count', 0, 'settled_amount', 0, 'surplus', v_surplus);
  END IF;

  -- Aggregate is settled (or overpaid). Mark all pending expected_payments
  -- attached to completed sessions for this client as paid, and flip the
  -- appointment payment_status to paid_from_prepayment.
  FOR r IN
    SELECT ep.id AS ep_id, ep.amount, ep.appointment_id
    FROM public.expected_payments ep
    JOIN public.appointments a ON a.id = ep.appointment_id
    WHERE ep.client_id = p_client_id
      AND ep.status = 'pending'
      AND a.status = 'completed'
    ORDER BY ep.created_at ASC
  LOOP
    UPDATE public.expected_payments
      SET status = 'paid', paid_at = now(), updated_at = now()
      WHERE id = r.ep_id;
    UPDATE public.appointments
      SET payment_status = 'paid_from_prepayment', updated_at = now()
      WHERE id = r.appointment_id;
    v_settled_count := v_settled_count + 1;
    v_settled_amount := v_settled_amount + r.amount;
  END LOOP;

  RETURN jsonb_build_object(
    'settled_count', v_settled_count,
    'settled_amount', v_settled_amount,
    'surplus', v_surplus
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_client_debts_from_overpayment(uuid) TO authenticated;