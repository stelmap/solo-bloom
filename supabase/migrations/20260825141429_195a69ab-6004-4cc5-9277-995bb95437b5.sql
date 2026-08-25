CREATE OR REPLACE FUNCTION public.public_get_available_slots_base(p_token text, p_from_date date, p_to_date date)
 RETURNS TABLE(slot_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_active boolean;
  v_dur int;
  v_buffer int;
  v_stride int;
  v_min_notice int;
  v_max_horizon int;
  v_tz text;
  v_local_now timestamp;
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
  v_has_ba boolean;
BEGIN
  v_key := lower(trim(coalesce(p_token, '')));
  SELECT bl.user_id, bl.is_active INTO v_user, v_active
    FROM public.booking_links bl
   WHERE bl.token = p_token OR lower(bl.slug) = v_key
   LIMIT 1;

  IF v_user IS NULL OR v_active IS NOT TRUE THEN RETURN; END IF;

  SELECT COALESCE(ba.session_duration_minutes, p.default_duration, 60),
         COALESCE(ba.buffer_minutes, 0),
         COALESCE(ba.min_notice_hours, 24),
         COALESCE(ba.max_horizon_days, 30),
         COALESCE(NULLIF(p.timezone, ''), 'UTC')
    INTO v_dur, v_buffer, v_min_notice, v_max_horizon, v_tz
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT session_duration_minutes, buffer_minutes, min_notice_hours, max_horizon_days
        FROM public.booking_availability
       WHERE user_id = v_user
       LIMIT 1
    ) ba ON true
   WHERE p.user_id = v_user
   LIMIT 1;

  IF v_dur IS NULL OR v_dur <= 0 THEN v_dur := 60; END IF;
  IF v_buffer IS NULL OR v_buffer < 0 THEN v_buffer := 0; END IF;
  v_stride := v_dur + v_buffer;
  IF v_stride <= 0 THEN v_stride := v_dur; END IF;

  -- Practice Profile availability is the source of truth. The legacy weekly
  -- working schedule is only used when no availability has been configured.
  SELECT EXISTS (
    SELECT 1 FROM public.booking_availability
     WHERE user_id = v_user AND is_enabled = true
  ) INTO v_has_ba;

  -- Slots are emitted as local wall-clock times labelled as UTC, so the
  -- notice / horizon / day boundaries must also be computed from the
  -- practitioner's LOCAL current time (no double timezone conversion).
  BEGIN
    v_local_now := (now() AT TIME ZONE v_tz);
  EXCEPTION WHEN others THEN
    v_local_now := (now() AT TIME ZONE 'UTC');
  END;

  v_min_from := (v_local_now + (v_min_notice || ' hours')::interval) AT TIME ZONE 'UTC';
  v_max_to := LEAST(p_to_date, (v_local_now + (v_max_horizon || ' days')::interval)::date);

  v_day := GREATEST(p_from_date, v_local_now::date);
  WHILE v_day <= v_max_to LOOP
    v_dow_pg := EXTRACT(DOW FROM v_day)::smallint;
    v_dow_app := CASE WHEN v_dow_pg = 0 THEN 7 ELSE v_dow_pg END;

    FOR v_rule IN
      SELECT ba.start_time::text AS start_time, ba.end_time::text AS end_time
        FROM public.booking_availability ba
       WHERE v_has_ba
         AND ba.user_id = v_user
         AND ba.is_enabled = true
         AND (CASE WHEN ba.weekday = 0 THEN 7 ELSE ba.weekday END) = v_dow_app
      UNION ALL
      SELECT ws.start_time::text AS start_time, ws.end_time::text AS end_time
        FROM public.working_schedule ws
       WHERE NOT v_has_ba
         AND ws.user_id = v_user
         AND ws.day_of_week = v_dow_app
         AND ws.is_working = true
    LOOP
      BEGIN
        v_start_t := v_rule.start_time::time;
        v_end_t   := v_rule.end_time::time;
      EXCEPTION WHEN others THEN
        CONTINUE;
      END;

      IF v_end_t <= v_start_t THEN CONTINUE; END IF;

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
             SELECT 1 FROM public.days_off bt
              WHERE bt.user_id = v_user
                AND bt.date = v_day
                AND bt.type = 'blocked_time'
                AND bt.custom_start_time IS NOT NULL
                AND bt.custom_end_time IS NOT NULL
                AND tstzrange(
                      ((bt.date::text || ' ' || to_char(bt.custom_start_time::time, 'HH24:MI:SS'))::timestamp) AT TIME ZONE 'UTC',
                      ((bt.date::text || ' ' || to_char(bt.custom_end_time::time, 'HH24:MI:SS'))::timestamp) AT TIME ZONE 'UTC',
                      '[)'
                    ) && tstzrange(v_slot, v_slot_end, '[)')
           )
           AND NOT EXISTS (
             SELECT 1 FROM public.appointments a
              WHERE a.user_id = v_user
                AND COALESCE(a.status, '') NOT IN ('cancelled', 'no-show', 'no_show', 'declined', 'deleted')
                AND a.duration_minutes IS NOT NULL
                AND tstzrange(a.scheduled_at,
                              a.scheduled_at + (a.duration_minutes || ' minutes')::interval, '[)')
                    && tstzrange(v_slot, v_slot_end, '[)')
           )
           AND NOT EXISTS (
             SELECT 1 FROM public.session_booking_requests sbr
              WHERE sbr.user_id = v_user
                AND sbr.status IN ('pending','needs_linking','confirmed')
                AND tstzrange(sbr.requested_slot_at,
                              sbr.requested_slot_at + (COALESCE(sbr.duration_minutes, v_dur) || ' minutes')::interval, '[)')
                    && tstzrange(v_slot, v_slot_end, '[)')
           )
        THEN
          slot_at := v_slot;
          RETURN NEXT;
        END IF;

        v_slot := v_slot + (v_stride || ' minutes')::interval;
      END LOOP;
    END LOOP;

    v_day := v_day + 1;
  END LOOP;
END;
$function$;