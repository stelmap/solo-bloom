
-- Add start_calculation_date to tax_settings
ALTER TABLE public.tax_settings 
ADD COLUMN IF NOT EXISTS start_calculation_date date NOT NULL DEFAULT CURRENT_DATE;

-- Add tax_setting_id to expenses to link generated tax expenses to their parent rule
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS tax_setting_id uuid REFERENCES public.tax_settings(id) ON DELETE SET NULL;

-- Add payment_status to expenses for paid/unpaid tracking
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

-- Add goal_type to breakeven_goals (monthly or yearly)
ALTER TABLE public.breakeven_goals 
ADD COLUMN IF NOT EXISTS goal_type text NOT NULL DEFAULT 'monthly';

-- Create index for tax-linked expenses lookup
CREATE INDEX IF NOT EXISTS idx_expenses_tax_setting_id ON public.expenses(tax_setting_id);
