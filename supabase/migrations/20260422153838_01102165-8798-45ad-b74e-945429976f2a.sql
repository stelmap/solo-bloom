-- =========================================================
-- New Licensing Model: Plans, Prices, Subscriptions, Entitlements
-- =========================================================

-- ---------- PLANS ----------
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active plans"
  ON public.plans FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.role() = 'service_role');

CREATE POLICY "Service role manages plans"
  ON public.plans FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- PLAN PRICES ----------
CREATE TABLE IF NOT EXISTS public.plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  billing_period text NOT NULL CHECK (billing_period IN ('monthly','quarterly','yearly')),
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  is_active boolean NOT NULL DEFAULT true,
  stripe_price_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_prices_plan ON public.plan_prices(plan_id);

ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active prices"
  ON public.plan_prices FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.role() = 'service_role');

CREATE POLICY "Service role manages plan_prices"
  ON public.plan_prices FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER plan_prices_updated_at
  BEFORE UPDATE ON public.plan_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- SUBSCRIPTIONS ----------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  current_plan_id uuid REFERENCES public.plans(id),
  current_price_id uuid REFERENCES public.plan_prices(id),
  status text NOT NULL DEFAULT 'legacy'
    CHECK (status IN ('active','legacy','past_due','cancelled','expired','trialing','incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  legacy_full_access boolean NOT NULL DEFAULT false,
  legacy_access_until timestamptz,
  migrated_at timestamptz,
  migration_version int,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_unique ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- ENTITLEMENTS ----------
CREATE TABLE IF NOT EXISTS public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_code text NOT NULL
    CHECK (feature_code IN ('operational_access','financial_access','premium_access')),
  source_type text NOT NULL
    CHECK (source_type IN ('legacy','plan','promotion','manual')),
  source_ref uuid,
  active_from timestamptz NOT NULL DEFAULT now(),
  active_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user ON public.entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_active ON public.entitlements(user_id, is_active, feature_code);
-- Idempotency: one active row per (user, feature, source)
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_unique_active
  ON public.entitlements(user_id, feature_code, source_type)
  WHERE is_active = true;

ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own entitlements"
  ON public.entitlements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages entitlements"
  ON public.entitlements FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER entitlements_updated_at
  BEFORE UPDATE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- PROMOTIONS ----------
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('percent','fixed','trial_extension','free_period')),
  value numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active promotions"
  ON public.promotions FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.role() = 'service_role');

CREATE POLICY "Service role manages promotions"
  ON public.promotions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- USER PLAN HISTORY ----------
CREATE TABLE IF NOT EXISTS public.user_plan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  previous_plan_snapshot jsonb,
  previous_entitlement_snapshot jsonb,
  new_plan_id uuid REFERENCES public.plans(id),
  change_reason text NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uph_user ON public.user_plan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_uph_reason ON public.user_plan_history(change_reason);

ALTER TABLE public.user_plan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own plan history"
  ON public.user_plan_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages plan history"
  ON public.user_plan_history FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =========================================================
-- Seed placeholder plans (Medium / Gold / Premium)
-- =========================================================
INSERT INTO public.plans (name, code, description, is_active) VALUES
  ('Medium',  'medium',  'Operational access (calendar, clients, groups, services).', true),
  ('Gold',    'gold',    'Operational + financial access (income, expenses, break-even).', true),
  ('Premium', 'premium', 'Everything + supervision and advanced features.', true)
ON CONFLICT (code) DO NOTHING;

-- Placeholder monthly prices (€0 — to be filled in later)
INSERT INTO public.plan_prices (plan_id, billing_period, price, currency, is_active)
SELECT p.id, 'monthly', 0, 'EUR', true
FROM public.plans p
WHERE p.code IN ('medium','gold','premium')
  AND NOT EXISTS (
    SELECT 1 FROM public.plan_prices pp
    WHERE pp.plan_id = p.id AND pp.billing_period = 'monthly'
  );

