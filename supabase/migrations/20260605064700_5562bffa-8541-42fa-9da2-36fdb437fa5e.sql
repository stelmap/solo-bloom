ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_country text;
UPDATE public.profiles SET business_country = 'UA' WHERE business_country IS NULL AND tax_id_type IN ('ipn','edrpou');

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS provider_business_country text;