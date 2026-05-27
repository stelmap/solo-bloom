
-- 1) Profile columns (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS show_practice_profile_on_booking boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_email text;

-- 2) Storage bucket for practice avatars (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('practice-avatars', 'practice-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3) Storage policies (drop+recreate for idempotency)
DROP POLICY IF EXISTS "Practice avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own practice avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own practice avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own practice avatar" ON storage.objects;

CREATE POLICY "Practice avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'practice-avatars');

CREATE POLICY "Users upload own practice avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'practice-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own practice avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'practice-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own practice avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'practice-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4) Make booking-page RPC resilient when no profile row exists
DROP FUNCTION IF EXISTS public.public_get_booking_page(text);

CREATE OR REPLACE FUNCTION public.public_get_booking_page(p_token text)
  RETURNS TABLE(
    display_name text,
    session_duration_minutes integer,
    mode text,
    is_active boolean,
    language text,
    timezone text,
    show_practice_profile boolean,
    business_name text,
    business_address text,
    practice_email text,
    avatar_url text
  )
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_link record;
  v_key text;
BEGIN
  v_key := lower(trim(coalesce(p_token, '')));
  SELECT bl.user_id, bl.is_active, bl.mode, bl.display_name
    INTO v_link
    FROM public.booking_links bl
   WHERE bl.token = p_token OR lower(bl.slug) = v_key
   LIMIT 1;

  IF v_link.user_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
    SELECT
      COALESCE(v_link.display_name, p.business_name, p.full_name, 'Therapist'),
      COALESCE((SELECT ba.session_duration_minutes FROM public.booking_availability ba WHERE ba.user_id = v_link.user_id LIMIT 1), 60),
      v_link.mode,
      v_link.is_active,
      COALESCE(p.language, 'en'),
      COALESCE(p.timezone, 'UTC'),
      COALESCE(p.show_practice_profile_on_booking, true),
      p.business_name,
      p.business_address,
      COALESCE(p.public_email, (SELECT u.email FROM auth.users u WHERE u.id = v_link.user_id)),
      p.avatar_url
    FROM (SELECT v_link.user_id AS uid) link_user
    LEFT JOIN public.profiles p ON p.user_id = link_user.uid;
END $function$;
