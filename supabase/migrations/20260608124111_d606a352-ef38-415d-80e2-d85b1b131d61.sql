CREATE OR REPLACE FUNCTION public.public_get_booking_page(p_token text)
 RETURNS TABLE(display_name text, session_duration_minutes integer, mode text, is_active boolean, language text, timezone text, show_practice_profile boolean, business_name text, business_address text, practice_email text, avatar_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_link record;
  v_key text;
  v_duration int;
BEGIN
  v_key := lower(trim(coalesce(p_token, '')));
  SELECT bl.user_id, bl.is_active, bl.mode, bl.display_name
    INTO v_link
    FROM public.booking_links bl
   WHERE bl.token = p_token OR lower(bl.slug) = v_key
   LIMIT 1;

  IF v_link.user_id IS NULL THEN RETURN; END IF;

  -- Prefer the Public Booking setting (booking_availability.session_duration_minutes),
  -- fall back to the profile default, then 60 minutes.
  SELECT ba.session_duration_minutes
    INTO v_duration
    FROM public.booking_availability ba
   WHERE ba.user_id = v_link.user_id
     AND ba.session_duration_minutes IS NOT NULL
   ORDER BY ba.sort_order NULLS LAST, ba.weekday
   LIMIT 1;

  RETURN QUERY
    SELECT
      COALESCE(v_link.display_name, p.business_name, p.full_name, 'Therapist'),
      COALESCE(v_duration, p.default_duration, 60),
      v_link.mode,
      v_link.is_active,
      COALESCE(p.language, 'en'),
      COALESCE(NULLIF(p.timezone, ''), 'UTC'),
      COALESCE(p.show_practice_profile_on_booking, true),
      p.business_name,
      p.business_address,
      COALESCE(p.public_email, (SELECT u.email FROM auth.users u WHERE u.id = v_link.user_id)),
      p.avatar_url
    FROM (SELECT v_link.user_id AS uid) link_user
    LEFT JOIN public.profiles p ON p.user_id = link_user.uid;
END $function$;