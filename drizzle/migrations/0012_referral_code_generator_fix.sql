CREATE OR REPLACE FUNCTION public.get_my_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_code text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT code INTO v_code FROM referral_codes WHERE user_id = v_uid;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;
  LOOP
    v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    BEGIN
      INSERT INTO referral_codes(user_id, code) VALUES (v_uid, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      SELECT code INTO v_code FROM referral_codes WHERE user_id = v_uid;
      IF v_code IS NOT NULL THEN RETURN v_code; END IF;
    END;
  END LOOP;
END $$;