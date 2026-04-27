REVOKE EXECUTE ON FUNCTION public.seed_demo_workspace(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_demo_workspace(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.seed_demo_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_demo_workspace(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_demo_workspace(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_demo_workspace(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.cleanup_demo_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_demo_workspace(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.user_has_demo_data(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_demo_data(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_has_demo_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_demo_data(uuid) TO service_role;