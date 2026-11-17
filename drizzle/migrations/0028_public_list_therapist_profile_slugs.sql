CREATE OR REPLACE FUNCTION public.public_list_therapist_profile_slugs()
RETURNS TABLE(slug text, published_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tp.slug, tp.published_at
  FROM public.therapist_public_profiles tp
  WHERE tp.slug IS NOT NULL AND tp.is_published AND tp.published IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.booking_links bl WHERE bl.user_id = tp.user_id AND bl.is_active)
    AND public.therapist_profile_allowed(tp.user_id)
  ORDER BY tp.slug
$$;
REVOKE ALL ON FUNCTION public.public_list_therapist_profile_slugs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_list_therapist_profile_slugs() TO anon, authenticated;