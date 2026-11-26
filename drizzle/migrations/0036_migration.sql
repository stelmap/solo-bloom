CREATE OR REPLACE FUNCTION public.decide_group_registration(_registration_id uuid, _decision text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.group_registrations; g public.groups; v_client uuid; v_count int; v_reactivated boolean := false;
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
    ELSE
      UPDATE public.clients SET status='active' WHERE id=v_client AND user_id=g.user_id AND status='archived';
      v_reactivated := FOUND;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.group_members WHERE group_id=g.id AND client_id=v_client AND left_at IS NULL) THEN
      INSERT INTO public.group_members(user_id,group_id,client_id,registration_id,price_per_session)
        VALUES (g.user_id,g.id,v_client,r.id,g.price_amount);
    END IF;
    UPDATE public.group_registrations SET status='confirmed',client_id=v_client,decision_at=now(),updated_at=now() WHERE id=r.id;
  ELSE RAISE EXCEPTION 'INVALID_DECISION'; END IF;
  RETURN jsonb_build_object('ok',true,'client_id',v_client,'reactivated',v_reactivated);
END $function$;