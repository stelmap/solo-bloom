DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='public_get_available_slots_base'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.public_get_available_slots(text,date,date) RENAME TO public_get_available_slots_base';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='public_create_booking_base'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.public_create_booking(text,timestamptz,text,text,text,text,text,boolean,text) RENAME TO public_create_booking_base';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.public_get_available_slots_base(text,date,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.public_create_booking_base(text,timestamptz,text,text,text,text,text,boolean,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_get_available_slots(p_token text, p_from_date date, p_to_date date)
RETURNS TABLE(slot_at timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_dur int;
  v_key text;
BEGIN
  v_key := lower(trim(coalesce(p_token,'')));
  SELECT bl.user_id INTO v_user
    FROM public.booking_links bl
   WHERE (bl.token = p_token OR lower(bl.slug) = v_key) AND bl.is_active = true
   LIMIT 1;

  IF v_user IS NULL THEN RETURN; END IF;

  SELECT COALESCE(ba.session_duration_minutes, p.default_duration, 60) INTO v_dur
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT session_duration_minutes FROM public.booking_availability
       WHERE user_id = v_user LIMIT 1
    ) ba ON true
   WHERE p.user_id = v_user
   LIMIT 1;
  IF v_dur IS NULL OR v_dur <= 0 THEN v_dur := 60; END IF;

  RETURN QUERY
  SELECT s.slot_at
    FROM public.public_get_available_slots_base(p_token, p_from_date, p_to_date) s
   WHERE NOT EXISTS (
     SELECT 1 FROM public.days_off bt
      WHERE bt.user_id = v_user
        AND bt.type = 'blocked_time'
        AND bt.date = (s.slot_at AT TIME ZONE 'UTC')::date
        AND bt.custom_start_time IS NOT NULL AND bt.custom_end_time IS NOT NULL
        AND tstzrange(
              ((bt.date::text || ' ' || to_char(bt.custom_start_time::time,'HH24:MI:SS'))::timestamp) AT TIME ZONE 'UTC',
              ((bt.date::text || ' ' || to_char(bt.custom_end_time::time,'HH24:MI:SS'))::timestamp) AT TIME ZONE 'UTC', '[)')
            && tstzrange(s.slot_at, s.slot_at + (v_dur || ' minutes')::interval, '[)')
   );
END $function$;

CREATE OR REPLACE FUNCTION public.public_create_booking(p_token text, p_slot_at timestamp with time zone, p_first_name text, p_last_name text, p_email text, p_phone text, p_comment text, p_consent boolean, p_ip_hash text)
RETURNS TABLE(request_id uuid, status text, requires_approval boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_dur int;
  v_key text;
BEGIN
  v_key := lower(trim(coalesce(p_token,'')));
  SELECT bl.user_id INTO v_user
    FROM public.booking_links bl
   WHERE (bl.token = p_token OR lower(bl.slug) = v_key) AND bl.is_active = true
   LIMIT 1;

  IF v_user IS NOT NULL THEN
    SELECT COALESCE(ba.session_duration_minutes, p.default_duration, 60) INTO v_dur
      FROM public.profiles p
      LEFT JOIN LATERAL (
        SELECT session_duration_minutes FROM public.booking_availability
         WHERE user_id = v_user LIMIT 1
      ) ba ON true
     WHERE p.user_id = v_user
     LIMIT 1;
    IF v_dur IS NULL OR v_dur <= 0 THEN v_dur := 60; END IF;

    IF EXISTS (
      SELECT 1 FROM public.days_off bt
       WHERE bt.user_id = v_user
         AND bt.type = 'blocked_time'
         AND bt.date = (p_slot_at AT TIME ZONE 'UTC')::date
         AND bt.custom_start_time IS NOT NULL AND bt.custom_end_time IS NOT NULL
         AND tstzrange(
               ((bt.date::text || ' ' || to_char(bt.custom_start_time::time,'HH24:MI:SS'))::timestamp) AT TIME ZONE 'UTC',
               ((bt.date::text || ' ' || to_char(bt.custom_end_time::time,'HH24:MI:SS'))::timestamp) AT TIME ZONE 'UTC', '[)')
             && tstzrange(p_slot_at, p_slot_at + (v_dur || ' minutes')::interval, '[)')
    ) THEN
      RAISE EXCEPTION 'Slot no longer available';
    END IF;
  END IF;

  RETURN QUERY
  SELECT b.request_id, b.status, b.requires_approval
    FROM public.public_create_booking_base(
      p_token, p_slot_at, p_first_name, p_last_name, p_email, p_phone, p_comment, p_consent, p_ip_hash
    ) b;
END $function$;

GRANT EXECUTE ON FUNCTION public.public_get_available_slots(text,date,date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_create_booking(text,timestamptz,text,text,text,text,text,boolean,text) TO anon, authenticated;