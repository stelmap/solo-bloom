ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS prepaid_sessions_mode boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.session_prepayment_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('topup','use')),
  sessions integer NOT NULL CHECK (sessions > 0),
  amount numeric NOT NULL DEFAULT 0,
  income_id uuid REFERENCES public.income(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  reversed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.session_prepayment_ledger TO authenticated;
GRANT ALL ON public.session_prepayment_ledger TO service_role;
ALTER TABLE public.session_prepayment_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their prepaid session ledger" ON public.session_prepayment_ledger
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_spl_client ON public.session_prepayment_ledger(client_id);
-- One active deduction per appointment: repeated clicks cannot double-charge.
CREATE UNIQUE INDEX IF NOT EXISTS uq_spl_active_use ON public.session_prepayment_ledger(appointment_id)
  WHERE kind = 'use' AND reversed_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_spl_topup_income ON public.session_prepayment_ledger(income_id)
  WHERE kind = 'topup';

CREATE OR REPLACE FUNCTION public.prepaid_sessions_balance(p_client_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(CASE WHEN kind = 'topup' THEN sessions ELSE -sessions END), 0)::int
  FROM public.session_prepayment_ledger
  WHERE client_id = p_client_id AND reversed_at IS NULL;
$$;

-- Top-up: records a real payment (new or an existing unlinked one) and the
-- number of sessions it covers.
CREATE OR REPLACE FUNCTION public.add_prepaid_sessions(
  p_client_id uuid, p_sessions integer, p_amount numeric,
  p_date date DEFAULT CURRENT_DATE, p_payment_method_id uuid DEFAULT NULL, p_income_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_income uuid; v_amount numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_sessions IS NULL OR p_sessions < 1 OR p_sessions > 500 THEN RAISE EXCEPTION 'invalid_sessions'; END IF;
  PERFORM 1 FROM public.clients WHERE id = p_client_id AND user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'access_denied'; END IF;

  IF p_income_id IS NOT NULL THEN
    SELECT id, amount INTO v_income, v_amount FROM public.income
      WHERE id = p_income_id AND user_id = v_user AND client_id = p_client_id AND status = 'confirmed';
    IF v_income IS NULL THEN RAISE EXCEPTION 'payment_not_found'; END IF;
  ELSE
    IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
    INSERT INTO public.income (user_id, client_id, amount, date, source, status, description, payment_method_id)
    VALUES (v_user, p_client_id, p_amount, COALESCE(p_date, CURRENT_DATE), 'manual', 'confirmed',
            format('Prepayment for %s sessions', p_sessions), p_payment_method_id)
    RETURNING id INTO v_income;
    v_amount := p_amount;
  END IF;

  INSERT INTO public.session_prepayment_ledger (user_id, client_id, kind, sessions, amount, income_id)
  VALUES (v_user, p_client_id, 'topup', p_sessions, v_amount, v_income);
  RETURN public.prepaid_sessions_balance(p_client_id);
END $$;

-- Complete one session from the package: idempotent, never negative.
CREATE OR REPLACE FUNCTION public.complete_with_prepaid_session(p_appointment_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_client uuid; v_price numeric; v_mode boolean; v_balance int; v_unit numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT a.client_id, a.price INTO v_client, v_price FROM public.appointments a
    WHERE a.id = p_appointment_id AND a.user_id = v_user AND a.group_session_id IS NULL FOR UPDATE;
  IF v_client IS NULL THEN RAISE EXCEPTION 'appointment_not_found'; END IF;
  SELECT prepaid_sessions_mode INTO v_mode FROM public.clients WHERE id = v_client FOR UPDATE;
  IF NOT COALESCE(v_mode, false) THEN RAISE EXCEPTION 'prepaid_mode_off'; END IF;

  IF EXISTS (SELECT 1 FROM public.session_prepayment_ledger
             WHERE appointment_id = p_appointment_id AND kind = 'use' AND reversed_at IS NULL) THEN
    RETURN public.prepaid_sessions_balance(v_client);
  END IF;

  v_balance := public.prepaid_sessions_balance(v_client);
  IF v_balance <= 0 THEN RAISE EXCEPTION 'no_prepaid_sessions'; END IF;

  SELECT amount / NULLIF(sessions, 0) INTO v_unit FROM public.session_prepayment_ledger
    WHERE client_id = v_client AND kind = 'topup' ORDER BY created_at DESC LIMIT 1;

  -- Use the money already paid (no new revenue).
  PERFORM public.withdraw_from_prepayment_for_appointment(
    p_appointment_id, v_client, COALESCE(NULLIF(v_price, 0), v_unit, 0));

  INSERT INTO public.session_prepayment_ledger (user_id, client_id, kind, sessions, amount, appointment_id)
  VALUES (v_user, v_client, 'use', 1, COALESCE(v_unit, 0), p_appointment_id);

  UPDATE public.appointments SET status = 'completed', payment_status = 'paid_from_prepayment'
    WHERE id = p_appointment_id;
  RETURN v_balance - 1;
END $$;

-- Undoing a completion returns the session exactly once.
CREATE OR REPLACE FUNCTION public.reverse_prepaid_session_on_uncomplete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed' THEN
    UPDATE public.session_prepayment_ledger SET reversed_at = now()
      WHERE appointment_id = NEW.id AND kind = 'use' AND reversed_at IS NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_reverse_prepaid_session ON public.appointments;
CREATE TRIGGER trg_reverse_prepaid_session AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.reverse_prepaid_session_on_uncomplete();

REVOKE EXECUTE ON FUNCTION public.add_prepaid_sessions(uuid, integer, numeric, date, uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.complete_with_prepaid_session(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.prepaid_sessions_balance(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.add_prepaid_sessions(uuid, integer, numeric, date, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_with_prepaid_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepaid_sessions_balance(uuid) TO authenticated;