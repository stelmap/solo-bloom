
-- Step 1: Finance dedup — remove duplicate confirmed income rows (non-demo).
-- Keep the earliest (created_at, id) per (user_id, appointment_id, amount, date).
-- Reassign FK-like references from dropped rows to the kept row before deletion.

CREATE TEMP TABLE _income_dedup_map ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    id,
    user_id,
    appointment_id,
    amount,
    date,
    created_at,
    FIRST_VALUE(id) OVER (
      PARTITION BY user_id, appointment_id, amount, date
      ORDER BY created_at ASC, id ASC
    ) AS keep_id
  FROM public.income
  WHERE status = 'confirmed'
    AND is_demo = false
    AND appointment_id IS NOT NULL
)
SELECT id AS dup_id, keep_id
FROM ranked
WHERE id <> keep_id;

-- Reassign income_session_allocations
UPDATE public.income_session_allocations isa
SET income_id = m.keep_id
FROM _income_dedup_map m
WHERE isa.income_id = m.dup_id
  AND NOT EXISTS (
    SELECT 1 FROM public.income_session_allocations isa2
    WHERE isa2.income_id = m.keep_id AND isa2.appointment_id = isa.appointment_id
  );

DELETE FROM public.income_session_allocations isa
USING _income_dedup_map m
WHERE isa.income_id = m.dup_id;

-- Reassign income_audit
UPDATE public.income_audit a
SET income_id = m.keep_id
FROM _income_dedup_map m
WHERE a.income_id = m.dup_id;

-- Reassign group_session_payments.income_id
UPDATE public.group_session_payments gsp
SET income_id = m.keep_id
FROM _income_dedup_map m
WHERE gsp.income_id = m.dup_id;

-- Reassign client_credits.income_id (null out if there's a conflict, safest)
UPDATE public.client_credits cc
SET income_id = m.keep_id
FROM _income_dedup_map m
WHERE cc.income_id = m.dup_id;

-- Finally delete the duplicate income rows
DELETE FROM public.income i
USING _income_dedup_map m
WHERE i.id = m.dup_id;

-- Step 2: Prevent future duplicates via a partial unique index on non-demo confirmed rows
CREATE UNIQUE INDEX IF NOT EXISTS income_dedup_uniq
ON public.income (user_id, appointment_id, amount, date)
WHERE status = 'confirmed' AND is_demo = false AND appointment_id IS NOT NULL;

-- Step 3: Recalc payment status for affected appointments
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT appointment_id
    FROM public.income
    WHERE id IN (SELECT keep_id FROM _income_dedup_map)
  LOOP
    PERFORM public.recalc_appointment_payment_status(r.appointment_id);
  END LOOP;
END $$;

-- Step 4: Remove zero-amount tax expense placeholders
DELETE FROM public.expenses
WHERE amount = 0
  AND (
    category ILIKE '%tax%'
    OR description ILIKE '%tax%'
    OR description ILIKE '%подат%'
  );
