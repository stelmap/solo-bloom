-- Tax-generated expenses are one row per accrual period; they should NOT be templates.
-- Revert: delete instances spawned from tax templates and demote those templates.

DELETE FROM public.expenses
WHERE template_id IN (
  SELECT id FROM public.expenses
  WHERE is_template = true AND tax_setting_id IS NOT NULL
);

UPDATE public.expenses
SET is_template = false,
    is_recurring = false,
    recurrence_type = NULL,
    is_last_day_of_month = false,
    instance_status = CASE
      WHEN payment_status = 'paid' THEN 'paid'
      WHEN payment_status = 'cancelled' THEN 'cancelled'
      ELSE 'planned'
    END,
    paid_date = CASE WHEN payment_status = 'paid' THEN date ELSE NULL END
WHERE is_template = true
  AND tax_setting_id IS NOT NULL;