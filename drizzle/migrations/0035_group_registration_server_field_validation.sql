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
    v_type := COALESCE(f->>'type','short');
    IF v_type NOT IN ('short','long','email','phone','url','dropdown','checkbox') THEN RAISE EXCEPTION 'INVALID_ANSWERS'; END IF;
    v_val := nullif(trim(COALESCE(_answers->>(f->>'id'),'')),'');
    IF v_val IS NOT NULL AND length(v_val)>2000 THEN RAISE EXCEPTION 'TOO_LONG'; END IF;
    IF v_type='checkbox' AND v_val IS NOT NULL AND v_val NOT IN ('true','false') THEN RAISE EXCEPTION 'INVALID_ANSWERS'; END IF;
    IF v_type='checkbox' AND v_val='false' THEN v_val := NULL; END IF;
    IF COALESCE((f->>'required')::boolean,false) AND v_val IS NULL THEN RAISE EXCEPTION 'REQUIRED_MISSING:%', f->>'id'; END IF;
    IF v_type='dropdown' AND v_val IS NOT NULL AND NOT (COALESCE(f->'options','[]'::jsonb) ? v_val) THEN RAISE EXCEPTION 'INVALID_OPTION:%', f->>'id'; END IF;
    IF v_type='email' AND v_val IS NOT NULL AND (v_val !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_val)>255) THEN RAISE EXCEPTION 'INVALID_FORMAT:%', f->>'id'; END IF;
    IF v_type='phone' AND v_val IS NOT NULL AND (v_val !~ '^\+?[0-9 ()./-]{5,30}$' OR length(regexp_replace(v_val,'\D','','g')) NOT BETWEEN 5 AND 17) THEN RAISE EXCEPTION 'INVALID_FORMAT:%', f->>'id'; END IF;
    IF v_type='url' AND v_val IS NOT NULL AND (v_val !~* '^https?://[^\s/?#]+\.[^\s/?#]+(/\S*)?$' OR length(v_val)>500) THEN RAISE EXCEPTION 'INVALID_FORMAT:%', f->>'id'; END IF;
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