CREATE OR REPLACE FUNCTION public.admin_list_subscriptions()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  status text,
  plan_code text,
  plan_name text,
  billing_period text,
  price numeric,
  currency text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  paddle_subscription_id text,
  paddle_customer_id text,
  legacy_full_access boolean,
  legacy_access_until timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.user_id,
    u.email::text,
    p.full_name,
    s.status::text,
    pl.code::text,
    pl.name::text,
    pp.billing_period::text,
    pp.price,
    pp.currency::text,
    s.current_period_start,
    s.current_period_end,
    s.paddle_subscription_id,
    s.paddle_customer_id,
    s.legacy_full_access,
    s.legacy_access_until,
    s.created_at,
    s.updated_at
  FROM public.subscriptions s
  LEFT JOIN auth.users u ON u.id = s.user_id
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  LEFT JOIN public.plans pl ON pl.id = s.current_plan_id
  LEFT JOIN public.plan_prices pp ON pp.id = s.current_price_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY s.updated_at DESC NULLS LAST
$$;

REVOKE ALL ON FUNCTION public.admin_list_subscriptions() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_list_subscriptions() TO authenticated;