CREATE TABLE public.license_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 320),
  message text CHECK (message IS NULL OR char_length(message) <= 2000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','approved','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.license_requests TO authenticated;
GRANT UPDATE ON public.license_requests TO authenticated;
GRANT ALL ON public.license_requests TO service_role;
ALTER TABLE public.license_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own license requests" ON public.license_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'new');
CREATE POLICY "Users read own license requests" ON public.license_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update license requests" ON public.license_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.practice_access_state(p_user_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_policy public.practice_access_policies%ROWTYPE; v_code text; v_limit integer; v_sub public.subscriptions%ROWTYPE;
  v_paid boolean:=false; v_trial boolean:=false; v_grant public.legacy_plan_grants%ROWTYPE; v_has_grant boolean:=false;
  v_grace_until timestamptz;
BEGIN
 SELECT * INTO v_grant FROM public.legacy_plan_grants WHERE user_id=p_user_id AND expires_at>now();
 v_has_grant := FOUND;
 SELECT * INTO v_policy FROM public.practice_access_policies WHERE user_id=p_user_id;
 IF NOT FOUND AND NOT v_has_grant THEN RETURN jsonb_build_object('policy_version',1,'plan_code','free','can_write',false,'has_pro',false,'client_limit',5); END IF;
 SELECT * INTO v_sub FROM public.subscriptions WHERE user_id=p_user_id;
 -- Failed payment: 10 days after the (unchanged) paid-through date; repeated events cannot extend it.
 IF v_sub.status = 'past_due' AND v_sub.current_period_end IS NOT NULL THEN
   v_grace_until := v_sub.current_period_end + interval '10 days';
 END IF;
 v_paid := coalesce(
   (v_sub.status IN ('active','trialing') AND (v_sub.current_period_end IS NULL OR v_sub.current_period_end>now()))
   OR (v_sub.status = 'past_due' AND v_grace_until>now())
   OR (v_sub.status IN ('canceled','paused') AND v_sub.current_period_end>now()), false);
 -- New rules: only Paddle-verified subscriptions count as paid.
 IF coalesce(v_policy.policy_version,1) >= 2 AND v_sub.paddle_subscription_id IS NULL THEN v_paid := false; END IF;
 IF v_paid THEN SELECT p.code INTO v_code FROM public.plans p WHERE p.id=v_sub.current_plan_id; END IF;
 IF v_has_grant THEN
   RETURN jsonb_build_object('policy_version',coalesce(v_policy.policy_version,1),'plan_code',v_grant.plan_code,'can_write',true,
     'has_pro',v_grant.plan_code='pro' OR (v_paid AND v_code='pro'),'client_limit',null,'on_trial',false,'trial_ends_at',null,
     'legacy_grant',true,'legacy_until',v_grant.expires_at,'payment_grace_until',v_grace_until);
 END IF;
 IF v_policy.policy_version=1 THEN
  v_limit := CASE WHEN v_paid THEN NULL ELSE 5 END;
  RETURN jsonb_build_object('policy_version',1,'plan_code',coalesce(v_code,CASE WHEN v_paid THEN 'pro' ELSE 'free' END),'can_write',true,'has_pro',true,'client_limit',v_limit,'on_trial',false,'trial_ends_at',null);
 END IF;
 v_trial := NOT v_paid AND coalesce(v_policy.trial_ends_at>now(),false);
 RETURN jsonb_build_object('policy_version',2,'plan_code',CASE WHEN v_paid THEN coalesce(v_code,'solo') WHEN v_trial THEN 'trial' ELSE 'expired' END,'can_write',v_paid OR v_trial,'has_pro',(v_paid AND v_code='pro') OR v_trial,'client_limit',null,'on_trial',v_trial,'trial_ends_at',v_policy.trial_ends_at,
   'payment_grace_until',CASE WHEN v_paid THEN v_grace_until END);
END $function$;