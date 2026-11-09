ALTER TABLE public.referral_payouts ADD COLUMN admin_note text;
CREATE OR REPLACE FUNCTION public.admin_list_referral_payouts(p_offset integer DEFAULT 0, p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF p_offset IS NULL OR p_offset < 0 OR p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'invalid_pagination'; END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.requested_at DESC, x.id DESC),'[]'::jsonb) INTO v_rows FROM (
 SELECT r.*, p.full_name, u.email::text AS email FROM public.referral_payouts r
 LEFT JOIN public.profiles p ON p.user_id=r.referrer_user_id LEFT JOIN auth.users u ON u.id=r.referrer_user_id
 ORDER BY r.requested_at DESC, r.id DESC LIMIT p_limit OFFSET p_offset
 ) x;
 RETURN jsonb_build_object('rows',v_rows,'total',(SELECT count(*) FROM public.referral_payouts));
END $$;
CREATE OR REPLACE FUNCTION public.admin_review_referral_payout(p_id uuid, p_status text, p_expected_status text, p_reference text DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.referral_payouts; v_reference text := NULLIF(trim(p_reference),''); v_note text := NULLIF(trim(p_note),'');
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('processing','paid','rejected') THEN RAISE EXCEPTION 'invalid_status'; END IF;
 SELECT * INTO r FROM public.referral_payouts WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'not_updatable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('referral:' || r.referrer_user_id::text));
 SELECT * INTO r FROM public.referral_payouts WHERE id=p_id FOR UPDATE;
 IF r.status NOT IN ('pending','processing') OR r.status IS DISTINCT FROM p_expected_status OR r.status=p_status THEN RAISE EXCEPTION 'not_updatable'; END IF;
 IF p_status='paid' AND v_reference IS NULL THEN RAISE EXCEPTION 'reference_required'; END IF;
 IF p_status='rejected' AND v_note IS NULL THEN RAISE EXCEPTION 'reason_required'; END IF;
 IF length(v_reference)>200 OR length(v_note)>1000 THEN RAISE EXCEPTION 'invalid_details'; END IF;
 UPDATE public.referral_payouts SET status=p_status, approved_by=auth.uid(), transaction_reference=CASE WHEN p_status='paid' THEN v_reference ELSE transaction_reference END,
 admin_note=COALESCE(v_note,admin_note), processed_at=CASE WHEN p_status IN ('paid','rejected') THEN now() ELSE processed_at END, updated_at=now() WHERE id=p_id;
 INSERT INTO public.referral_audit(actor_user_id,action,details) VALUES(auth.uid(),'payout_' || p_status,jsonb_build_object('payout',p_id,'previous_status',r.status,'amount',r.amount,'currency',r.currency,'reference',v_reference,'note',v_note));
END $$;
CREATE OR REPLACE FUNCTION public.admin_set_referral_payout_status(p_id uuid, p_status text, p_reference text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_status text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT status INTO v_status FROM public.referral_payouts WHERE id=p_id;
 PERFORM public.admin_review_referral_payout(p_id,p_status,v_status,p_reference,CASE WHEN p_status='rejected' THEN p_reference ELSE NULL END);
END $$;
REVOKE ALL ON FUNCTION public.admin_list_referral_payouts(integer,integer), public.admin_review_referral_payout(uuid,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_list_referral_payouts(integer,integer), public.admin_review_referral_payout(uuid,text,text,text,text) TO authenticated;