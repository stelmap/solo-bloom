
DROP FUNCTION IF EXISTS public.list_session_booking_requests(text, integer);

ALTER TABLE public.session_booking_requests
  ADD COLUMN IF NOT EXISTS confirmation_email_status text,
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_email_error text;

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
  created_at timestamptz,
  confirmation_email_status text,
  confirmation_email_sent_at timestamptz,
  confirmation_email_error text
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
           sbr.created_at,
           sbr.confirmation_email_status,
           sbr.confirmation_email_sent_at,
           sbr.confirmation_email_error
      FROM public.session_booking_requests sbr
      LEFT JOIN public.clients c ON c.id = sbr.client_id
     WHERE sbr.user_id = v_uid
       AND (p_status IS NULL OR sbr.status = p_status)
     ORDER BY sbr.created_at DESC
     LIMIT GREATEST(1, LEAST(p_limit, 500));
END $$;

GRANT EXECUTE ON FUNCTION public.list_session_booking_requests(text, integer)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_booking_request(
  p_id uuid,
  p_client_id uuid DEFAULT NULL,
  p_service_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req record;
  v_client uuid;
  v_service uuid;
  v_price numeric;
  v_appt uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_req FROM public.session_booking_requests
   WHERE id = p_id AND user_id = v_uid FOR UPDATE;
  IF v_req IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status NOT IN ('pending','needs_linking') THEN
    RAISE EXCEPTION 'Request is not actionable';
  END IF;

  v_client := COALESCE(p_client_id, v_req.client_id);
  IF v_client IS NULL THEN RAISE EXCEPTION 'Client is required'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = v_client AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Client does not belong to user';
  END IF;

  IF p_service_id IS NOT NULL THEN
    SELECT id, price INTO v_service, v_price FROM public.services
     WHERE id = p_service_id AND user_id = v_uid;
  END IF;
  IF v_service IS NULL THEN
    SELECT id, price INTO v_service, v_price FROM public.services
     WHERE user_id = v_uid ORDER BY created_at ASC LIMIT 1;
  END IF;
  IF v_service IS NULL THEN RAISE EXCEPTION 'No service available'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointments a
     WHERE a.user_id = v_uid
       AND a.status NOT IN ('cancelled','no-show')
       AND tstzrange(a.scheduled_at, a.scheduled_at + (a.duration_minutes||' minutes')::interval,'[)')
           && tstzrange(v_req.requested_slot_at,
                        v_req.requested_slot_at + (v_req.duration_minutes||' minutes')::interval,'[)')
  ) THEN
    RAISE EXCEPTION 'Slot conflicts with another appointment';
  END IF;

  INSERT INTO public.appointments (
    user_id, client_id, service_id, scheduled_at, duration_minutes, price,
    status, confirmation_status, confirmation_timestamp, notes
  ) VALUES (
    v_uid, v_client, v_service, v_req.requested_slot_at, v_req.duration_minutes,
    COALESCE(v_price, 0), 'scheduled', 'confirmed', now(),
    'Booked via public link' ||
      CASE WHEN v_req.comment IS NOT NULL THEN E'\n\n' || v_req.comment ELSE '' END
  ) RETURNING id INTO v_appt;

  UPDATE public.session_booking_requests
     SET status = 'confirmed', client_id = v_client, appointment_id = v_appt
   WHERE id = p_id;

  RETURN v_appt;
END $$;

GRANT EXECUTE ON FUNCTION public.confirm_booking_request(uuid, uuid, uuid)
  TO authenticated;
