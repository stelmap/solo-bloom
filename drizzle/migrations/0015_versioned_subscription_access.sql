CREATE TABLE public.practice_access_policies (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
 policy_version integer NOT NULL DEFAULT 2,
 trial_started_at timestamptz,
 trial_ends_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.practice_access_policies TO authenticated;
GRANT ALL ON public.practice_access_policies TO service_role;
ALTER TABLE public.practice_access_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_access_policy ON public.practice_access_policies FOR SELECT TO authenticated USING (user_id = auth.uid());
INSERT INTO public.practice_access_policies(user_id, policy_version) SELECT user_id, 1 FROM public.profiles ON CONFLICT DO NOTHING;
CREATE FUNCTION public.initialize_practice_access_policy() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.practice_access_policies(user_id) VALUES(NEW.user_id) ON CONFLICT DO NOTHING; RETURN NEW; END $$;
CREATE TRIGGER initialize_practice_access_policy AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.initialize_practice_access_policy();
CREATE FUNCTION public.start_confirmed_practice_trial() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.email_confirmed_at IS NOT NULL THEN
 UPDATE public.practice_access_policies SET trial_started_at=NEW.email_confirmed_at, trial_ends_at=NEW.email_confirmed_at + interval '14 days' WHERE user_id=NEW.id AND policy_version=2 AND trial_started_at IS NULL;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER start_confirmed_practice_trial AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.start_confirmed_practice_trial();
CREATE FUNCTION public.practice_access_state(p_user_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_policy public.practice_access_policies%ROWTYPE; v_code text; v_limit integer; v_sub public.subscriptions%ROWTYPE; v_paid boolean:=false; v_trial boolean:=false;
BEGIN
 SELECT * INTO v_policy FROM public.practice_access_policies WHERE user_id=p_user_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('policy_version',1,'plan_code','free','can_write',false,'has_pro',false,'client_limit',5); END IF;
 SELECT * INTO v_sub FROM public.subscriptions WHERE user_id=p_user_id;
 v_paid := coalesce(v_sub.status IN ('active','trialing') AND (v_sub.current_period_end IS NULL OR v_sub.current_period_end>now()),false);
 IF v_paid THEN SELECT p.code INTO v_code FROM public.plans p WHERE p.id=v_sub.current_plan_id; END IF;
 IF v_policy.policy_version=1 THEN
  v_limit := CASE WHEN v_paid AND (v_code='pro' OR v_code IS NULL OR v_sub.legacy_full_access) THEN NULL WHEN v_paid AND v_code='solo' THEN 20 ELSE 5 END;
  RETURN jsonb_build_object('policy_version',1,'plan_code',coalesce(v_code,CASE WHEN v_paid THEN 'pro' ELSE 'free' END),'can_write',true,'has_pro',true,'client_limit',v_limit,'on_trial',false,'trial_ends_at',null);
 END IF;
 v_trial := NOT v_paid AND coalesce(v_policy.trial_ends_at>now(),false);
 RETURN jsonb_build_object('policy_version',2,'plan_code',CASE WHEN v_paid THEN coalesce(v_code,'solo') WHEN v_trial THEN 'trial' ELSE 'expired' END,'can_write',v_paid OR v_trial,'has_pro',(v_paid AND v_code='pro') OR v_trial,'client_limit',null,'on_trial',v_trial,'trial_ends_at',v_policy.trial_ends_at);
END $$;
REVOKE ALL ON FUNCTION public.practice_access_state(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.practice_access_state(uuid) TO service_role;
CREATE FUNCTION public.get_my_practice_access() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF; RETURN public.practice_access_state(auth.uid()); END $$;
REVOKE ALL ON FUNCTION public.get_my_practice_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_practice_access() TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.current_plan_client_limit(p_user_id uuid) RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN (public.practice_access_state(p_user_id)->>'client_limit')::integer; END $$;
CREATE FUNCTION public.enforce_practice_access_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_owner uuid; v_state jsonb; v_row jsonb;
BEGIN
 v_row := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 v_owner := (v_row->>'user_id')::uuid;
 IF v_owner IS NULL OR auth.role()='service_role' THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 v_state := public.practice_access_state(v_owner);
 IF (v_state->>'policy_version')::integer=1 THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF NOT coalesce((v_state->>'can_write')::boolean,false) THEN RAISE EXCEPTION 'SUBSCRIPTION_REQUIRED' USING ERRCODE='P0001'; END IF;
 IF TG_ARGV[0]='pro' AND NOT (v_state->>'has_pro')::boolean THEN
  IF NOT (TG_TABLE_NAME='invoices' AND pg_trigger_depth()>1) THEN RAISE EXCEPTION 'PRO_SUBSCRIPTION_REQUIRED' USING ERRCODE='P0001'; END IF;
 END IF;
 IF TG_TABLE_NAME='appointments' AND v_row->>'group_id' IS NOT NULL AND NOT (v_state->>'has_pro')::boolean THEN RAISE EXCEPTION 'PRO_SUBSCRIPTION_REQUIRED' USING ERRCODE='P0001'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['clients','services','appointments','recurring_rules','income','expected_payments','client_credits','client_opening_debts','client_opening_debt_payments','session_prepayment_ledger','payment_methods','working_schedule','days_off','booking_availability','booking_links','session_notes','client_notes_raw','client_price_changes','client_sources','income_session_allocations'] LOOP
 EXECUTE format('CREATE TRIGGER aa_practice_write_access BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_practice_access_write(''solo'')',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['groups','group_members','group_sessions','group_attendance','group_session_payments','supervisions','expenses','payment_corrections','invoices','breakeven_goals','tax_settings'] LOOP
 EXECUTE format('CREATE TRIGGER aa_practice_write_access BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_practice_access_write(''pro'')',t);
 END LOOP;
END $$;