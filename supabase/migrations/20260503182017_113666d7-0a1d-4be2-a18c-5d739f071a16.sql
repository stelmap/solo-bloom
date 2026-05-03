
-- Add income_recognition_method to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS income_recognition_method text NOT NULL DEFAULT 'payment_date';

-- Add CHECK via trigger to allow only allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_income_recognition_method_check'
      AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_income_recognition_method_check
      CHECK (income_recognition_method IN ('payment_date', 'session_date'));
  END IF;
END $$;

-- Add session_date column to income (date only, when the session was conducted)
ALTER TABLE public.income
  ADD COLUMN IF NOT EXISTS session_date date;

-- Backfill session_date for existing income rows from linked appointments
UPDATE public.income i
SET session_date = (a.scheduled_at AT TIME ZONE 'UTC')::date
FROM public.appointments a
WHERE i.session_date IS NULL
  AND i.appointment_id = a.id;

-- For pure manual income, default session_date to payment date
UPDATE public.income
SET session_date = date
WHERE session_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_income_session_date ON public.income(user_id, session_date);
