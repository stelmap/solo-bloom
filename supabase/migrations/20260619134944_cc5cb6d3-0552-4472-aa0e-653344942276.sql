GRANT SELECT, INSERT ON public.user_activity_events TO authenticated;
GRANT INSERT ON public.user_activity_events TO anon;
GRANT ALL ON public.user_activity_events TO service_role;