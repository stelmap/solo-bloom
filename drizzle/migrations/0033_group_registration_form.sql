ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS registration_form jsonb,
  ADD COLUMN IF NOT EXISTS registration_image_path text;
ALTER TABLE public.group_registrations
  ADD COLUMN IF NOT EXISTS answers jsonb;

CREATE OR REPLACE FUNCTION public.public_get_group_registration(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE g public.groups; v_sessions jsonb; v_full boolean;
BEGIN
  SELECT * INTO g FROM public.groups WHERE registration_token=_token AND publication_status='published' AND lifecycle_status='active';
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('starts_at',a.scheduled_at,'duration',a.duration_minutes) ORDER BY a.scheduled_at),'[]'::jsonb)
    INTO v_sessions FROM (SELECT a.* FROM public.group_sessions gs JOIN public.appointments a ON a.id=gs.appointment_id
      WHERE gs.group_id=g.id AND a.scheduled_at>=now() AND a.status IN ('scheduled','confirmed') ORDER BY a.scheduled_at LIMIT 12) a;
  v_full := g.capacity IS NOT NULL AND (SELECT count(*) FROM public.group_members m WHERE m.group_id=g.id AND m.left_at IS NULL) >= g.capacity;
  RETURN jsonb_build_object('name',g.name,'description',g.description,'group_type',g.group_type,
    'price_amount',g.price_amount,'is_full',v_full,'sessions',v_sessions,
    'form',g.registration_form,'image_path',g.registration_image_path);
END $$;

CREATE OR REPLACE FUNCTION public.public_submit_group_registration_v2(_token text,_name text,_email text,_answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g public.groups; v_full boolean; v_status text; v_id uuid; v_email text := lower(trim(_email));
  f jsonb; v_val text; v_snap jsonb := '[]'::jsonb; v_type text;
BEGIN
  IF length(trim(coalesce(_name,'')))<1 OR length(_name)>200 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email)>255 THEN RAISE EXCEPTION 'INVALID_EMAIL'; END IF;
  IF _answers IS NOT NULL AND jsonb_typeof(_answers)<>'object' THEN RAISE EXCEPTION 'INVALID_ANSWERS'; END IF;
  SELECT * INTO g FROM public.groups WHERE registration_token=_token AND publication_status='published' AND lifecycle_status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_AVAILABLE'; END IF;
  FOR f IN SELECT * FROM jsonb_array_elements(COALESCE(g.registration_form->'fields','[]'::jsonb)) LOOP
    IF f->>'id' IN ('name','email') THEN CONTINUE; END IF;
    v_type := f->>'type';
    v_val := nullif(trim(COALESCE(_answers->>(f->>'id'),'')),'');
    IF v_val IS NOT NULL AND length(v_val)>2000 THEN RAISE EXCEPTION 'TOO_LONG'; END IF;
    IF v_type='checkbox' AND v_val IS NOT NULL AND v_val NOT IN ('true','false') THEN RAISE EXCEPTION 'INVALID_ANSWERS'; END IF;
    IF v_type='checkbox' AND v_val='false' THEN v_val := NULL; END IF;
    IF COALESCE((f->>'required')::boolean,false) AND v_val IS NULL THEN RAISE EXCEPTION 'REQUIRED_MISSING'; END IF;
    IF v_type='dropdown' AND v_val IS NOT NULL AND NOT (COALESCE(f->'options','[]'::jsonb) ? v_val) THEN RAISE EXCEPTION 'INVALID_OPTION'; END IF;
    v_snap := v_snap || jsonb_build_array(jsonb_build_object('id',f->>'id','label',f->>'label','type',v_type,'value',v_val));
  END LOOP;
  IF (SELECT count(*) FROM public.group_registrations WHERE group_id=g.id AND submitted_at>now()-interval '1 hour')>=30 THEN RAISE EXCEPTION 'RATE_LIMIT'; END IF;
  IF EXISTS (SELECT 1 FROM public.group_registrations WHERE group_id=g.id AND lower(email)=v_email AND status IN ('pending','confirmed','waitlisted')) THEN
    RETURN jsonb_build_object('status','duplicate'); END IF;
  v_full := g.capacity IS NOT NULL AND (SELECT count(*) FROM public.group_members m WHERE m.group_id=g.id AND m.left_at IS NULL) >= g.capacity;
  v_status := CASE WHEN v_full THEN 'waitlisted' ELSE 'pending' END;
  INSERT INTO public.group_registrations(user_id,group_id,person_name,email,status,answers)
    VALUES (g.user_id,g.id,trim(_name),v_email,v_status,v_snap) RETURNING id INTO v_id;
  RETURN jsonb_build_object('status',v_status,'id',v_id);
END $$;
GRANT EXECUTE ON FUNCTION public.public_submit_group_registration_v2(text,text,text,jsonb) TO anon, authenticated;

CREATE POLICY "Owner manages group form images" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='group-form-images' AND (storage.foldername(name))[1]=auth.uid()::text)
  WITH CHECK (bucket_id='group-form-images' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "Public reads published group form images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id='group-form-images' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.registration_image_path=storage.objects.name AND g.publication_status='published' AND g.lifecycle_status='active'));