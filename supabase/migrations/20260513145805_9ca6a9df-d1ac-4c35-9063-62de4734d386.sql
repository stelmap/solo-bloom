-- Phase 1: Add columns for materialized recurring expense instances with statuses

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS instance_status text NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS paid_date date NULL,
  ADD COLUMN IF NOT EXISTS recurrence_type text NULL,
  ADD COLUMN IF NOT EXISTS is_last_day_of_month boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_id uuid NULL REFERENCES public.expenses(id) ON DELETE SET NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_instance_status_check') THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_instance_status_check
      CHECK (instance_status IN ('planned','paid','cancelled'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_recurrence_type_check') THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_recurrence_type_check
      CHECK (recurrence_type IS NULL OR recurrence_type IN ('monthly','yearly'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS expenses_template_date_uniq
  ON public.expenses (template_id, date)
  WHERE template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS expenses_template_id_idx ON public.expenses (template_id) WHERE template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS expenses_user_status_date_idx ON public.expenses (user_id, instance_status, date);

-- Backfill 1: map legacy payment_status -> instance_status for non-recurring rows
UPDATE public.expenses
SET instance_status = CASE
  WHEN payment_status = 'paid' THEN 'paid'
  WHEN payment_status = 'cancelled' THEN 'cancelled'
  ELSE 'planned'
END,
    paid_date = CASE WHEN payment_status = 'paid' THEN date ELSE NULL END
WHERE is_recurring = false
  AND template_id IS NULL
  AND is_template = false;

-- Backfill 2: convert existing recurring template rows
UPDATE public.expenses
SET is_template = true,
    recurrence_type = COALESCE(recurrence_type, 'monthly'),
    is_last_day_of_month = (
      EXTRACT(DAY FROM COALESCE(recurring_start_date, date))::int
      = EXTRACT(DAY FROM (date_trunc('month', COALESCE(recurring_start_date, date)) + interval '1 month - 1 day'))::int
    )
WHERE is_recurring = true
  AND is_template = false
  AND template_id IS NULL;

-- Backfill 3: materialize 12 monthly instances per template
DO $$
DECLARE
  tpl RECORD;
  i int;
  start_date date;
  start_day int;
  is_last boolean;
  occ_year int;
  occ_month int;
  occ_day int;
  occ_date date;
  last_day_of_month int;
  exists_count int;
BEGIN
  FOR tpl IN SELECT * FROM public.expenses WHERE is_template = true LOOP
    start_date := COALESCE(tpl.recurring_start_date, tpl.date);
    start_day := EXTRACT(DAY FROM start_date)::int;
    is_last := tpl.is_last_day_of_month;

    FOR i IN 0..11 LOOP
      occ_year := EXTRACT(YEAR FROM (start_date + (i || ' months')::interval))::int;
      occ_month := EXTRACT(MONTH FROM (start_date + (i || ' months')::interval))::int;
      last_day_of_month := EXTRACT(DAY FROM (date_trunc('month', make_date(occ_year, occ_month, 1)) + interval '1 month - 1 day'))::int;
      occ_day := CASE WHEN is_last THEN last_day_of_month ELSE LEAST(start_day, last_day_of_month) END;
      occ_date := make_date(occ_year, occ_month, occ_day);

      SELECT COUNT(*) INTO exists_count FROM public.expenses
        WHERE template_id = tpl.id AND date = occ_date;
      IF exists_count = 0 THEN
        INSERT INTO public.expenses (
          user_id, category, amount, date, description,
          is_recurring, recurring_start_date, recurring_group_id,
          payment_status, instance_status, paid_date,
          template_id, is_template, recurrence_type, is_last_day_of_month,
          tax_setting_id
        )
        VALUES (
          tpl.user_id, tpl.category, tpl.amount, occ_date, tpl.description,
          false, NULL, tpl.recurring_group_id,
          'unpaid', 'planned', NULL,
          tpl.id, false, NULL, false,
          tpl.tax_setting_id
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;