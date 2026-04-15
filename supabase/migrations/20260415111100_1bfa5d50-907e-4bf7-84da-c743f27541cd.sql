-- Add billing rule columns to groups
ALTER TABLE public.groups
ADD COLUMN bill_present boolean NOT NULL DEFAULT true,
ADD COLUMN bill_absent boolean NOT NULL DEFAULT false,
ADD COLUMN bill_skipped boolean NOT NULL DEFAULT false;

-- Add per-member price override to group_members
ALTER TABLE public.group_members
ADD COLUMN price_per_session numeric DEFAULT NULL;

-- Create group_session_payments table for payment traceability
CREATE TABLE public.group_session_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  group_id uuid NOT NULL,
  group_session_id uuid NOT NULL,
  client_id uuid NOT NULL,
  attendance_status text NOT NULL,
  billing_rule_applied boolean NOT NULL DEFAULT true,
  amount numeric NOT NULL DEFAULT 0,
  payment_state text NOT NULL DEFAULT 'waiting_for_payment',
  payment_method text DEFAULT NULL,
  income_id uuid DEFAULT NULL,
  expected_payment_id uuid DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_session_payments ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users manage own group_session_payments"
ON public.group_session_payments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_group_session_payments_updated_at
BEFORE UPDATE ON public.group_session_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();