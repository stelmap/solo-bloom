CREATE TABLE public.therapist_public_profiles (
  user_id uuid PRIMARY KEY,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  published jsonb,
  published_files text[] NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.therapist_public_profiles TO authenticated;
GRANT ALL ON public.therapist_public_profiles TO service_role;
ALTER TABLE public.therapist_public_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own therapist profile" ON public.therapist_public_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_therapist_public_profiles_updated BEFORE UPDATE ON public.therapist_public_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.public_get_therapist_profile(p_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tp.published
  FROM public.booking_links bl
  JOIN public.therapist_public_profiles tp ON tp.user_id = bl.user_id
  WHERE (bl.token = p_token OR lower(bl.slug) = lower(trim(coalesce(p_token,''))))
    AND bl.is_active AND tp.is_published AND tp.published IS NOT NULL
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.public_get_therapist_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_get_therapist_profile(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_published_therapist_file(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.therapist_public_profiles tp
    JOIN public.booking_links bl ON bl.user_id = tp.user_id AND bl.is_active
    WHERE tp.is_published AND p_name = ANY(tp.published_files)
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_published_therapist_file(text) TO anon, authenticated;

CREATE POLICY "Therapist files owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'therapist-profile-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Therapist files owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'therapist-profile-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Therapist files owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'therapist-profile-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Therapist files owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'therapist-profile-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Therapist files published read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'therapist-profile-files' AND public.is_published_therapist_file(name));