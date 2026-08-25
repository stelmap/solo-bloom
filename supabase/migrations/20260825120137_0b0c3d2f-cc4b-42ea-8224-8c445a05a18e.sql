ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS flexible_session_price boolean NOT NULL DEFAULT false;

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS flex_price_applied boolean NOT NULL DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS standard_price numeric(10,2);

CREATE TABLE IF NOT EXISTS public.flexible_price_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  action text NOT NULL,
  standard_price numeric(10,2),
  actual_amount numeric(10,2),
  payment_source text,
  payment_date date,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.flexible_price_audit TO authenticated;
GRANT ALL ON public.flexible_price_audit TO service_role;

ALTER TABLE public.flexible_price_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own flexible price audit"
ON public.flexible_price_audit FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own flexible price audit"
ON public.flexible_price_audit FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_flex_audit_user ON public.flexible_price_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flex_audit_client ON public.flexible_price_audit(client_id);