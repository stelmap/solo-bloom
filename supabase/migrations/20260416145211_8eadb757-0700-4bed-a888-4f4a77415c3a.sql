
-- Add billing fields to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS billing_address text,
  ADD COLUMN IF NOT EXISTS billing_country text,
  ADD COLUMN IF NOT EXISTS billing_tax_id text,
  ADD COLUMN IF NOT EXISTS billing_company_name text;

-- Add provider billing fields and VAT config to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_id text,
  ADD COLUMN IF NOT EXISTS business_address text,
  ADD COLUMN IF NOT EXISTS vat_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 0;

-- Create invoices table
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  session_date date NOT NULL,
  service_name text NOT NULL,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  client_billing_address text,
  client_billing_country text,
  client_billing_tax_id text,
  client_billing_company text,
  provider_name text,
  provider_email text,
  provider_phone text,
  provider_business_id text,
  provider_address text,
  net_amount numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  vat_mode text NOT NULL DEFAULT 'none',
  currency text NOT NULL DEFAULT 'EUR',
  language text NOT NULL DEFAULT 'en',
  payment_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own invoices"
  ON public.invoices FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Invoice number generator function
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_month text;
  v_seq int;
  v_prefix text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_month := to_char(CURRENT_DATE, 'MM');
  v_prefix := v_year || '/' || v_month || '/';
  
  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.invoices
  WHERE user_id = p_user_id
    AND invoice_number LIKE v_prefix || '%';
  
  RETURN v_prefix || lpad(v_seq::text, 4, '0');
END;
$$;
