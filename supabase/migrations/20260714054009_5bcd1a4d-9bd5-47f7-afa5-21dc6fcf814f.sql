WITH agg AS (
  SELECT
    a.user_id,
    isa.appointment_id,
    a.client_id,
    a.scheduled_at,
    SUM(isa.allocated_amount) AS total_alloc
  FROM public.income_session_allocations isa
  JOIN public.appointments a ON a.id = isa.appointment_id
  WHERE isa.from_prepayment = true
  GROUP BY a.user_id, isa.appointment_id, a.client_id, a.scheduled_at
)
INSERT INTO public.income (
  user_id, appointment_id, client_id, amount, date, session_date,
  source, status, description, payment_method,
  balance_before, balance_after, source_prepayment_income_id
)
SELECT
  agg.user_id,
  agg.appointment_id,
  agg.client_id,
  0,
  COALESCE((agg.scheduled_at AT TIME ZONE 'UTC')::date, CURRENT_DATE),
  (agg.scheduled_at AT TIME ZONE 'UTC')::date,
  'prepayment_withdrawal',
  'confirmed',
  format('Backfilled: %s deducted from prepayment balance for session on %s.',
    agg.total_alloc::text,
    to_char(agg.scheduled_at, 'DD.MM.YYYY')),
  'prepayment',
  agg.total_alloc,
  0,
  (
    SELECT cc.income_id
    FROM public.client_credits cc
    WHERE cc.client_id = agg.client_id
      AND cc.user_id = agg.user_id
      AND cc.income_id IS NOT NULL
    ORDER BY cc.created_at ASC
    LIMIT 1
  )
FROM agg
WHERE NOT EXISTS (
  SELECT 1 FROM public.income i
  WHERE i.source = 'prepayment_withdrawal'
    AND i.appointment_id = agg.appointment_id
    AND i.client_id = agg.client_id
)
AND NOT EXISTS (
  SELECT 1 FROM public.income i2
  WHERE i2.user_id = agg.user_id
    AND i2.appointment_id = agg.appointment_id
    AND i2.amount = 0
    AND i2.date = COALESCE((agg.scheduled_at AT TIME ZONE 'UTC')::date, CURRENT_DATE)
    AND i2.status = 'confirmed'
    AND i2.is_demo = false
);