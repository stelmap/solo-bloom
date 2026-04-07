
-- Tax settings table
CREATE TABLE public.tax_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tax_name TEXT NOT NULL DEFAULT 'Tax',
  tax_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  tax_rate NUMERIC NOT NULL DEFAULT 0, -- percentage rate (e.g. 5, 10, 20)
  fixed_amount NUMERIC NOT NULL DEFAULT 0, -- fixed amount per period
  frequency TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' or 'quarterly'
  is_active BOOLEAN NOT NULL DEFAULT true,
  calculate_on TEXT NOT NULL DEFAULT 'actual_income', -- 'actual_income' or 'all_income'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tax_name)
);

ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tax_settings" ON public.tax_settings
  FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add 'Tax' to expense categories by adding a category column marker
-- We'll use expenses table's category field = 'Tax' for tax expenses
