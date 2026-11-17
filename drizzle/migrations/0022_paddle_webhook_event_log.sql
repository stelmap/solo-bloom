CREATE TABLE public.paddle_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  occurred_at timestamptz,
  subscription_id text,
  customer_id text,
  user_id uuid,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received',
  error text,
  attempts integer NOT NULL DEFAULT 1,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX paddle_webhook_events_sub_idx ON public.paddle_webhook_events (subscription_id, occurred_at DESC);
GRANT SELECT ON public.paddle_webhook_events TO authenticated;
GRANT ALL ON public.paddle_webhook_events TO service_role;
ALTER TABLE public.paddle_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read paddle webhook log" ON public.paddle_webhook_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.paddle_subscription_event_state (
  subscription_id text PRIMARY KEY,
  last_occurred_at timestamptz NOT NULL,
  last_event_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.paddle_subscription_event_state TO service_role;
ALTER TABLE public.paddle_subscription_event_state ENABLE ROW LEVEL SECURITY;

-- Atomically accept a subscription event only if it is not older than the newest applied one.
CREATE OR REPLACE FUNCTION public.claim_paddle_subscription_event(p_subscription_id text, p_event_id text, p_occurred_at timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ok boolean;
BEGIN
  INSERT INTO public.paddle_subscription_event_state AS s (subscription_id, last_occurred_at, last_event_id)
  VALUES (p_subscription_id, p_occurred_at, p_event_id)
  ON CONFLICT (subscription_id) DO UPDATE
    SET last_occurred_at = EXCLUDED.last_occurred_at, last_event_id = EXCLUDED.last_event_id, updated_at = now()
    WHERE EXCLUDED.last_occurred_at > s.last_occurred_at
       OR (EXCLUDED.last_occurred_at = s.last_occurred_at AND EXCLUDED.last_event_id = s.last_event_id)
  RETURNING true INTO v_ok;
  RETURN COALESCE(v_ok, false);
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_paddle_subscription_event(text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_paddle_subscription_event(text, text, timestamptz) TO service_role;