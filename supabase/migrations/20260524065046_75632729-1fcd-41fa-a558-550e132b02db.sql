CREATE OR REPLACE FUNCTION public.list_session_booking_requests(
  p_status text DEFAULT NULL,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  link_id uuid,
  appointment_id uuid,
  client_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  comment text,
  requested_slot_at timestamptz,
  duration_minutes int,
  status text,
  matched_client_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
    SELECT sbr.id, sbr.link_id, sbr.appointment_id, sbr.client_id,
           sbr.first_name, sbr.last_name, sbr.email, sbr.phone, sbr.comment,
           sbr.requested_slot_at, sbr.duration_minutes, sbr.status,
           c.name AS matched_client_name,
           sbr.created_at
      FROM public.session_booking_requests sbr
      LEFT JOIN public.clients c ON c.id = sbr.client_id
     WHERE sbr.user_id = v_uid
       AND (p_status IS NULL OR sbr.status = p_status)
     ORDER BY sbr.created_at DESC
     LIMIT GREATEST(1, LEAST(p_limit, 500));
END $$;