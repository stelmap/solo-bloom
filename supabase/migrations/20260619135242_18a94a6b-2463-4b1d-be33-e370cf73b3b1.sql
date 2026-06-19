DROP POLICY IF EXISTS "Solo.Bizz superadmin can read all activity events" ON public.user_activity_events;

CREATE POLICY "Solo.Bizz superadmin can read all activity events"
ON public.user_activity_events
FOR SELECT
TO authenticated
USING (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'o.gilevich@gmail.com'
);

GRANT SELECT, INSERT ON public.user_activity_events TO authenticated;
GRANT ALL ON public.user_activity_events TO service_role;