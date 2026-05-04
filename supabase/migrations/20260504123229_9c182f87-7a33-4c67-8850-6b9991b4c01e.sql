CREATE TABLE public.payment_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  appointment_id UUID NOT NULL,
  previous_payment_status TEXT,
  new_payment_status TEXT NOT NULL,
  previous_payment_date DATE,
  new_payment_date DATE,
  previous_payment_method TEXT,
  new_payment_method TEXT,
  correction_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own payment_corrections"
ON public.payment_corrections
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_payment_corrections_appointment ON public.payment_corrections(appointment_id);
CREATE INDEX idx_payment_corrections_user ON public.payment_corrections(user_id);