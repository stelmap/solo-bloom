ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_on_invoice boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE public.payment_methods pm SET is_default = true
WHERE pm.code = 'cash' AND NOT EXISTS (SELECT 1 FROM public.payment_methods x WHERE x.user_id = pm.user_id AND x.is_default);

CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_one_default_per_user
  ON public.payment_methods (user_id) WHERE is_default;

ALTER TABLE public.income
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS payment_method_id uuid,
  ADD COLUMN IF NOT EXISTS payment_method_name text,
  ADD COLUMN IF NOT EXISTS payment_source text NOT NULL DEFAULT 'new_payment';

UPDATE public.income i SET currency = COALESCE(p.currency, 'EUR')
FROM public.profiles p WHERE p.user_id = i.user_id AND i.currency IS NULL;
UPDATE public.income SET currency = 'EUR' WHERE currency IS NULL;

UPDATE public.income i SET payment_method_id = pm.id, payment_method_name = pm.name
FROM public.payment_methods pm
WHERE pm.user_id = i.user_id AND pm.code = i.payment_method AND i.payment_method_name IS NULL;

UPDATE public.income SET payment_source = 'prepaid_balance' WHERE source = 'prepayment_withdrawal';

CREATE OR REPLACE FUNCTION public.income_snapshot_payment_details()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pm record;
BEGIN
  IF NEW.currency IS NULL THEN
    SELECT COALESCE(currency, 'EUR') INTO NEW.currency FROM public.profiles WHERE user_id = NEW.user_id;
    NEW.currency := COALESCE(NEW.currency, 'EUR');
  END IF;
  IF NEW.source = 'prepayment_withdrawal' THEN
    NEW.payment_source := 'prepaid_balance';
  END IF;
  IF TG_OP = 'INSERT' OR NEW.payment_method IS DISTINCT FROM OLD.payment_method THEN
    SELECT id, name INTO v_pm FROM public.payment_methods
     WHERE user_id = NEW.user_id AND code = NEW.payment_method LIMIT 1;
    IF FOUND THEN
      NEW.payment_method_id := v_pm.id;
      NEW.payment_method_name := v_pm.name;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS income_snapshot_payment_details ON public.income;
CREATE TRIGGER income_snapshot_payment_details BEFORE INSERT OR UPDATE ON public.income
FOR EACH ROW EXECUTE FUNCTION public.income_snapshot_payment_details();

CREATE OR REPLACE FUNCTION public.ensure_default_payment_methods(p_user_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Access denied'; END IF;
  END IF;
  INSERT INTO public.payment_methods (user_id, code, name, is_built_in, is_active, sort_order)
  VALUES
    (p_user_id, 'cash','Cash',true,true,1),
    (p_user_id, 'check','Check',true,true,2),
    (p_user_id, 'paypal','PayPal',true,true,3),
    (p_user_id, 'bank_transfer','Bank Transfer',true,true,4),
    (p_user_id, 'card','Card',true,false,5)
  ON CONFLICT (user_id, code) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE user_id = p_user_id AND is_default AND is_active AND deleted_at IS NULL) THEN
    UPDATE public.payment_methods SET is_default = false WHERE user_id = p_user_id AND is_default;
    UPDATE public.payment_methods SET is_default = true
     WHERE id = (SELECT id FROM public.payment_methods WHERE user_id = p_user_id AND is_active AND deleted_at IS NULL ORDER BY (code='cash') DESC, sort_order LIMIT 1);
  END IF;
END;
$function$;