CREATE OR REPLACE FUNCTION public.public_create_booking(p_token text, p_slot_at timestamp with time zone, p_first_name text, p_last_name text, p_email text, p_phone text, p_comment text, p_consent boolean, p_ip_hash text)
 RETURNS TABLE(request_id uuid, status text, requires_approval boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_link record;
  v_dur int;
  v_recent_count int;
  v_matched_client uuid;
  v_status text;
  v_new_id uuid;
  v_appointment_id uuid;
BEGIN
  IF NOT COALESCE(p_consent, false) THEN RAISE EXCEPTION 'Consent required'; END IF;
  IF length(trim(coalesce(p_first_name,''))) < 1 OR length(trim(coalesce(p_first_name,''))) > 120 THEN
    RAISE EXCEPTION 'Invalid first_name'; END IF;
  IF length(trim(coalesce(p_email,''))) < 3 OR length(trim(coalesce(p_email,''))) > 254
     OR p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email'; END IF;
  IF p_phone IS NOT NULL AND length(p_phone) > 40 THEN RAISE EXCEPTION 'Invalid phone'; END IF;
  IF p_comment IS NOT NULL AND length(p_comment) > 2000 THEN RAISE EXCEPTION 'Invalid comment'; END IF;

  SELECT bl.id, bl.user_id, bl.is_active, bl.mode
    INTO v_link
    FROM public.booking_links bl
   WHERE bl.token = p_token
   LIMIT 1;

  IF v_link.user_id IS NULL OR v_link.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Booking link is not active';
  END IF;

  IF p_ip_hash IS NOT NULL THEN
    SELECT count(*) INTO v_recent_count
      FROM public.session_booking_requests sbr
     WHERE sbr.ip_hash = p_ip_hash AND sbr.created_at > now() - interval '1 hour';
    IF v_recent_count >= 5 THEN
      RAISE EXCEPTION 'Too many requests, please try again later';
    END IF;
  END IF;

  SELECT ba.session_duration_minutes INTO v_dur
    FROM public.booking_availability ba WHERE ba.user_id = v_link.user_id LIMIT 1;
  v_dur := COALESCE(v_dur, 60);

  IF EXISTS (
    SELECT 1 FROM public.appointments a
     WHERE a.user_id = v_link.user_id
       AND a.status NOT IN ('cancelled','no-show')
       AND tstzrange(a.scheduled_at, a.scheduled_at + (a.duration_minutes||' minutes')::interval,'[)')
           && tstzrange(p_slot_at, p_slot_at + (v_dur||' minutes')::interval,'[)')
  ) OR EXISTS (
    SELECT 1 FROM public.session_booking_requests sbr
     WHERE sbr.user_id = v_link.user_id
       AND sbr.status IN ('pending','confirmed')
       AND sbr.requested_slot_at = p_slot_at
  ) THEN
    RAISE EXCEPTION 'Slot no longer available';
  END IF;

  SELECT c.id INTO v_matched_client
    FROM public.clients c
   WHERE c.user_id = v_link.user_id
     AND c.status = 'active'
     AND (lower(c.email) = lower(p_email) OR (p_phone IS NOT NULL AND c.phone = p_phone))
   LIMIT 1;

  v_status := CASE
    WHEN v_link.mode = 'auto' AND v_matched_client IS NOT NULL THEN 'confirmed'
    WHEN v_matched_client IS NULL THEN 'needs_linking'
    ELSE 'pending'
  END;

  INSERT INTO public.session_booking_requests (
    user_id, link_id, client_id, first_name, last_name, email, phone, comment,
    consent_at, requested_slot_at, duration_minutes, status, ip_hash
  ) VALUES (
    v_link.user_id, v_link.id, v_matched_client, trim(p_first_name), nullif(trim(coalesce(p_last_name,'')),''),
    lower(trim(p_email)), nullif(trim(coalesce(p_phone,'')),''), nullif(trim(coalesce(p_comment,'')),''),
    now(), p_slot_at, v_dur, v_status, p_ip_hash
  ) RETURNING id INTO v_new_id;

  IF v_status = 'confirmed' AND v_matched_client IS NOT NULL THEN
    INSERT INTO public.appointments (
      user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, notes
    )
    SELECT v_link.user_id, v_matched_client, s.id, p_slot_at, v_dur, COALESCE(s.price, 0), 'scheduled',
           'Booked via public link' || CASE WHEN p_comment IS NOT NULL THEN E'\n\n' || p_comment ELSE '' END
    FROM public.services s
    WHERE s.user_id = v_link.user_id
    ORDER BY s.created_at ASC
    LIMIT 1
    RETURNING id INTO v_appointment_id;

    UPDATE public.session_booking_requests
       SET appointment_id = v_appointment_id
     WHERE id = v_new_id;
  END IF;

  RETURN QUERY SELECT v_new_id, v_status, (v_link.mode = 'manual');
END $function$;