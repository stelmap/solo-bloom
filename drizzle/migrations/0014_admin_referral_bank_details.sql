CREATE TABLE public.referral_payout_bank_details (
 payout_id uuid PRIMARY KEY REFERENCES public.referral_payouts(id) ON DELETE CASCADE,
 account_holder text NOT NULL,
 bank_name text NOT NULL,
 account_number text NOT NULL,
 swift_bic text NOT NULL DEFAULT '',
 updated_by uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_payout_bank_details TO authenticated;
GRANT ALL ON public.referral_payout_bank_details TO service_role;
ALTER TABLE public.referral_payout_bank_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read payout bank details" ON public.referral_payout_bank_details FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.admin_save_referral_bank_details(p_id uuid, p_expected_status text, p_account_holder text, p_bank_name text, p_account_number text, p_swift_bic text DEFAULT '', p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.referral_payouts; v_updated timestamptz; v_holder text := trim(p_account_holder); v_bank text := trim(p_bank_name); v_account text := upper(regexp_replace(p_account_number,'\s','','g')); v_bic text := upper(regexp_replace(COALESCE(p_swift_bic,''),'\s','','g'));
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO r FROM public.referral_payouts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR r.status NOT IN ('pending','processing') OR r.status IS DISTINCT FROM p_expected_status THEN RAISE EXCEPTION 'not_updatable'; END IF;
 IF v_holder IS NULL OR length(v_holder) NOT BETWEEN 1 AND 200 OR v_bank IS NULL OR length(v_bank) NOT BETWEEN 1 AND 200 OR v_account IS NULL OR v_account !~ '^[A-Z0-9-]{4,64}$' OR (v_bic<>'' AND v_bic !~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$') THEN RAISE EXCEPTION 'invalid_bank_details'; END IF;
 SELECT updated_at INTO v_updated FROM public.referral_payout_bank_details WHERE payout_id=p_id;
 IF v_updated IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'bank_details_changed'; END IF;
 INSERT INTO public.referral_payout_bank_details(payout_id,account_holder,bank_name,account_number,swift_bic,updated_by) VALUES(p_id,v_holder,v_bank,v_account,v_bic,auth.uid())
 ON CONFLICT(payout_id) DO UPDATE SET account_holder=EXCLUDED.account_holder,bank_name=EXCLUDED.bank_name,account_number=EXCLUDED.account_number,swift_bic=EXCLUDED.swift_bic,updated_by=auth.uid(),updated_at=now();
 INSERT INTO public.referral_audit(actor_user_id,action,details) VALUES(auth.uid(),'payout_bank_details_updated',jsonb_build_object('payout',p_id));
END $$;
REVOKE ALL ON FUNCTION public.admin_save_referral_bank_details(uuid,text,text,text,text,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_referral_bank_details(uuid,text,text,text,text,text,timestamptz) TO authenticated;