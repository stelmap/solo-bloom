-- Plan-aware active-client limit helper.
-- Returns the user's allowed active-client count, or NULL for unlimited.
CREATE OR REPLACE FUNCTION public.current_plan_client_limit(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cache record;
  v_is_paid boolean := false;
  v_code text;
BEGIN
  SELECT subscribed, on_trial, subscription_end, trial_end, price_id
  INTO v_cache
  FROM public.subscription_cache
  WHERE user_id = p_user_id
  LIMIT 1;

  IF FOUND THEN
    v_is_paid :=
      (COALESCE(v_cache.subscribed, false) = true
        AND (v_cache.subscription_end IS NULL OR v_cache.subscription_end > now()))
      OR
      (COALESCE(v_cache.on_trial, false) = true
        AND (v_cache.trial_end IS NULL OR v_cache.trial_end > now()));
  END IF;

  -- Legacy full-access users -> unlimited.
  IF NOT v_is_paid THEN
    IF EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = p_user_id
        AND s.legacy_full_access = true
        AND (s.legacy_access_until IS NULL OR s.legacy_access_until > now())
    ) THEN
      RETURN NULL;
    END IF;
    RETURN 5;  -- Free Starter cap.
  END IF;

  -- Resolve plan code from the active price.
  IF v_cache.price_id IS NOT NULL THEN
    SELECT p.code INTO v_code
    FROM public.plan_prices pp
    JOIN public.plans p ON p.id = pp.plan_id
    WHERE pp.stripe_price_id = v_cache.price_id
    LIMIT 1;
  END IF;

  IF v_code = 'solo' THEN
    RETURN 20;
  END IF;

  -- pro / legacy plans -> unlimited.
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_plan_client_limit(uuid) TO authenticated, anon;

-- Update the existing trigger to use the plan-aware limit.
CREATE OR REPLACE FUNCTION public.enforce_free_starter_client_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_active_count int := 0;
BEGIN
  IF COALESCE(NEW.is_demo, false) = true THEN RETURN NEW; END IF;
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.status, 'active') <> 'active' THEN RETURN NEW; END IF;

  v_limit := public.current_plan_client_limit(NEW.user_id);
  IF v_limit IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_active_count
  FROM public.clients
  WHERE user_id = NEW.user_id
    AND status = 'active'
    AND COALESCE(is_demo, false) = false
    AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

  IF v_active_count >= v_limit THEN
    IF v_limit = 5 THEN
      RAISE EXCEPTION 'FREE_STARTER_CLIENT_LIMIT_REACHED' USING ERRCODE = 'P0001';
    ELSE
      RAISE EXCEPTION 'PLAN_CLIENT_LIMIT_REACHED:%', v_limit USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;