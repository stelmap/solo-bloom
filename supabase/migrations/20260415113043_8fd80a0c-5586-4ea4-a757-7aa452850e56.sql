
-- Add pricing fields to clients
ALTER TABLE public.clients
ADD COLUMN pricing_mode text NOT NULL DEFAULT 'fixed',
ADD COLUMN base_price numeric DEFAULT NULL;

-- Add override reason to appointments
ALTER TABLE public.appointments
ADD COLUMN price_override_reason text DEFAULT NULL;

-- Create price change history table
CREATE TABLE public.client_price_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  appointment_id uuid DEFAULT NULL,
  old_price numeric,
  new_price numeric NOT NULL,
  reason text,
  change_type text NOT NULL DEFAULT 'base_price_change',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_price_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own client_price_changes"
ON public.client_price_changes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_client_price_changes_client ON public.client_price_changes(client_id, created_at DESC);
