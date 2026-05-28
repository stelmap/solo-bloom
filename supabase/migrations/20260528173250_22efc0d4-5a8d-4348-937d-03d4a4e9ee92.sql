
-- Trigger function: ensure each waiting_for_payment group_session_payment has a live pending expected_payment.
CREATE OR REPLACE FUNCTION public.sync_group_session_payment_expected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apt_id uuid;
  v_existing_ep uuid;
BEGIN
  SELECT appointment_id INTO v_apt_id FROM public.group_sessions WHERE id = NEW.group_session_id;
  IF v_apt_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.payment_state = 'waiting_for_payment'
     AND COALESCE(NEW.amount, 0) > 0
     AND COALESCE(NEW.billing_rule_applied, true) = true THEN

    -- Look for any existing expected_payment for this participant/appointment
    SELECT id INTO v_existing_ep
      FROM public.expected_payments
     WHERE appointment_id = v_apt_id
       AND client_id = NEW.client_id
       AND user_id = NEW.user_id
     ORDER BY (status = 'pending') DESC, created_at DESC
     LIMIT 1;

    IF v_existing_ep IS NULL THEN
      INSERT INTO public.expected_payments
        (user_id, client_id, appointment_id, amount, status, is_demo)
      VALUES
        (NEW.user_id, NEW.client_id, v_apt_id, NEW.amount, 'pending',
         COALESCE((SELECT is_demo FROM public.appointments WHERE id = v_apt_id), false))
      RETURNING id INTO v_existing_ep;

      UPDATE public.group_session_payments
         SET expected_payment_id = v_existing_ep
       WHERE id = NEW.id;
    ELSIF NEW.expected_payment_id IS DISTINCT FROM v_existing_ep THEN
      UPDATE public.group_session_payments
         SET expected_payment_id = v_existing_ep
       WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_gsp_expected ON public.group_session_payments;
CREATE TRIGGER trg_sync_gsp_expected
  AFTER INSERT OR UPDATE OF payment_state, amount, billing_rule_applied, group_session_id, client_id
  ON public.group_session_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_group_session_payment_expected();

-- One-shot backfill helper
CREATE OR REPLACE FUNCTION public.backfill_group_expected_payments()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_apt_id uuid;
  v_ep_id uuid;
  v_created int := 0;
BEGIN
  FOR r IN
    SELECT * FROM public.group_session_payments
     WHERE payment_state = 'waiting_for_payment'
       AND COALESCE(amount, 0) > 0
       AND COALESCE(billing_rule_applied, true) = true
  LOOP
    SELECT appointment_id INTO v_apt_id FROM public.group_sessions WHERE id = r.group_session_id;
    IF v_apt_id IS NULL THEN CONTINUE; END IF;

    SELECT id INTO v_ep_id
      FROM public.expected_payments
     WHERE appointment_id = v_apt_id
       AND client_id = r.client_id
       AND user_id = r.user_id
     ORDER BY (status = 'pending') DESC, created_at DESC
     LIMIT 1;

    IF v_ep_id IS NULL THEN
      INSERT INTO public.expected_payments
        (user_id, client_id, appointment_id, amount, status, is_demo)
      VALUES
        (r.user_id, r.client_id, v_apt_id, r.amount, 'pending',
         COALESCE((SELECT is_demo FROM public.appointments WHERE id = v_apt_id), false))
      RETURNING id INTO v_ep_id;
      v_created := v_created + 1;
    END IF;

    IF r.expected_payment_id IS DISTINCT FROM v_ep_id THEN
      UPDATE public.group_session_payments
         SET expected_payment_id = v_ep_id
       WHERE id = r.id;
    END IF;
  END LOOP;
  RETURN v_created;
END;
$$;
