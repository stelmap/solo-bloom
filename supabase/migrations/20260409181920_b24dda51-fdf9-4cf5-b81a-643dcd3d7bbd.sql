-- Subscription cache to avoid hitting Stripe API on every page load
CREATE TABLE public.subscription_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  subscribed boolean NOT NULL DEFAULT false,
  on_trial boolean NOT NULL DEFAULT false,
  subscription_end timestamptz,
  trial_end timestamptz,
  price_id text,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_cache ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (edge functions use service role)
CREATE POLICY "Service role manages subscription cache"
  ON public.subscription_cache
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE INDEX idx_subscription_cache_user ON public.subscription_cache (user_id);

-- Timestamp trigger
CREATE TRIGGER update_subscription_cache_updated_at
  BEFORE UPDATE ON public.subscription_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();