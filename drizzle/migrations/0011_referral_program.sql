CREATE TABLE public.referral_program_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  commission_percent numeric(5,2) NOT NULL DEFAULT 10 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  reward_months integer NOT NULL DEFAULT 6 CHECK (reward_months > 0),
  attribution_days integer NOT NULL DEFAULT 30 CHECK (attribution_days > 0),
  min_payout numeric(12,2) NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_program_settings TO authenticated, anon;
GRANT ALL ON public.referral_program_settings TO service_role;
ALTER TABLE public.referral_program_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads referral settings" ON public.referral_program_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage referral settings" ON public.referral_program_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.referral_program_settings (id) VALUES (1);
GRANT UPDATE ON public.referral_program_settings TO authenticated;

CREATE TABLE public.referral_codes (
  user_id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own referral code" ON public.referral_codes FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.referral_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  code text NOT NULL,
  commission_percent numeric(5,2) NOT NULL,
  reward_months integer NOT NULL,
  link_opened_at timestamptz,
  registered_at timestamptz NOT NULL,
  reward_starts_at timestamptz NOT NULL,
  reward_ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (referrer_user_id <> referred_user_id)
);
GRANT SELECT ON public.referral_relationships TO authenticated;
GRANT ALL ON public.referral_relationships TO service_role;
ALTER TABLE public.referral_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referrer reads own referrals" ON public.referral_relationships FOR SELECT TO authenticated USING (referrer_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX referral_relationships_referrer_idx ON public.referral_relationships(referrer_user_id);

CREATE TABLE public.referral_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  relationship_id uuid REFERENCES public.referral_relationships(id),
  entry_type text NOT NULL CHECK (entry_type IN ('commission','reversal','subscription_credit','adjustment')),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  source_ref text NOT NULL,
  base_amount numeric(12,2),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_type, source_ref)
);
GRANT SELECT ON public.referral_ledger TO authenticated;
GRANT ALL ON public.referral_ledger TO service_role;
ALTER TABLE public.referral_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own referral ledger" ON public.referral_ledger FOR SELECT TO authenticated USING (referrer_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX referral_ledger_referrer_idx ON public.referral_ledger(referrer_user_id);

CREATE TABLE public.referral_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','rejected','cancelled')),
  payout_method text NOT NULL,
  payout_details text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  approved_by uuid,
  transaction_reference text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_payouts TO authenticated;
