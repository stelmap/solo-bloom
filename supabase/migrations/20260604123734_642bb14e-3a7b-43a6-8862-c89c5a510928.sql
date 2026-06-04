ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_id_type text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS provider_business_id_type text;