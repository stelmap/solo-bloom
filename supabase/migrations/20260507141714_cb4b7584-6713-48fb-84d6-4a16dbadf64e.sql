-- Server-side admin gate for booking requests
CREATE OR REPLACE FUNCTION public.admin_list_booking_requests(
  p_status text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS SETOF public.booking_requests
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.booking_requests br
  WHERE (p_status IS NULL OR br.status = p_status)
    AND (p_from IS NULL OR br.created_at >= p_from)
    AND (p_to   IS NULL OR br.created_at <= p_to)
  ORDER BY br.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_booking_request_status(
  p_id uuid,
  p_status text
)
RETURNS public.booking_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.booking_requests;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('new','in_progress','done','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.booking_requests
     SET status = p_status
   WHERE id = p_id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_booking_email_logs(
  p_ids uuid[]
)
RETURNS SETOF public.email_send_log
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.email_send_log l
  WHERE l.message_id = ANY (
    SELECT 'booking-' || x::text FROM unnest(p_ids) AS x
  )
  ORDER BY l.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_booking_requests(text, timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_booking_request_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_booking_email_logs(uuid[]) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_booking_requests(text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_booking_request_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_booking_email_logs(uuid[]) TO authenticated;