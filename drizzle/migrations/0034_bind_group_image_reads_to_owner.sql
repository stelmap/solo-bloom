CREATE OR REPLACE FUNCTION public.is_published_group_image(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.groups g
    WHERE g.registration_image_path = p_name
      AND split_part(p_name, '/', 1) = g.user_id::text
      AND g.publication_status = 'published' AND g.lifecycle_status = 'active');
$$;
GRANT EXECUTE ON FUNCTION public.is_published_group_image(text) TO anon, authenticated;
DROP POLICY IF EXISTS "Public reads published group form images" ON storage.objects;
CREATE POLICY "Public reads published group form images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'group-form-images' AND public.is_published_group_image(name));