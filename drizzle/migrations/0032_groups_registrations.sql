
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS group_type text NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS participant_instructions text,
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS price_amount numeric,
  ADD COLUMN IF NOT EXISTS publication_status text NOT NULL DEFAULT 'unpublished',
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS registration_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(18),'hex'),
  ADD COLUMN IF NOT EXISTS copied_from_group_id uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.groups ADD CONSTRAINT groups_type_chk CHECK (group_type IN ('regular','supervision'));
ALTER TABLE public.groups ADD CONSTRAINT groups_pub_chk CHECK (publication_status IN ('published','unpublished'));
ALTER TABLE public.groups ADD CONSTRAINT groups_life_chk CHECK (lifecycle_status IN ('active','archived','deleted'));
ALTER TABLE public.groups ADD CONSTRAINT groups_cap_chk CHECK (capacity IS NULL OR capacity > 0);
CREATE UNIQUE INDEX IF NOT EXISTS groups_registration_token_key ON public.groups(registration_token);
UPDATE public.groups SET lifecycle_status='archived', archived_at=COALESCE(archived_at, updated_at) WHERE status='archived';

ALTER TABLE public.group_attendance ADD COLUMN IF NOT EXISTS supervision_participation text NOT NULL DEFAULT 'not_applicable';
ALTER TABLE public.group_attendance ADD CONSTRAINT ga_sup_chk CHECK (supervision_participation IN ('active_work','observer','not_applicable'));
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS registration_id uuid, ADD COLUMN IF NOT EXISTS left_at timestamptz;

CREATE TABLE public.group_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected','waitlisted','transferred')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decision_at timestamptz,
  transferred_to_group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  transferred_at timestamptz,
  source_registration_id uuid REFERENCES public.group_registrations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.group_registrations(group_id, status);
GRANT SELECT, UPDATE ON public.group_registrations TO authenticated;
GRANT ALL ON public.group_registrations TO service_role;
ALTER TABLE public.group_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads registrations" ON public.group_registrations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owner updates registrations" ON public.group_registrations FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Public: read published group
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
    'price_amount',g.price_amount,'is_full',v_full,'sessions',v_sessions);
END $$;

CREATE OR REPLACE FUNCTION public.public_submit_group_registration(_token text,_name text,_email text,_phone text,_message text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE g public.groups; v_full boolean; v_status text; v_id uuid; v_email text := lower(trim(_email));
BEGIN
  IF length(trim(coalesce(_name,'')))<1 OR length(_name)>200 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email)>255 THEN RAISE EXCEPTION 'INVALID_EMAIL'; END IF;
  IF length(coalesce(_phone,''))>50 OR length(coalesce(_message,''))>2000 THEN RAISE EXCEPTION 'TOO_LONG'; END IF;
  SELECT * INTO g FROM public.groups WHERE registration_token=_token AND publication_status='published' AND lifecycle_status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_AVAILABLE'; END IF;
  IF (SELECT count(*) FROM public.group_registrations WHERE group_id=g.id AND submitted_at>now()-interval '1 hour')>=30 THEN RAISE EXCEPTION 'RATE_LIMIT'; END IF;
  IF EXISTS (SELECT 1 FROM public.group_registrations WHERE group_id=g.id AND lower(email)=v_email AND status IN ('pending','confirmed','waitlisted')) THEN
    RETURN jsonb_build_object('status','duplicate'); END IF;
  v_full := g.capacity IS NOT NULL AND (SELECT count(*) FROM public.group_members m WHERE m.group_id=g.id AND m.left_at IS NULL) >= g.capacity;
  v_status := CASE WHEN v_full THEN 'waitlisted' ELSE 'pending' END;
  INSERT INTO public.group_registrations(user_id,group_id,person_name,email,phone,message,status)
    VALUES (g.user_id,g.id,trim(_name),v_email,nullif(trim(_phone),''),nullif(trim(_message),''),v_status) RETURNING id INTO v_id;
  RETURN jsonb_build_object('status',v_status,'id',v_id);
