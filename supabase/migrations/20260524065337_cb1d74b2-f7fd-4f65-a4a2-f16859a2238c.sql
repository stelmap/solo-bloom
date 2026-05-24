ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text;

DROP FUNCTION IF EXISTS public.public_get_booking_page(text);

CREATE OR REPLACE FUNCTION public.public_get_booking_page(p_token text)
RETURNS TABLE (
  display_name text,
  session_duration_minutes int,
  mode text,
  is_active boolean,
  language text,
  timezone text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link record;
BEGIN
  SELECT bl.user_id, bl.is_active, bl.mode, bl.display_name
    INTO v_link
    FROM public.booking_links bl
   WHERE bl.token = p_token
   LIMIT 1;

  IF v_link.user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      COALESCE(v_link.display_name, p.business_name, p.full_name, 'Therapist'),
      COALESCE((SELECT ba.session_duration_minutes FROM public.booking_availability ba WHERE ba.user_id = v_link.user_id LIMIT 1), 60),
      v_link.mode,
      v_link.is_active,
      COALESCE(p.language, 'en'),
      COALESCE(p.timezone, 'UTC')
    FROM public.profiles p
    WHERE p.user_id = v_link.user_id;
END $$;

GRANT EXECUTE ON FUNCTION public.public_get_booking_page(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_get_available_slots(
  p_token text,
  p_from_date date,
  p_to_date date
)
RETURNS TABLE (slot_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  SELECT bl.user_id, bl.is_active INTO v_user, v_active
  FROM public.booking_links bl WHERE bl.token = p_token LIMIT 1;

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
      -- Build slot anchored to the therapist's timezone
      v_slot := ((v_day::text || ' ' || v_rule.start_time::text)::timestamp) AT TIME ZONE v_tz;
      LOOP
        v_slot_end := v_slot + (v_rule.session_duration_minutes || ' minutes')::interval;
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
                AND sbr.status IN ('pending','confirmed')
                AND sbr.requested_slot_at = v_slot
           )
        THEN
          slot_at := v_slot;
          RETURN NEXT;
        END IF;

        v_slot := v_slot_end + (v_rule.buffer_minutes || ' minutes')::interval;
      END LOOP;
    END LOOP;

    v_day := v_day + 1;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.public_get_available_slots(text, date, date) TO anon, authenticated;