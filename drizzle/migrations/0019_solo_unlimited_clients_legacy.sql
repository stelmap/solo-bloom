CREATE OR REPLACE FUNCTION public.practice_access_state(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_policy public.practice_access_policies%ROWTYPE; v_code text; v_limit integer; v_sub public.subscriptions%ROWTYPE; v_paid boolean:=false; v_trial boolean:=false;
BEGIN
 SELECT * INTO v_policy FROM public.practice_access_policies WHERE user_id=p_user_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('policy_version',1,'plan_code','free','can_write',false,'has_pro',false,'client_limit',5); END IF;
 SELECT * INTO v_sub FROM public.subscriptions WHERE user_id=p_user_id;
 v_paid := coalesce(v_sub.status IN ('active','trialing') AND (v_sub.current_period_end IS NULL OR v_sub.current_period_end>now()),false);
 IF v_paid THEN SELECT p.code INTO v_code FROM public.plans p WHERE p.id=v_sub.current_plan_id; END IF;
 IF v_policy.policy_version=1 THEN
  v_limit := CASE WHEN v_paid THEN NULL ELSE 5 END;
  RETURN jsonb_build_object('policy_version',1,'plan_code',coalesce(v_code,CASE WHEN v_paid THEN 'pro' ELSE 'free' END),'can_write',true,'has_pro',true,'client_limit',v_limit,'on_trial',false,'trial_ends_at',null);
 END IF;
 v_trial := NOT v_paid AND coalesce(v_policy.trial_ends_at>now(),false);
 RETURN jsonb_build_object('policy_version',2,'plan_code',CASE WHEN v_paid THEN coalesce(v_code,'solo') WHEN v_trial THEN 'trial' ELSE 'expired' END,'can_write',v_paid OR v_trial,'has_pro',(v_paid AND v_code='pro') OR v_trial,'client_limit',null,'on_trial',v_trial,'trial_ends_at',v_policy.trial_ends_at);
END $function$;