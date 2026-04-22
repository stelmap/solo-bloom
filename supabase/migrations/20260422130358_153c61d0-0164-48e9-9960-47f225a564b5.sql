CREATE OR REPLACE FUNCTION public.check_client_revenue_consistency()
RETURNS TABLE(
  client_id uuid,
  direct_total numeric,
  via_appointment_total numeric,
  difference numeric,
  issue text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH per_client_direct AS (
    SELECT i.client_id, SUM(i.amount) AS total
    FROM public.income i
    WHERE i.client_id IS NOT NULL
    GROUP BY i.client_id
  ),
  per_client_via_apt AS (
    SELECT a.client_id, SUM(i.amount) AS total
    FROM public.income i
    JOIN public.appointments a ON a.id = i.appointment_id
    WHERE a.client_id IS NOT NULL
    GROUP BY a.client_id
  )
  SELECT
    COALESCE(d.client_id, v.client_id) AS client_id,
    COALESCE(d.total, 0)::numeric AS direct_total,
    COALESCE(v.total, 0)::numeric AS via_appointment_total,
    (COALESCE(d.total, 0) - COALESCE(v.total, 0))::numeric AS difference,
    CASE
      WHEN COALESCE(d.total, 0) < COALESCE(v.total, 0) THEN 'income missing client_id link'
      WHEN COALESCE(d.total, 0) > COALESCE(v.total, 0) THEN 'manual income (no appointment) — expected'
      ELSE 'ok'
    END AS issue
  FROM per_client_direct d
  FULL OUTER JOIN per_client_via_apt v ON d.client_id = v.client_id
  WHERE COALESCE(d.total, 0) <> COALESCE(v.total, 0);
$$;