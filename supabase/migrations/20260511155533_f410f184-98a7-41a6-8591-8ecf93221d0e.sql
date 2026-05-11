-- Server-side enforcement of the Free Starter Mode 5-client limit.
-- Mirrors the client-side check in useFreeStarterMode so requests that bypass
-- the UI (direct REST calls, scripts, etc.) are still blocked.

CREATE OR REPLACE FUNCTION public.enforce_free_starter_client_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit constant int := 5;
  v_is_paid boolean := false;
  v_active_count int := 0;
  v_cache record;
BEGIN
  -- Demo / seeded records bypass the limit (used by seed_demo_workspace).
  IF COALESCE(NEW.is_demo, false) = true THEN
    RETURN NEW;
  END IF;

  -- Service role operations bypass the limit (admin tooling, edge functions).
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Only enforce on active clients. Archived clients don't count.
  IF COALESCE(NEW.status, 'active') <> 'active' THEN
    RETURN NEW;
  END IF;

  -- Determine paid status from subscription_cache (same source as the app).
  SELECT subscribed, on_trial, subscription_end, trial_end
  INTO v_cache
  FROM public.subscription_cache
  WHERE user_id = NEW.user_id
  LIMIT 1;

  IF FOUND THEN
    v_is_paid :=
      (COALESCE(v_cache.subscribed, false) = true
        AND (v_cache.subscription_end IS NULL OR v_cache.subscription_end > now()))
      OR
      (COALESCE(v_cache.on_trial, false) = true
        AND (v_cache.trial_end IS NULL OR v_cache.trial_end > now()));
  END IF;

  -- Legacy users with full access via subscriptions table are also paid.
  IF NOT v_is_paid THEN
    IF EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = NEW.user_id
        AND s.legacy_full_access = true
        AND (s.legacy_access_until IS NULL OR s.legacy_access_until > now())
    ) THEN
      v_is_paid := true;
    END IF;
  END IF;

  IF v_is_paid THEN
    RETURN NEW;
  END IF;

  -- Unpaid: count existing active, non-demo clients for this user.
  SELECT COUNT(*) INTO v_active_count
  FROM public.clients
  WHERE user_id = NEW.user_id
    AND status = 'active'
    AND is_demo = false;

  IF v_active_count >= v_limit THEN
    RAISE EXCEPTION 'FREE_STARTER_CLIENT_LIMIT_REACHED: Free plan allows up to % active clients. Upgrade to add more.', v_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_free_starter_client_limit ON public.clients;

CREATE TRIGGER trg_enforce_free_starter_client_limit
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.enforce_free_starter_client_limit();