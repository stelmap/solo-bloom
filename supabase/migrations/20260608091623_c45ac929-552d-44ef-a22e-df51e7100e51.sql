CREATE TABLE IF NOT EXISTS public.user_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_activity_events_user_id_idx ON public.user_activity_events (user_id);
CREATE INDEX IF NOT EXISTS user_activity_events_event_name_idx ON public.user_activity_events (event_name);
CREATE INDEX IF NOT EXISTS user_activity_events_created_at_idx ON public.user_activity_events (created_at DESC);

GRANT SELECT, INSERT ON public.user_activity_events TO authenticated;
GRANT ALL ON public.user_activity_events TO service_role;

ALTER TABLE public.user_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own activity events"
ON public.user_activity_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own activity events"
ON public.user_activity_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all activity events"
ON public.user_activity_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));