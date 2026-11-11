CREATE OR REPLACE FUNCTION public.enforce_practice_access_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_owner uuid; v_state jsonb; v_row jsonb;
BEGIN
 v_row := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 v_owner := (v_row->>'user_id')::uuid;
 IF v_owner IS NULL OR auth.role()='service_role' THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='INSERT' AND TG_TABLE_NAME IN ('booking_links','booking_availability') AND pg_trigger_depth()>1 AND auth.uid() IS NULL THEN RETURN NEW; END IF;
 v_state := public.practice_access_state(v_owner);
 IF (v_state->>'policy_version')::integer=1 THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF NOT coalesce((v_state->>'can_write')::boolean,false) THEN RAISE EXCEPTION 'SUBSCRIPTION_REQUIRED' USING ERRCODE='P0001'; END IF;
 IF TG_ARGV[0]='pro' AND NOT (v_state->>'has_pro')::boolean THEN
 IF NOT (TG_TABLE_NAME='invoices' AND pg_trigger_depth()>1) THEN RAISE EXCEPTION 'PRO_SUBSCRIPTION_REQUIRED' USING ERRCODE='P0001'; END IF;
 END IF;
 IF TG_TABLE_NAME='appointments' AND v_row->>'group_id' IS NOT NULL AND NOT (v_state->>'has_pro')::boolean THEN RAISE EXCEPTION 'PRO_SUBSCRIPTION_REQUIRED' USING ERRCODE='P0001'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;