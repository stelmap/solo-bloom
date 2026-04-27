REVOKE EXECUTE ON FUNCTION public.seed_demo_workspace(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.seed_demo_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_demo_workspace(uuid) TO service_role;