
ALTER TABLE public.user_activity_events ALTER COLUMN user_id DROP NOT NULL;

GRANT INSERT ON public.user_activity_events TO anon;

CREATE POLICY "Anonymous can insert anonymous activity events"
  ON public.user_activity_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Authenticated can insert anonymous activity events"
  ON public.user_activity_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL);
