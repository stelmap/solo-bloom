CREATE OR REPLACE FUNCTION public.prepaid_sessions_balance(p_client_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(CASE WHEN kind = 'topup' THEN sessions ELSE -sessions END), 0)::int
  FROM public.session_prepayment_ledger
  WHERE client_id = p_client_id AND reversed_at IS NULL
    AND (auth.uid() IS NULL OR user_id = auth.uid());
$$;