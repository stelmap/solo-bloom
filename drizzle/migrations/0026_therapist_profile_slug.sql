ALTER TABLE public.therapist_public_profiles ADD COLUMN slug text;
CREATE UNIQUE INDEX therapist_public_profiles_slug_key ON public.therapist_public_profiles (lower(slug));

CREATE OR REPLACE FUNCTION public.ensure_my_therapist_profile_slug(p_base text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_slug text; v_base text; v_try text; n int := 1;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT slug INTO v_slug FROM public.therapist_public_profiles WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile_missing'; END IF;
  IF v_slug IS NOT NULL THEN RETURN v_slug; END IF;
  v_base := trim(both '-' from regexp_replace(lower(coalesce(p_base, '')), '[^a-z0-9]+', '-', 'g'));
  v_base := left(v_base, 50);
  IF length(v_base) < 3 THEN v_base := 'therapist'; END IF;
  v_try := v_base;
  WHILE EXISTS (SELECT 1 FROM public.therapist_public_profiles WHERE lower(slug) = v_try) LOOP
    n := n + 1; v_try := v_base || '-' || n;
  END LOOP;
  UPDATE public.therapist_public_profiles SET slug = v_try WHERE user_id = v_uid;
  RETURN v_try;
END $$;
REVOKE ALL ON FUNCTION public.ensure_my_therapist_profile_slug(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_therapist_profile_slug(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.public_get_therapist_profile_by_slug(p_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('profile', tp.published, 'booking_key', coalesce(bl.slug, bl.token),
                            'language', coalesce(p.language, 'en'))
  FROM public.therapist_public_profiles tp
  JOIN public.booking_links bl ON bl.user_id = tp.user_id AND bl.is_active
  LEFT JOIN public.profiles p ON p.user_id = tp.user_id
  WHERE lower(tp.slug) = lower(trim(coalesce(p_slug, '')))
    AND tp.is_published AND tp.published IS NOT NULL
    AND public.therapist_profile_allowed(tp.user_id)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.public_get_therapist_profile_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_get_therapist_profile_by_slug(text) TO anon, authenticated;