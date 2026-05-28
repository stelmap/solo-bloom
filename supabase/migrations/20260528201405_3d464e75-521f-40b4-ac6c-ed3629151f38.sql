-- The internal Calendar treats appointments.scheduled_at as wall-clock UTC
-- (saves the typed hour as ...:00Z and renders via getUTCHours). Public booking
-- must use the IDENTICAL convention or it desynchronises by the profile's tz
-- offset. Switch slot anchoring & validation to UTC.

CREATE OR REPLACE FUNCTION public.public_get_available_slots(p_token text, p_from_date date, p_to_date date)
 RETURNS TABLE(slot_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_active boolean;
  v_dur int;
  v_min_notice int;
  v_max_horizon int;
  v_day date;
  v_dow_pg smallint;
  v_dow_app smallint;
  v_rule record;
  v_start_t time;
  v_end_t time;
  v_slot timestamptz;
  v_slot_end timestamptz;
  v_min_from timestamptz;
  v_max_to date;
  v_key text;
BEGIN
  v_key := lower(trim(coalesce(p_token, '')));
  SELECT bl.user_id, bl.is_active INTO v_user, v_active
    FROM public.booking_links bl
   WHERE bl.token = p_token OR lower(bl.slug) = v_key
   LIMIT 1;

  IF v_user IS NULL OR v_active IS NOT TRUE THEN RETURN; END IF;

  SELECT COALESCE(p.default_duration, 60) INTO v_dur
    FROM public.profiles p WHERE p.user_id = v_user LIMIT 1;
  IF v_dur IS NULL OR v_dur <= 0 THEN v_dur := 60; END IF;

  SELECT COALESCE(min_notice_hours, 24), COALESCE(max_horizon_days, 30)
    INTO v_min_notice, v_max_horizon
    FROM public.booking_availability WHERE user_id = v_user LIMIT 1;
  IF v_min_notice IS NULL THEN v_min_notice := 24; END IF;
  IF v_max_horizon IS NULL THEN v_max_horizon := 30; END IF;

  v_min_from := now() + (v_min_notice || ' hours')::interval;
  v_max_to := LEAST(p_to_date, (now() + (v_max_horizon || ' days')::interval)::date);

  v_day := GREATEST(p_from_date, current_date);
  WHILE v_day <= v_max_to LOOP
    v_dow_pg := EXTRACT(DOW FROM v_day)::smallint;
    v_dow_app := CASE WHEN v_dow_pg = 0 THEN 7 ELSE v_dow_pg END;

    FOR v_rule IN
      SELECT start_time, end_time
        FROM public.working_schedule
       WHERE user_id = v_user
         AND day_of_week = v_dow_app
         AND is_working = true
    LOOP
      BEGIN
        v_start_t := v_rule.start_time::time;
        v_end_t   := v_rule.end_time::time;
      EXCEPTION WHEN others THEN
        CONTINUE;
      END;

      IF v_end_t <= v_start_t THEN CONTINUE; END IF;

      -- Anchor slots in UTC wall-clock, matching the Calendar's storage.
      v_slot := ((v_day::text || ' ' || to_char(v_start_t, 'HH24:MI:SS'))::timestamp) AT TIME ZONE 'UTC';

      LOOP
        v_slot_end := v_slot + (v_dur || ' minutes')::interval;

        EXIT WHEN ((v_slot_end AT TIME ZONE 'UTC')::time) > v_end_t;
        EXIT WHEN ((v_slot AT TIME ZONE 'UTC')::date) <> v_day;

        IF v_slot >= v_min_from
           AND NOT EXISTS (
             SELECT 1 FROM public.days_off d
              WHERE d.user_id = v_user AND d.date = v_day AND d.is_non_working = true
           )
           AND NOT EXISTS (
             SELECT 1 FROM public.appointments a
              WHERE a.user_id = v_user
                AND a.status <> 'cancelled'
                AND tstzrange(a.scheduled_at,
                              a.scheduled_at + (a.duration_minutes || ' minutes')::interval, '[)')
                    && tstzrange(v_slot, v_slot_end, '[)')
           )
           AND NOT EXISTS (
             SELECT 1 FROM public.session_booking_requests sbr
              WHERE sbr.user_id = v_user
                AND sbr.status IN ('pending','needs_linking','confirmed')
                AND tstzrange(sbr.requested_slot_at,
                              sbr.requested_slot_at + (sbr.duration_minutes || ' minutes')::interval, '[)')
                    && tstzrange(v_slot, v_slot_end, '[)')
           )
        THEN
          slot_at := v_slot;
          RETURN NEXT;
        END IF;

        v_slot := v_slot + (v_dur || ' minutes')::interval;
      END LOOP;
    END LOOP;

    v_day := v_day + 1;
  END LOOP;
END $function$;


CREATE OR REPLACE FUNCTION public.public_create_booking(
  p_token text, p_slot_at timestamp with time zone,
  p_first_name text, p_last_name text, p_email text, p_phone text,
  p_comment text, p_consent boolean, p_ip_hash text
)
 RETURNS TABLE(request_id uuid, status text, requires_approval boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_link record;
  v_dur int;
  v_recent_count int;
  v_matched_client uuid;
  v_status text;
  v_new_id uuid;
  v_appointment_id uuid;
  v_key text;
  v_dow_pg smallint;
  v_dow_app smallint;
  v_local_date date;
  v_local_start time;
  v_local_end time;
  v_rule record;
  v_fits boolean := false;
BEGIN
  IF NOT COALESCE(p_consent, false) THEN RAISE EXCEPTION 'Consent required'; END IF;
  IF length(trim(coalesce(p_first_name,''))) < 1 OR length(trim(coalesce(p_first_name,''))) > 120 THEN
    RAISE EXCEPTION 'Invalid first_name'; END IF;
  IF length(trim(coalesce(p_email,''))) < 3 OR length(trim(coalesce(p_email,''))) > 254
     OR p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email'; END IF;
  IF p_phone IS NOT NULL AND length(p_phone) > 40 THEN RAISE EXCEPTION 'Invalid phone'; END IF;
  IF p_comment IS NOT NULL AND length(p_comment) > 2000 THEN RAISE EXCEPTION 'Invalid comment'; END IF;

  v_key := lower(trim(coalesce(p_token,'')));
  SELECT bl.id, bl.user_id, bl.is_active, bl.mode
    INTO v_link
    FROM public.booking_links bl
   WHERE bl.token = p_token OR lower(bl.slug) = v_key
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

  SELECT COALESCE(p.default_duration, 60) INTO v_dur
    FROM public.profiles p WHERE p.user_id = v_link.user_id LIMIT 1;
  IF v_dur IS NULL OR v_dur <= 0 THEN v_dur := 60; END IF;

  -- Validate in UTC wall-clock space (same convention as the Calendar).
  v_local_date  := (p_slot_at AT TIME ZONE 'UTC')::date;
  v_local_start := (p_slot_at AT TIME ZONE 'UTC')::time;
  v_local_end   := ((p_slot_at + (v_dur || ' minutes')::interval) AT TIME ZONE 'UTC')::time;
  v_dow_pg := EXTRACT(DOW FROM v_local_date)::smallint;
  v_dow_app := CASE WHEN v_dow_pg = 0 THEN 7 ELSE v_dow_pg END;

  FOR v_rule IN
    SELECT start_time::time AS s, end_time::time AS e
      FROM public.working_schedule
     WHERE user_id = v_link.user_id
       AND day_of_week = v_dow_app
       AND is_working = true
  LOOP
    IF v_local_start >= v_rule.s
       AND v_local_end   <= v_rule.e
       AND v_local_end   > v_local_start
       AND (EXTRACT(EPOCH FROM (v_local_start - v_rule.s))::int % (v_dur * 60)) = 0
    THEN
      v_fits := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_fits THEN
    RAISE EXCEPTION 'Slot is outside working hours';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.days_off d
     WHERE d.user_id = v_link.user_id AND d.date = v_local_date AND d.is_non_working = true
  ) THEN
    RAISE EXCEPTION 'Slot no longer available';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointments a
     WHERE a.user_id = v_link.user_id
       AND a.status <> 'cancelled'
       AND tstzrange(a.scheduled_at, a.scheduled_at + (a.duration_minutes||' minutes')::interval,'[)')
           && tstzrange(p_slot_at, p_slot_at + (v_dur||' minutes')::interval,'[)')
  ) OR EXISTS (
    SELECT 1 FROM public.session_booking_requests sbr
     WHERE sbr.user_id = v_link.user_id
       AND sbr.status IN ('pending','needs_linking','confirmed')
       AND tstzrange(sbr.requested_slot_at, sbr.requested_slot_at + (sbr.duration_minutes||' minutes')::interval,'[)')
           && tstzrange(p_slot_at, p_slot_at + (v_dur||' minutes')::interval,'[)')
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