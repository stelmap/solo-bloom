ALTER TABLE public.license_requests
  ADD COLUMN admin_note text CHECK (admin_note IS NULL OR char_length(admin_note) <= 2000),
  ADD COLUMN granted_plan text CHECK (granted_plan IS NULL OR granted_plan IN ('solo','pro')),
  ADD COLUMN granted_until timestamptz,
  ADD COLUMN reviewed_by uuid,
  ADD COLUMN reviewed_at timestamptz;

CREATE OR REPLACE FUNCTION public.admin_review_license_request(
  p_id uuid, p_action text, p_expected_status text,
  p_plan text DEFAULT NULL, p_until timestamptz DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS public.license_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.license_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not_admin'; END IF;
  SELECT * INTO r FROM public.license_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF r.status <> p_expected_status THEN RAISE EXCEPTION 'status_changed'; END IF;
  IF r.status IN ('approved','declined') THEN RAISE EXCEPTION 'final_state'; END IF;
  IF p_action = 'approve' THEN
    IF p_plan NOT IN ('solo','pro') THEN RAISE EXCEPTION 'invalid_plan'; END IF;
    IF p_until IS NULL OR p_until <= now() THEN RAISE EXCEPTION 'invalid_until'; END IF;
    INSERT INTO public.legacy_plan_grants (user_id, plan_code, legacy_customer, expires_at, reason)
    VALUES (r.user_id, p_plan, true, p_until, 'License request ' || r.id)
    ON CONFLICT (user_id) DO UPDATE SET plan_code = EXCLUDED.plan_code, expires_at = EXCLUDED.expires_at,
      reason = EXCLUDED.reason, granted_at = now();
    UPDATE public.license_requests SET status='approved', granted_plan=p_plan, granted_until=p_until,
      admin_note=p_note, reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now() WHERE id=p_id RETURNING * INTO r;
  ELSIF p_action IN ('decline','reviewed') THEN
    UPDATE public.license_requests SET status = CASE WHEN p_action='decline' THEN 'declined' ELSE 'reviewed' END,
      admin_note=p_note, reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now() WHERE id=p_id RETURNING * INTO r;
  ELSE RAISE EXCEPTION 'invalid_action'; END IF;
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_review_license_request(uuid,text,text,text,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_license_request(uuid,text,text,text,timestamptz,text) TO authenticated;