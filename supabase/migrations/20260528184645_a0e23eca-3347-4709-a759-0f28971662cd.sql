CREATE OR REPLACE FUNCTION public.public_get_available_slots(p_token text, p_from_date date, p_to_date date)
 RETURNS TABLE(slot_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_active boolean;
  v_tz text;
  v_rule record;
  v_day date;
  v_dow smallint;
  v_dur int;
  v_buffer int;
  v_min_notice int;
  v_max_horizon int;
  v_slot timestamptz;
  v_slot_end timestamptz;
  v_min_from timestamptz;
  v_max_to date;
  v_key text;
BEGIN
  v_key := lower(trim(coalesce(p_token,'')));
  SELECT bl.user_id, bl.is_active INTO v_user, v_active
  FROM public.booking_links bl WHERE bl.token = p_token OR lower(bl.slug) = v_key LIMIT 1;

  IF v_user IS NULL OR v_active IS NOT TRUE THEN RETURN; END IF;

  SELECT COALESCE(p.timezone, 'UTC') INTO v_tz
    FROM public.profiles p WHERE p.user_id = v_user LIMIT 1;
  IF v_tz IS NULL THEN v_tz := 'UTC'; END IF;

  SELECT session_duration_minutes, buffer_minutes, min_notice_hours, max_horizon_days
    INTO v_dur, v_buffer, v_min_notice, v_max_horizon
    FROM public.booking_availability WHERE user_id = v_user LIMIT 1;
  IF v_dur IS NULL THEN
    v_dur := 60; v_buffer := 10; v_min_notice := 24; v_max_horizon := 30;
  END IF;

  v_min_from := now() + (v_min_notice || ' hours')::interval;
  v_max_to := LEAST(p_to_date, (now() + (v_max_horizon || ' days')::interval)::date);

  v_day := GREATEST(p_from_date, current_date);
  WHILE v_day <= v_max_to LOOP
    v_dow := EXTRACT(DOW FROM v_day)::smallint;

    FOR v_rule IN
      SELECT start_time, end_time, session_duration_minutes, buffer_minutes
        FROM public.booking_availability
       WHERE user_id = v_user AND weekday = v_dow AND is_enabled = true
    LOOP
      -- Anchor slots to a clean grid starting at start_time, stepping by session_duration_minutes.
      -- The buffer is used ONLY for overlap detection, never to advance the slot grid.
      v_slot := ((v_day::text || ' ' || v_rule.start_time::text)::timestamp) AT TIME ZONE v_tz;
      LOOP
        v_slot_end := v_slot + (v_rule.session_duration_minutes || ' minutes')::interval;
        -- Full session must fit within working window
        EXIT WHEN ((v_slot_end AT TIME ZONE v_tz)::time) > v_rule.end_time;

        IF v_slot >= v_min_from
           AND NOT EXISTS (
             SELECT 1 FROM public.appointments a
              WHERE a.user_id = v_user
                AND a.status NOT IN ('cancelled','no-show')
                AND tstzrange(a.scheduled_at, a.scheduled_at + (a.duration_minutes || ' minutes')::interval, '[)')
                    && tstzrange(v_slot - (v_rule.buffer_minutes || ' minutes')::interval,
                                 v_slot_end + (v_rule.buffer_minutes || ' minutes')::interval, '[)')
           )
           AND NOT EXISTS (
             SELECT 1 FROM public.days_off d
              WHERE d.user_id = v_user AND d.date = v_day AND d.is_non_working = true
           )
           AND NOT EXISTS (
             SELECT 1 FROM public.session_booking_requests sbr
              WHERE sbr.user_id = v_user
                AND sbr.status IN ('pending','needs_linking','confirmed')
                AND tstzrange(sbr.requested_slot_at,
                              sbr.requested_slot_at + (sbr.duration_minutes || ' minutes')::interval, '[)')
                    && tstzrange(v_slot - (v_rule.buffer_minutes || ' minutes')::interval,
                                 v_slot_end + (v_rule.buffer_minutes || ' minutes')::interval, '[)')
           )
        THEN
          slot_at := v_slot;
          RETURN NEXT;
        END IF;

        -- Advance by session duration only (clean hourly grid for 60-min sessions)
        v_slot := v_slot + (v_rule.session_duration_minutes || ' minutes')::interval;
      END LOOP;
    END LOOP;

    v_day := v_day + 1;
  END LOOP;
END $function$;