GRANT ALL ON public.referral_payouts TO service_role;
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own referral payouts" ON public.referral_payouts FOR SELECT TO authenticated USING (referrer_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.referral_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_audit TO authenticated;
GRANT ALL ON public.referral_audit TO service_role;
ALTER TABLE public.referral_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read referral audit" ON public.referral_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Own billing charge for the current period (actual plan price from billing).
CREATE OR REPLACE FUNCTION public._referral_own_charge(p_user uuid)
RETURNS TABLE(price numeric, currency text, plan_name text, billing_period text, period_start timestamptz, period_end timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pp.price, pp.currency, pl.name, pp.billing_period, s.current_period_start, s.current_period_end
  FROM subscriptions s JOIN plan_prices pp ON pp.id = s.current_price_id LEFT JOIN plans pl ON pl.id = s.current_plan_id
  WHERE s.user_id = p_user AND s.status IN ('active','trialing') AND COALESCE(s.legacy_full_access,false) = false
  ORDER BY s.updated_at DESC LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public._referral_balances(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_earned numeric; v_credit numeric; v_credit_period numeric; v_reserved numeric; v_paid numeric;
  v_balance numeric; v_price numeric := 0; v_cur text := 'EUR'; v_plan text; v_bp text; v_ps timestamptz; v_pe timestamptz;
  v_need numeric; v_covered numeric; v_withdrawable numeric;
BEGIN
  SELECT COALESCE(sum(amount) FILTER (WHERE entry_type IN ('commission','reversal','adjustment')),0),
         COALESCE(-sum(amount) FILTER (WHERE entry_type='subscription_credit'),0)
    INTO v_earned, v_credit FROM referral_ledger WHERE referrer_user_id = p_user;
  SELECT COALESCE(sum(amount) FILTER (WHERE status IN ('pending','processing')),0), COALESCE(sum(amount) FILTER (WHERE status='paid'),0)
    INTO v_reserved, v_paid FROM referral_payouts WHERE referrer_user_id = p_user;
  SELECT price, currency, plan_name, billing_period, period_start, period_end INTO v_price, v_cur, v_plan, v_bp, v_ps, v_pe FROM _referral_own_charge(p_user);
  v_price := COALESCE(v_price,0); v_cur := COALESCE(v_cur,'EUR');
  SELECT COALESCE(-sum(amount),0) INTO v_credit_period FROM referral_ledger
    WHERE referrer_user_id = p_user AND entry_type='subscription_credit' AND v_ps IS NOT NULL AND occurred_at >= v_ps AND (v_pe IS NULL OR occurred_at < v_pe);
  v_balance := GREATEST(v_earned - v_credit - v_reserved - v_paid, 0);
  v_need := GREATEST(v_price - v_credit_period, 0);
  v_covered := LEAST(v_price, v_credit_period + LEAST(v_balance, v_need));
  v_withdrawable := GREATEST(v_balance - v_need, 0);
  RETURN jsonb_build_object('earned', v_earned, 'credit_applied', v_credit, 'reserved', v_reserved, 'paid_out', v_paid,
    'balance', v_balance, 'own_price', v_price, 'currency', v_cur, 'plan_name', v_plan, 'billing_period', v_bp,
    'covered', v_covered, 'remaining_to_cover', GREATEST(v_price - v_covered,0), 'withdrawable', round(v_withdrawable,2));
END $$;

CREATE OR REPLACE FUNCTION public.get_my_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_code text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT code INTO v_code FROM referral_codes WHERE user_id = v_uid;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;
  LOOP
    v_code := lower(substr(replace(encode(gen_random_bytes(8),'base64'),'/',''),1,8));
    v_code := regexp_replace(v_code, '[^a-z0-9]', 'x', 'g');
    BEGIN
      INSERT INTO referral_codes(user_id, code) VALUES (v_uid, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      SELECT code INTO v_code FROM referral_codes WHERE user_id = v_uid;
      IF v_code IS NOT NULL THEN RETURN v_code; END IF;
    END;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.claim_referral(p_code text, p_opened_at timestamptz DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_ref uuid; v_created timestamptz; s referral_program_settings;
BEGIN
  IF v_uid IS NULL THEN RETURN 'not_authenticated'; END IF;
  SELECT user_id INTO v_ref FROM referral_codes WHERE code = lower(trim(p_code));
  IF v_ref IS NULL THEN RETURN 'invalid_code'; END IF;
  IF v_ref = v_uid THEN RETURN 'self_referral'; END IF;
  IF EXISTS (SELECT 1 FROM referral_relationships WHERE referred_user_id = v_uid) THEN RETURN 'already_attributed'; END IF;
  SELECT created_at INTO v_created FROM auth.users WHERE id = v_uid;
  IF v_created < now() - interval '1 day' THEN RETURN 'existing_account'; END IF;
  IF EXISTS (SELECT 1 FROM subscriptions WHERE user_id = v_uid AND (paddle_subscription_id IS NOT NULL OR stripe_subscription_id IS NOT NULL)) THEN RETURN 'existing_account'; END IF;
  SELECT * INTO s FROM referral_program_settings WHERE id = 1;
  IF p_opened_at IS NOT NULL AND p_opened_at < now() - make_interval(days => s.attribution_days) THEN RETURN 'expired_link'; END IF;
  INSERT INTO referral_relationships(referrer_user_id, referred_user_id, code, commission_percent, reward_months, link_opened_at, registered_at, reward_starts_at, reward_ends_at)
  VALUES (v_ref, v_uid, lower(trim(p_code)), s.commission_percent, s.reward_months, p_opened_at, v_created, v_created, v_created + make_interval(months => s.reward_months))
  ON CONFLICT (referred_user_id) DO NOTHING;
  INSERT INTO referral_audit(actor_user_id, action, details) VALUES (v_uid, 'referral_claimed', jsonb_build_object('referrer', v_ref));
  RETURN 'ok';
END $$;

-- Called by the payment webhook (service role only). Idempotent per payment.
CREATE OR REPLACE FUNCTION public.record_referral_payment(p_user uuid, p_payment_id text, p_net_amount numeric, p_currency text, p_paid_at timestamptz, p_period_start timestamptz DEFAULT NULL, p_period_end timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r referral_relationships; v_base numeric; v_fraction numeric := 1; v_commission numeric; v_bal jsonb; v_credit numeric; v_result jsonb := '{}'::jsonb;
BEGIN
  IF p_net_amount IS NULL OR p_net_amount <= 0 THEN RETURN v_result; END IF;
  -- 1) This user was referred: commission for the referrer.
  SELECT * INTO r FROM referral_relationships WHERE referred_user_id = p_user;
  IF FOUND THEN
    IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL AND p_period_end > p_period_start THEN
      v_fraction := GREATEST(0, EXTRACT(EPOCH FROM (LEAST(p_period_end, r.reward_ends_at) - GREATEST(p_period_start, r.reward_starts_at)))) / EXTRACT(EPOCH FROM (p_period_end - p_period_start));
      v_fraction := LEAST(v_fraction, 1);
    ELSIF p_paid_at < r.reward_starts_at OR p_paid_at >= r.reward_ends_at THEN
      v_fraction := 0;
    END IF;
    v_base := round(p_net_amount * v_fraction, 2);
    v_commission := round(v_base * r.commission_percent / 100, 2);
    IF v_commission > 0 THEN
      INSERT INTO referral_ledger(referrer_user_id, relationship_id, entry_type, amount, currency, source_ref, base_amount, occurred_at)
      VALUES (r.referrer_user_id, r.id, 'commission', v_commission, upper(p_currency), p_payment_id, v_base, p_paid_at)
      ON CONFLICT (entry_type, source_ref) DO NOTHING;
      v_result := v_result || jsonb_build_object('commission', v_commission);
    END IF;
  END IF;
  -- 2) This user is a referrer paying their own subscription: apply credit once.
  PERFORM pg_advisory_xact_lock(hashtext('referral:' || p_user::text));
  IF NOT EXISTS (SELECT 1 FROM referral_ledger WHERE entry_type='subscription_credit' AND source_ref = p_payment_id) THEN
    SELECT COALESCE(sum(amount) FILTER (WHERE entry_type IN ('commission','reversal','adjustment','subscription_credit')),0) INTO v_credit FROM referral_ledger WHERE referrer_user_id = p_user;
    v_credit := v_credit - COALESCE((SELECT sum(amount) FROM referral_payouts WHERE referrer_user_id = p_user AND status IN ('pending','processing','paid')),0);
    v_credit := LEAST(GREATEST(v_credit,0), p_net_amount);
    IF v_credit > 0 THEN
      INSERT INTO referral_ledger(referrer_user_id, entry_type, amount, currency, source_ref, base_amount, occurred_at, note)
      VALUES (p_user, 'subscription_credit', -v_credit, upper(p_currency), p_payment_id, p_net_amount, p_paid_at, 'Applied to own subscription');
      v_result := v_result || jsonb_build_object('credit_applied', v_credit);
    END IF;
  END IF;
  RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION public.record_referral_refund(p_payment_id text, p_refund_id text, p_refund_net numeric)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c referral_ledger; v_amount numeric;
BEGIN
  SELECT * INTO c FROM referral_ledger WHERE entry_type='commission' AND source_ref = p_payment_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  v_amount := CASE WHEN p_refund_net IS NULL OR c.base_amount IS NULL OR c.base_amount = 0 THEN c.amount
                   ELSE LEAST(c.amount, round(c.amount * p_refund_net / c.base_amount, 2)) END;
  INSERT INTO referral_ledger(referrer_user_id, relationship_id, entry_type, amount, currency, source_ref, base_amount, note)
  VALUES (c.referrer_user_id, c.relationship_id, 'reversal', -v_amount, c.currency, p_refund_id, p_refund_net, 'Refund of ' || p_payment_id)
  ON CONFLICT (entry_type, source_ref) DO NOTHING;
  RETURN v_amount;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_referral_dashboard()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); s referral_program_settings; v_refs jsonb; v_payouts jsonb; v_code text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO s FROM referral_program_settings WHERE id = 1;
  SELECT code INTO v_code FROM referral_codes WHERE user_id = v_uid;
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'registered_at' DESC), '[]'::jsonb) INTO v_refs FROM (
    SELECT jsonb_build_object(
      'id', r.id,
      'display_name', COALESCE(NULLIF(split_part(trim(p.full_name),' ',1),'') || CASE WHEN split_part(trim(p.full_name),' ',2) <> '' THEN ' ' || left(split_part(trim(p.full_name),' ',2),1) || '.' ELSE '' END, 'Користувач ' || left(r.id::text, 4)),
      'registered_at', r.registered_at, 'reward_starts_at', r.reward_starts_at, 'reward_ends_at', r.reward_ends_at,
      'commission_percent', r.commission_percent, 'reward_months', r.reward_months,
      'plan_name', pl.name,
      'subscription_status', sub.status,
      'status', CASE WHEN r.reward_ends_at <= now() THEN 'reward_ended'
                     WHEN sub.status IN ('active','trialing') THEN 'active'
                     WHEN sub.status = 'paused' THEN 'paused'
                     WHEN sub.status IN ('canceled','cancelled','expired') THEN 'canceled'
                     WHEN sub.status IN ('past_due','pending','incomplete') THEN 'awaiting_payment'
                     ELSE 'registered' END,
      'earned', COALESCE((SELECT sum(amount) FROM referral_ledger l WHERE l.relationship_id = r.id),0),
      'history', COALESCE((SELECT jsonb_agg(jsonb_build_object('type', l.entry_type, 'amount', l.amount, 'currency', l.currency, 'date', l.occurred_at) ORDER BY l.occurred_at DESC) FROM referral_ledger l WHERE l.relationship_id = r.id), '[]'::jsonb)
    ) x
    FROM referral_relationships r
    LEFT JOIN profiles p ON p.user_id = r.referred_user_id
    LEFT JOIN LATERAL (SELECT * FROM subscriptions s2 WHERE s2.user_id = r.referred_user_id ORDER BY s2.updated_at DESC LIMIT 1) sub ON true
    LEFT JOIN plans pl ON pl.id = sub.current_plan_id
    WHERE r.referrer_user_id = v_uid
  ) q;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'amount', amount, 'currency', currency, 'status', status, 'payout_method', payout_method, 'requested_at', requested_at, 'processed_at', processed_at) ORDER BY requested_at DESC), '[]'::jsonb)
    INTO v_payouts FROM referral_payouts WHERE referrer_user_id = v_uid;
  RETURN jsonb_build_object(
    'settings', jsonb_build_object('commission_percent', s.commission_percent, 'reward_months', s.reward_months, 'attribution_days', s.attribution_days, 'min_payout', s.min_payout),
    'code', v_code,
    'invited', jsonb_array_length(v_refs),
    'active', (SELECT count(*) FROM jsonb_array_elements(v_refs) e WHERE e->>'status' = 'active'),
    'balances', _referral_balances(v_uid),
    'referrals', v_refs, 'payouts', v_payouts);
