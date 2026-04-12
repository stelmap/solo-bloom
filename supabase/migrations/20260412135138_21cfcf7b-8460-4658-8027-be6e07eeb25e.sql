ALTER TABLE public.expenses
ADD COLUMN recurring_start_date date DEFAULT NULL;

-- Backfill: set recurring_start_date to the expense date for existing recurring expenses
UPDATE public.expenses
SET recurring_start_date = date
WHERE is_recurring = true AND recurring_start_date IS NULL;