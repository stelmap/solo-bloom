-- Track last-known reachability of each custom domain so we can email the owner on transitions
CREATE TABLE IF NOT EXISTS public.domain_status_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host TEXT NOT NULL UNIQUE,
  last_state TEXT NOT NULL CHECK (last_state IN ('active', 'unreachable', 'unknown')) DEFAULT 'unknown',
  last_status_code INTEGER,
  last_latency_ms INTEGER,
  last_error TEXT,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_transition_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.domain_status_checks ENABLE ROW LEVEL SECURITY;

-- Admin-only read/write from the client; the edge function uses the service role.
CREATE POLICY "Admins can view domain status"
  ON public.domain_status_checks
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can modify domain status"
  ON public.domain_status_checks
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger (reuses existing helper)
CREATE TRIGGER update_domain_status_checks_updated_at
  BEFORE UPDATE ON public.domain_status_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the two production hosts so the first run reports transitions correctly.
INSERT INTO public.domain_status_checks (host, last_state)
VALUES
  ('solo-bizz.com', 'unknown'),
  ('www.solo-bizz.com', 'unknown')
ON CONFLICT (host) DO NOTHING;