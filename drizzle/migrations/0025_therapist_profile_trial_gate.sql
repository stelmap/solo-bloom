CREATE OR REPLACE FUNCTION public.therapist_profile_allowed(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT now() < timestamptz '2027-05-18 00:00:00+00'
      OR coalesce((public.practice_access_state(p_user_id)->>'has_pro')::boolean, false)
$$;
REVOKE ALL ON FUNCTION public.therapist_profile_allowed(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_get_therapist_profile(p_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tp.published
  FROM public.booking_links bl
  JOIN public.therapist_public_profiles tp ON tp.user_id = bl.user_id
  WHERE (bl.token = p_token OR lower(bl.slug) = lower(trim(coalesce(p_token,''))))
    AND bl.is_active AND tp.is_published AND tp.published IS NOT NULL
    AND public.therapist_profile_allowed(tp.user_id)
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_published_therapist_file(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.therapist_public_profiles tp
    JOIN public.booking_links bl ON bl.user_id = tp.user_id AND bl.is_active
    WHERE tp.is_published AND p_name = ANY(tp.published_files)
      AND public.therapist_profile_allowed(tp.user_id)
  )
$$;