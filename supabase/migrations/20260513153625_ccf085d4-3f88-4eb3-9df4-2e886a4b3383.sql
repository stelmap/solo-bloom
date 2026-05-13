REVOKE EXECUTE ON FUNCTION public.current_plan_client_limit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_plan_client_limit(uuid) TO authenticated;