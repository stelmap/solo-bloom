REVOKE EXECUTE ON FUNCTION public.current_plan_client_limit(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_plan_client_limit(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.current_plan_client_limit(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.current_plan_client_limit(uuid) TO service_role;