END $$;

CREATE OR REPLACE FUNCTION public.request_referral_payout(p_amount numeric, p_method text, p_details text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_bal jsonb; v_id uuid; v_min numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_method NOT IN ('bank_card','iban','paypal') THEN RAISE EXCEPTION 'invalid_method'; END IF;
  IF p_details IS NULL OR length(trim(p_details)) < 4 OR length(p_details) > 200 THEN RAISE EXCEPTION 'invalid_details'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('referral:' || v_uid::text));
  SELECT min_payout INTO v_min FROM referral_program_settings WHERE id = 1;
  v_bal := _referral_balances(v_uid);
  IF p_amount IS NULL OR p_amount <= 0 OR round(p_amount,2) <> p_amount THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF p_amount > (v_bal->>'withdrawable')::numeric THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  IF p_amount < v_min THEN RAISE EXCEPTION 'below_minimum'; END IF;
  INSERT INTO referral_payouts(referrer_user_id, amount, currency, payout_method, payout_details)
  VALUES (v_uid, p_amount, v_bal->>'currency', p_method, trim(p_details)) RETURNING id INTO v_id;
  INSERT INTO referral_audit(actor_user_id, action, details) VALUES (v_uid, 'payout_requested', jsonb_build_object('payout', v_id, 'amount', p_amount));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_referral_payout(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE referral_payouts SET status='cancelled', updated_at=now() WHERE id = p_id AND referrer_user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_cancellable'; END IF;
  INSERT INTO referral_audit(actor_user_id, action, details) VALUES (auth.uid(), 'payout_cancelled', jsonb_build_object('payout', p_id));
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_referral_payout_status(p_id uuid, p_status text, p_reference text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_status NOT IN ('processing','paid','rejected') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  UPDATE referral_payouts SET status = p_status, approved_by = auth.uid(), transaction_reference = COALESCE(p_reference, transaction_reference),
    processed_at = CASE WHEN p_status IN ('paid','rejected') THEN now() ELSE processed_at END, updated_at = now()
  WHERE id = p_id AND status IN ('pending','processing');
  IF NOT FOUND THEN RAISE EXCEPTION 'not_updatable'; END IF;
  INSERT INTO referral_audit(actor_user_id, action, details) VALUES (auth.uid(), 'payout_' || p_status, jsonb_build_object('payout', p_id, 'reference', p_reference));
END $$;

REVOKE ALL ON FUNCTION public._referral_own_charge(uuid), public._referral_balances(uuid), public.record_referral_payment(uuid,text,numeric,text,timestamptz,timestamptz,timestamptz), public.record_referral_refund(text,text,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_referral_payment(uuid,text,numeric,text,timestamptz,timestamptz,timestamptz), public.record_referral_refund(text,text,numeric) TO service_role;
REVOKE ALL ON FUNCTION public.get_my_referral_code(), public.claim_referral(text,timestamptz), public.get_my_referral_dashboard(), public.request_referral_payout(numeric,text,text), public.cancel_referral_payout(uuid), public.admin_set_referral_payout_status(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_referral_code(), public.claim_referral(text,timestamptz), public.get_my_referral_dashboard(), public.request_referral_payout(numeric,text,text), public.cancel_referral_payout(uuid), public.admin_set_referral_payout_status(uuid,text,text) TO authenticated;