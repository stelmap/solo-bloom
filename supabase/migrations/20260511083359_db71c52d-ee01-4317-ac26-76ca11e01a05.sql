
-- Backfill recurring_start_date from earliest row in each group
WITH first_rows AS (
  SELECT recurring_group_id, MIN(date) AS first_date
  FROM public.expenses
  WHERE is_recurring = true AND recurring_group_id IS NOT NULL
  GROUP BY recurring_group_id
)
UPDATE public.expenses e
SET recurring_start_date = COALESCE(e.recurring_start_date, fr.first_date)
FROM first_rows fr
WHERE e.recurring_group_id = fr.recurring_group_id;

-- For standalone recurring expenses (no group), backfill start date from date
UPDATE public.expenses
SET recurring_start_date = date
WHERE is_recurring = true
  AND recurring_group_id IS NULL
  AND recurring_start_date IS NULL;

-- Collapse each recurring group to a single template row (the earliest date)
DELETE FROM public.expenses e
USING (
  SELECT recurring_group_id, MIN(date) AS keep_date
  FROM public.expenses
  WHERE is_recurring = true AND recurring_group_id IS NOT NULL
  GROUP BY recurring_group_id
) keep
WHERE e.recurring_group_id = keep.recurring_group_id
  AND e.is_recurring = true
  AND e.date <> keep.keep_date;

-- Set the kept template row's date to its recurring_start_date for consistency
UPDATE public.expenses
SET date = recurring_start_date
WHERE is_recurring = true
  AND recurring_start_date IS NOT NULL
  AND date <> recurring_start_date;