-- =========================================================
-- Migration function: grandfather a single user
-- =========================================================
CREATE OR REPLACE FUNCTION public.migrate_legacy_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cache record;
  v_access_until timestamptz;
  v_sub_id uuid;
  v_existing_sub record;
  v_migration_version constant int := 1;
BEGIN
  -- Idempotency: if user already migrated at this version, return early
  SELECT * INTO v_existing_sub
  FROM public.subscriptions
  WHERE user_id = p_user_id;

  IF v_existing_sub.id IS NOT NULL AND v_existing_sub.migration_version = v_migration_version THEN
    RETURN jsonb_build_object('status','already_migrated','user_id',p_user_id);
  END IF;

  -- Read current paid status from existing cache
  SELECT * INTO v_cache
  FROM public.subscription_cache
  WHERE user_id = p_user_id;

  -- Determine end of paid period
  v_access_until := COALESCE(v_cache.subscription_end, v_cache.trial_end);

  -- Skip users with no paid access at all (no subscription row created)
  IF v_cache IS NULL OR (NOT COALESCE(v_cache.subscribed, false) AND NOT COALESCE(v_cache.on_trial, false)) THEN
    RETURN jsonb_build_object('status','skipped_no_paid_access','user_id',p_user_id);
  END IF;

  -- Upsert legacy subscription
  IF v_existing_sub.id IS NULL THEN
    INSERT INTO public.subscriptions (
      user_id, status, current_period_end,
      legacy_full_access, legacy_access_until,
      migrated_at, migration_version
    ) VALUES (
      p_user_id, 'legacy', v_access_until,
      true, v_access_until,
      now(), v_migration_version
    )
    RETURNING id INTO v_sub_id;
  ELSE
    UPDATE public.subscriptions
    SET status = 'legacy',
        current_period_end = v_access_until,
        legacy_full_access = true,
        legacy_access_until = v_access_until,
        migrated_at = now(),
        migration_version = v_migration_version
    WHERE id = v_existing_sub.id
    RETURNING id INTO v_sub_id;
  END IF;

  -- Grant legacy premium_access entitlement until period end (snapshot of current full access)
  INSERT INTO public.entitlements (user_id, feature_code, source_type, source_ref, active_from, active_until, is_active)
  VALUES (p_user_id, 'premium_access', 'legacy', v_sub_id, now(), v_access_until, true)
  ON CONFLICT (user_id, feature_code, source_type) WHERE is_active = true
  DO UPDATE SET active_until = EXCLUDED.active_until, source_ref = EXCLUDED.source_ref, updated_at = now();

  -- Audit history
  INSERT INTO public.user_plan_history (
    user_id, previous_plan_snapshot, previous_entitlement_snapshot,
    new_plan_id, change_reason, effective_from
  ) VALUES (
    p_user_id,
    to_jsonb(v_cache),
    jsonb_build_array(jsonb_build_object('feature_code','premium_access','source','legacy','until',v_access_until)),
    NULL,
    'legacy_migration_v1',
    now()
  );

  RETURN jsonb_build_object(
    'status','migrated',
    'user_id',p_user_id,
    'legacy_access_until',v_access_until,
    'subscription_id',v_sub_id
  );
END;
$$;

-- =========================================================
-- Migration function: run for all users with cached subs
-- =========================================================
CREATE OR REPLACE FUNCTION public.migrate_all_legacy_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_result jsonb;
  v_migrated int := 0;
  v_skipped int := 0;
  v_already int := 0;
BEGIN
  -- Only callable by service role
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied: service_role required';
  END IF;

  FOR v_user IN
    SELECT DISTINCT user_id FROM public.subscription_cache
  LOOP
    v_result := public.migrate_legacy_user(v_user.user_id);
    IF v_result->>'status' = 'migrated' THEN
      v_migrated := v_migrated + 1;
    ELSIF v_result->>'status' = 'already_migrated' THEN
      v_already := v_already + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'migrated', v_migrated,
    'already_migrated', v_already,
    'skipped', v_skipped,
    'ran_at', now()
  );
END;
$$;