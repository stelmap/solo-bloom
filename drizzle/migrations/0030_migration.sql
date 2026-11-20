CREATE OR REPLACE FUNCTION public.apply_payment_to_client_debts(p_user_id uuid, p_client_id uuid, p_income_id uuid, p_amount numeric)
 RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_remaining numeric := COALESCE(p_amount, 0);
  v_take numeric;
  r record;
BEGIN
  IF COALESCE(auth.role(), '') = 'anon'
     OR (auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF auth.uid() IS NULL AND COALESCE(auth.role(), '') = 'authenticated' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_remaining <= 0 OR p_client_id IS NULL THEN
    RETURN GREATEST(v_remaining, 0);
  END IF;

  FOR r IN
    SELECT ep.id, ep.amount, ep.appointment_id
    FROM public.expected_payments ep
    WHERE ep.client_id = p_client_id AND ep.user_id = p_user_id
      AND ep.status = 'pending' AND ep.amount > 0
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
      UPDATE public.expected_payments SET status = 'paid', amount = 0, paid_at = now(), updated_at = now() WHERE id = r.id;
    ELSE
      UPDATE public.expected_payments SET amount = amount - v_take, updated_at = now() WHERE id = r.id;
    END IF;
    PERFORM public.recalc_appointment_payment_status(r.appointment_id);
    v_remaining := v_remaining - v_take;
  END LOOP;
  RETURN GREATEST(v_remaining, 0);
END $function$;

CREATE OR REPLACE FUNCTION public.auto_apply_credits_to_client_outstanding(p_client_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_consumed_total numeric := 0;
  v_sessions_updated integer := 0;
  r record;
  v_owed numeric;
  v_consumed numeric;
BEGIN
  IF COALESCE(auth.role(), '') = 'anon' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT user_id INTO v_user FROM public.clients WHERE id = p_client_id;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND ((auth.uid() IS NULL AND COALESCE(auth.role(), '') = 'authenticated')
          OR (auth.uid() IS NOT NULL AND auth.uid() <> v_user)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR r IN
    SELECT a.id, a.price, a.scheduled_at
    FROM public.appointments a
    WHERE a.client_id = p_client_id AND a.user_id = v_user
      AND a.status = 'completed'
      AND a.payment_status IN ('waiting_for_payment','unpaid','partially_paid')
    ORDER BY a.scheduled_at ASC
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.client_credits
      WHERE client_id = p_client_id AND user_id = v_user AND amount > 0 AND income_id IS NOT NULL
    ) THEN
      EXIT;
    END IF;
    SELECT GREATEST(COALESCE(r.price,0) - COALESCE(SUM(isa.allocated_amount),0), 0) INTO v_owed
    FROM public.income_session_allocations isa WHERE isa.appointment_id = r.id;
    IF v_owed <= 0 THEN CONTINUE; END IF;
    v_consumed := public.consume_client_credit_for_appointment(r.id, p_client_id, v_owed);
    IF v_consumed > 0 THEN
      v_consumed_total := v_consumed_total + v_consumed;
      v_sessions_updated := v_sessions_updated + 1;
      UPDATE public.expected_payments SET status = 'paid'
      WHERE appointment_id = r.id AND status = 'pending' AND amount <= v_consumed + 0.001;
    END IF;
  END LOOP;
  RETURN v_sessions_updated;
END $function$;

REVOKE EXECUTE ON FUNCTION public.apply_payment_to_client_debts(uuid,uuid,uuid,numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auto_apply_credits_to_client_outstanding(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_payment_to_client_debts(uuid,uuid,uuid,numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_apply_credits_to_client_outstanding(uuid) TO authenticated, service_role;

-- Only the server-side acceptance flow (service role) may mark an agreement accepted.
CREATE OR REPLACE FUNCTION public.guard_agreement_instance_acceptance()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(auth.role(), '') IN ('anon', 'authenticated') THEN
    IF NEW.status = 'accepted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'accepted') THEN
      RAISE EXCEPTION 'Agreements can only be accepted by the client';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.status = 'accepted' AND NEW.status NOT IN ('accepted', 'revoked') THEN
      RAISE EXCEPTION 'Accepted agreements cannot be reset';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_agreement_instance_acceptance ON public.agreement_instances;
CREATE TRIGGER guard_agreement_instance_acceptance
BEFORE INSERT OR UPDATE ON public.agreement_instances
FOR EACH ROW EXECUTE FUNCTION public.guard_agreement_instance_acceptance();