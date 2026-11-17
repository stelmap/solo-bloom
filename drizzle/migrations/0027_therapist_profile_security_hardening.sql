CREATE OR REPLACE FUNCTION public.tg_therapist_profile_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('app.therapist_slug_write', true) IS DISTINCT FROM 'on' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.slug := NULL;
    ELSIF NEW.slug IS DISTINCT FROM OLD.slug THEN
      NEW.slug := OLD.slug;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'owner_immutable';
  END IF;
  NEW.published_files := coalesce(ARRAY(
    SELECT f FROM unnest(coalesce(NEW.published_files, '{}')) f
    WHERE f LIKE NEW.user_id::text || '/%' AND f NOT LIKE '%..%'
  ), '{}');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_therapist_profile_guard ON public.therapist_public_profiles;
CREATE TRIGGER trg_therapist_profile_guard BEFORE INSERT OR UPDATE ON public.therapist_public_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_therapist_profile_guard();

CREATE OR REPLACE FUNCTION public.ensure_my_therapist_profile_slug(p_base text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_slug text; v_base text; v_try text; n int := 1;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT slug INTO v_slug FROM public.therapist_public_profiles WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile_missing'; END IF;
  IF v_slug IS NOT NULL THEN RETURN v_slug; END IF;
  v_base := left(trim(both '-' from regexp_replace(lower(coalesce(p_base, '')), '[^a-z0-9]+', '-', 'g')), 50);
  IF length(v_base) < 3 THEN v_base := 'therapist'; END IF;
  PERFORM set_config('app.therapist_slug_write', 'on', true);
  LOOP
    v_try := CASE WHEN n = 1 THEN v_base ELSE v_base || '-' || n END;
    BEGIN
      UPDATE public.therapist_public_profiles SET slug = v_try WHERE user_id = v_uid;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      n := n + 1;
      IF n > 10000 THEN RAISE EXCEPTION 'slug_exhausted'; END IF;
    END;
  END LOOP;
  PERFORM set_config('app.therapist_slug_write', 'off', true);
  RETURN v_try;
END $$;

CREATE OR REPLACE FUNCTION public.is_published_therapist_file(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.therapist_public_profiles tp
    JOIN public.booking_links bl ON bl.user_id = tp.user_id AND bl.is_active
    WHERE tp.is_published AND p_name = ANY(tp.published_files)
      AND split_part(p_name, '/', 1) = tp.user_id::text
      AND public.therapist_profile_allowed(tp.user_id)
  )
$$;