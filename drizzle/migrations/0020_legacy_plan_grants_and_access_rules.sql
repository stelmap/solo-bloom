CREATE TABLE public.legacy_plan_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan_code text NOT NULL CHECK (plan_code IN ('solo','pro')),
  legacy_customer boolean NOT NULL DEFAULT true,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.legacy_plan_grants TO authenticated;
GRANT ALL ON public.legacy_plan_grants TO service_role;
ALTER TABLE public.legacy_plan_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read legacy grants" ON public.legacy_plan_grants FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.legacy_plan_grants (user_id, plan_code, granted_at, expires_at, reason)
SELECT id, 'pro', '2026-11-16T00:00:00Z', '2027-11-16T00:00:00Z', 'Existing paying customer: Pro Practice access for 12 months (2026-11 plan restructure)'
FROM auth.users WHERE lower(email) IN ('daria.benedite@gmail.com','p6218030@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.practice_access_state(p_user_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_policy public.practice_access_policies%ROWTYPE; v_code text; v_limit integer; v_sub public.subscriptions%ROWTYPE;
  v_paid boolean:=false; v_trial boolean:=false; v_grant public.legacy_plan_grants%ROWTYPE; v_has_grant boolean:=false;
BEGIN
 SELECT * INTO v_grant FROM public.legacy_plan_grants WHERE user_id=p_user_id AND expires_at>now();
 v_has_grant := FOUND;
 SELECT * INTO v_policy FROM public.practice_access_policies WHERE user_id=p_user_id;
 IF NOT FOUND AND NOT v_has_grant THEN RETURN jsonb_build_object('policy_version',1,'plan_code','free','can_write',false,'has_pro',false,'client_limit',5); END IF;
 SELECT * INTO v_sub FROM public.subscriptions WHERE user_id=p_user_id;
 -- Active/trialing: paid. Past due, cancelled or paused: access only until the paid-through date.
 v_paid := coalesce(
   (v_sub.status IN ('active','trialing') AND (v_sub.current_period_end IS NULL OR v_sub.current_period_end>now()))
   OR (v_sub.status IN ('past_due','canceled','paused') AND v_sub.current_period_end>now()), false);
 IF v_paid THEN SELECT p.code INTO v_code FROM public.plans p WHERE p.id=v_sub.current_plan_id; END IF;
 IF v_has_grant THEN
   RETURN jsonb_build_object('policy_version',coalesce(v_policy.policy_version,1),'plan_code',v_grant.plan_code,'can_write',true,
     'has_pro',v_grant.plan_code='pro' OR (v_paid AND v_code='pro'),'client_limit',null,'on_trial',false,'trial_ends_at',null,
     'legacy_grant',true,'legacy_until',v_grant.expires_at);
 END IF;
 IF v_policy.policy_version=1 THEN
  v_limit := CASE WHEN v_paid THEN NULL ELSE 5 END;
  RETURN jsonb_build_object('policy_version',1,'plan_code',coalesce(v_code,CASE WHEN v_paid THEN 'pro' ELSE 'free' END),'can_write',true,'has_pro',true,'client_limit',v_limit,'on_trial',false,'trial_ends_at',null);
 END IF;
 v_trial := NOT v_paid AND coalesce(v_policy.trial_ends_at>now(),false);
 RETURN jsonb_build_object('policy_version',2,'plan_code',CASE WHEN v_paid THEN coalesce(v_code,'solo') WHEN v_trial THEN 'trial' ELSE 'expired' END,'can_write',v_paid OR v_trial,'has_pro',(v_paid AND v_code='pro') OR v_trial,'client_limit',null,'on_trial',v_trial,'trial_ends_at',v_policy.trial_ends_at);
END $function$;