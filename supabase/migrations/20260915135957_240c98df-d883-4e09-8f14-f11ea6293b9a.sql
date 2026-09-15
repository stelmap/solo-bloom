ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS legacy_provider text,
  ADD COLUMN IF NOT EXISTS migration_prompt_dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS migrated_to_paddle_at timestamptz;

UPDATE public.subscriptions
SET legacy_provider = 'stripe'
WHERE stripe_subscription_id IS NOT NULL
  AND paddle_subscription_id IS NULL
  AND legacy_provider IS NULL;

CREATE OR REPLACE FUNCTION public.dismiss_paddle_migration_prompt()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.subscriptions
  SET migration_prompt_dismissed_at = now()
  WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.dismiss_paddle_migration_prompt() FROM public;
GRANT EXECUTE ON FUNCTION public.dismiss_paddle_migration_prompt() TO authenticated;