END $$;
GRANT EXECUTE ON FUNCTION public.public_get_group_registration(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_submit_group_registration(text,text,text,text,text) TO anon, authenticated;

-- Owner: decide registration
CREATE OR REPLACE FUNCTION public.decide_group_registration(_registration_id uuid,_decision text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.group_registrations; g public.groups; v_client uuid; v_count int;
BEGIN
  SELECT * INTO r FROM public.group_registrations WHERE id=_registration_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF r.status IN ('transferred','confirmed') AND _decision<>'reject' THEN RAISE EXCEPTION 'FINAL_STATE'; END IF;
  SELECT * INTO g FROM public.groups WHERE id=r.group_id FOR UPDATE;
  IF _decision='reject' THEN
    IF r.status='confirmed' THEN RAISE EXCEPTION 'FINAL_STATE'; END IF;
    UPDATE public.group_registrations SET status='rejected',decision_at=now(),updated_at=now() WHERE id=r.id;
  ELSIF _decision='waitlist' THEN
    UPDATE public.group_registrations SET status='waitlisted',decision_at=now(),updated_at=now() WHERE id=r.id;
  ELSIF _decision='confirm' THEN
    SELECT count(*) INTO v_count FROM public.group_members WHERE group_id=g.id AND left_at IS NULL;
    IF g.capacity IS NOT NULL AND v_count>=g.capacity THEN RAISE EXCEPTION 'GROUP_FULL'; END IF;
    v_client := r.client_id;
    IF v_client IS NULL THEN
      SELECT id INTO v_client FROM public.clients WHERE user_id=g.user_id AND lower(email)=lower(r.email) ORDER BY created_at LIMIT 1;
    END IF;
    IF v_client IS NULL THEN
      INSERT INTO public.clients(user_id,name,email,phone) VALUES (g.user_id,r.person_name,r.email,r.phone) RETURNING id INTO v_client;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.group_members WHERE group_id=g.id AND client_id=v_client AND left_at IS NULL) THEN
      INSERT INTO public.group_members(user_id,group_id,client_id,registration_id,price_per_session)
        VALUES (g.user_id,g.id,v_client,r.id,g.price_amount);
    END IF;
    UPDATE public.group_registrations SET status='confirmed',client_id=v_client,decision_at=now(),updated_at=now() WHERE id=r.id;
  ELSE RAISE EXCEPTION 'INVALID_DECISION'; END IF;
  RETURN jsonb_build_object('ok',true,'client_id',v_client);
END $$;

-- Owner: transfer waitlisted to target group (existing) or copy
CREATE OR REPLACE FUNCTION public.transfer_group_registrations(_registration_ids uuid[],_target_group_id uuid,_new_group_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.group_registrations; src public.groups; v_target uuid := _target_group_id; v_new uuid;
BEGIN
  IF coalesce(array_length(_registration_ids,1),0)=0 THEN RAISE EXCEPTION 'EMPTY'; END IF;
  SELECT g.* INTO src FROM public.groups g JOIN public.group_registrations gr ON gr.group_id=g.id
    WHERE gr.id=_registration_ids[1] AND g.user_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_target IS NULL THEN
    INSERT INTO public.groups(user_id,name,description,participant_instructions,group_type,capacity,price_amount,bill_present,bill_absent,bill_skipped,copied_from_group_id)
      VALUES (src.user_id,coalesce(nullif(trim(_new_group_name),''),src.name),src.description,src.participant_instructions,src.group_type,src.capacity,src.price_amount,src.bill_present,src.bill_absent,src.bill_skipped,src.id)
      RETURNING id INTO v_target;
  ELSIF NOT EXISTS (SELECT 1 FROM public.groups WHERE id=v_target AND user_id=auth.uid() AND lifecycle_status='active') OR v_target=src.id THEN
    RAISE EXCEPTION 'INVALID_TARGET';
  END IF;
  FOR r IN SELECT * FROM public.group_registrations WHERE id=ANY(_registration_ids) AND user_id=auth.uid() AND group_id=src.id AND status IN ('waitlisted','pending') FOR UPDATE LOOP
    INSERT INTO public.group_registrations(user_id,group_id,person_name,email,phone,message,client_id,status,source_registration_id)
      VALUES (r.user_id,v_target,r.person_name,r.email,r.phone,r.message,r.client_id,'pending',r.id) RETURNING id INTO v_new;
    UPDATE public.group_registrations SET status='transferred',transferred_to_group_id=v_target,transferred_at=now(),updated_at=now() WHERE id=r.id;
  END LOOP;
  RETURN v_target;
END $$;
REVOKE EXECUTE ON FUNCTION public.decide_group_registration(uuid,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.transfer_group_registrations(uuid[],uuid,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.decide_group_registration(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_group_registrations(uuid[],uuid,text) TO authenticated;
