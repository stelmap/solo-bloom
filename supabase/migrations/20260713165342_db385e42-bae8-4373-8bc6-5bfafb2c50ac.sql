DROP POLICY IF EXISTS "Solo.Bizz superadmin can read all activity events" ON public.user_activity_events;
DROP POLICY IF EXISTS "Admins can read all activity events" ON public.user_activity_events;

CREATE POLICY "Admins can read all activity events"
ON public.user_activity_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'o.gilevich@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;