DROP INDEX IF EXISTS public.income_dedup_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS income_dedup_uniq
ON public.income (user_id, appointment_id, client_id, amount, date)
WHERE status = 'confirmed' AND is_demo = false AND appointment_id IS NOT NULL;