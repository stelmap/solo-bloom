-- Add payment_method to income table
ALTER TABLE public.income ADD COLUMN payment_method text NOT NULL DEFAULT 'cash';
