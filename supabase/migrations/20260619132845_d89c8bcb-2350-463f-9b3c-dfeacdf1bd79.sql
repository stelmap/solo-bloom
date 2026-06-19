
ALTER TABLE public.user_activity_events
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS path text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS anonymous_id text,
  ADD COLUMN IF NOT EXISTS session_id text;

CREATE INDEX IF NOT EXISTS user_activity_events_event_created_idx
  ON public.user_activity_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS user_activity_events_anonymous_id_idx
  ON public.user_activity_events (anonymous_id);

CREATE POLICY "Solo.Bizz superadmin can read all activity events"
  ON public.user_activity_events
  FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'o.gilevich@gmail.com'
  );
