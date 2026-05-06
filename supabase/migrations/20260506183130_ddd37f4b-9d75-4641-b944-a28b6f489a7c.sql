
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_built_in BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own payment_methods"
  ON public.payment_methods FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper to ensure default methods exist for a user (idempotent)
CREATE OR REPLACE FUNCTION public.ensure_default_payment_methods(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    IF auth.role() <> 'service_role' THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;

  INSERT INTO public.payment_methods (user_id, code, name, is_built_in, is_active, sort_order)
  VALUES
    (p_user_id, 'cash',          'Cash',          true, true,  1),
    (p_user_id, 'card',          'Card',          true, true,  2),
    (p_user_id, 'bank_transfer', 'Bank Transfer', true, true,  3),
    (p_user_id, 'paypal',        'PayPal',        true, false, 4),
    (p_user_id, 'check',         'Check',         true, false, 5)
  ON CONFLICT (user_id, code) DO NOTHING;
END;
$$;
