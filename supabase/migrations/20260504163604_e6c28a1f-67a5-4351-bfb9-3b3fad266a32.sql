-- 1. Add status + comment to income
ALTER TABLE public.income
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS comment text;

-- Validation trigger for income.status
CREATE OR REPLACE FUNCTION public.validate_income_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('confirmed','draft','cancelled') THEN
    RAISE EXCEPTION 'invalid income.status: %', NEW.status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_income_status ON public.income;
CREATE TRIGGER trg_validate_income_status
BEFORE INSERT OR UPDATE ON public.income
FOR EACH ROW EXECUTE FUNCTION public.validate_income_status();

-- 2. income_session_allocations
CREATE TABLE IF NOT EXISTS public.income_session_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  income_id uuid NOT NULL,
  appointment_id uuid NOT NULL,
  allocated_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(income_id, appointment_id)
);
CREATE INDEX IF NOT EXISTS idx_isa_appointment ON public.income_session_allocations(appointment_id);
CREATE INDEX IF NOT EXISTS idx_isa_income ON public.income_session_allocations(income_id);
CREATE INDEX IF NOT EXISTS idx_isa_user ON public.income_session_allocations(user_id);

ALTER TABLE public.income_session_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own income_session_allocations" ON public.income_session_allocations;
CREATE POLICY "Users manage own income_session_allocations"
ON public.income_session_allocations FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_isa_updated_at ON public.income_session_allocations;
CREATE TRIGGER trg_isa_updated_at
BEFORE UPDATE ON public.income_session_allocations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. client_credits (prepaid balance movements)
CREATE TABLE IF NOT EXISTS public.client_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  income_id uuid,
  amount numeric NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cc_client ON public.client_credits(client_id);
CREATE INDEX IF NOT EXISTS idx_cc_income ON public.client_credits(income_id);
CREATE INDEX IF NOT EXISTS idx_cc_user ON public.client_credits(user_id);

ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own client_credits" ON public.client_credits;
CREATE POLICY "Users manage own client_credits"
ON public.client_credits FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. income_audit
CREATE TABLE IF NOT EXISTS public.income_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  income_id uuid,
  action text NOT NULL,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ia_income ON public.income_audit(income_id);
CREATE INDEX IF NOT EXISTS idx_ia_user ON public.income_audit(user_id);

ALTER TABLE public.income_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own income_audit" ON public.income_audit;
CREATE POLICY "Users manage own income_audit"
ON public.income_audit FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Recalc function
CREATE OR REPLACE FUNCTION public.recalc_appointment_payment_status(p_appointment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid;
  v_price numeric;
  v_scheduled timestamptz;
  v_status text;
  v_alloc numeric;
  v_min_pay_date date;
  v_new_status text;
BEGIN
  SELECT user_id, price, scheduled_at, status
  INTO v_user, v_price, v_scheduled, v_status
  FROM public.appointments WHERE id = p_appointment_id;
  IF v_user IS NULL THEN RETURN; END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(SUM(isa.allocated_amount), 0), MIN(i.date)
  INTO v_alloc, v_min_pay_date
  FROM public.income_session_allocations isa
  JOIN public.income i ON i.id = isa.income_id
  WHERE isa.appointment_id = p_appointment_id
    AND i.status = 'confirmed';

  IF v_status IN ('cancelled','no-show') THEN
    RETURN; -- don't override cancellation/no-show payment_status
  END IF;

  IF v_alloc <= 0 THEN
    -- leave existing unpaid/waiting_for_payment as-is unless it was paid before
    IF v_status IS NOT NULL THEN
      UPDATE public.appointments
      SET payment_status = CASE
        WHEN payment_status IN ('paid_now','paid_in_advance','partially_paid') THEN 'unpaid'
        ELSE payment_status
      END
      WHERE id = p_appointment_id;
    END IF;
    RETURN;
  END IF;

  IF v_alloc >= COALESCE(v_price, 0) AND COALESCE(v_price,0) > 0 THEN
    IF v_min_pay_date IS NOT NULL AND v_min_pay_date < v_scheduled::date THEN
      v_new_status := 'paid_in_advance';
    ELSE
      v_new_status := 'paid_now';
    END IF;
  ELSE
    v_new_status := 'partially_paid';
  END IF;

  UPDATE public.appointments
  SET payment_status = v_new_status
  WHERE id = p_appointment_id;
END $$;