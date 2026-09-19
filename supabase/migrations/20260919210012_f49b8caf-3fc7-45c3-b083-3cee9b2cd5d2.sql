ALTER TABLE public.days_off DROP CONSTRAINT IF EXISTS days_off_user_id_date_key;
DROP INDEX IF EXISTS public.days_off_user_id_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS days_off_user_date_full_day_key
  ON public.days_off (user_id, date)
  WHERE is_non_working = true;