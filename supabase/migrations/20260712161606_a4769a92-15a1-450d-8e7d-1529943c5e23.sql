CREATE OR REPLACE FUNCTION public.withdraw_from_prepayment_for_appointment(
  p_appointment_id uuid,
  p_client_id uuid,
  p_max_amount numeric
)
RETURNS TABLE(consumed numeric, audit_income_id uuid, balance_before numeric, balance_after numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_apt_user uuid;
  v_apt_scheduled timestamptz;
  v_balance_before numeric := 0;
  v_balance_after numeric := 0;
  v_consumed numeric := 0;
  v_first_prepay_income uuid;
  v_audit_id uuid;
  v_service_name text;
BEGIN
  -- Lock the appointment row first (FOR UPDATE cannot be used with an outer join).
  SELECT a.user_id, a.scheduled_at
    INTO v_apt_user, v_apt_scheduled
    FROM public.appointments a
    WHERE a.id = p_appointment_id
    FOR UPDATE;

  IF v_apt_user IS NULL THEN
    RAISE EXCEPTION 'appointment_not_found';
  END IF;
  v_user := v_apt_user;

  -- Fetch service name separately (optional; may be null).
  SELECT s.name INTO v_service_name
    FROM public.appointments a
    LEFT JOIN public.services s ON s.id = a.service_id
    WHERE a.id = p_appointment_id;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  SELECT COALESCE(SUM(amount), 0)
    INTO v_balance_before
    FROM public.client_credits
    WHERE client_id = p_client_id AND user_id = v_user;

  SELECT income_id
    INTO v_first_prepay_income
    FROM public.client_credits
    WHERE client_id = p_client_id AND user_id = v_user AND income_id IS NOT NULL AND amount > 0
    ORDER BY created_at ASC
    LIMIT 1;

  SELECT public.consume_client_credit_for_appointment(p_appointment_id, p_client_id, p_max_amount)
    INTO v_consumed;

  SELECT COALESCE(SUM(amount), 0)
    INTO v_balance_after
    FROM public.client_credits
    WHERE client_id = p_client_id AND user_id = v_user;

  IF v_consumed > 0 THEN
    INSERT INTO public.income (
      user_id, appointment_id, client_id, amount, date, session_date,
      source, status, description, payment_method,
      balance_before, balance_after, source_prepayment_income_id
    )
    VALUES (
      v_user, p_appointment_id, p_client_id, 0, CURRENT_DATE,
      (v_apt_scheduled AT TIME ZONE 'UTC')::date,
      'prepayment_withdrawal', 'confirmed',
      format('%s deducted from prepayment balance for session on %s. Balance before: %s. Balance after: %s.',
        v_consumed::text,
        to_char(v_apt_scheduled, 'DD.MM.YYYY'),
        v_balance_before::text,
        v_balance_after::text),
      'prepayment',
      v_balance_before, v_balance_after, v_first_prepay_income
    )
    RETURNING id INTO v_audit_id;
  END IF;

  RETURN QUERY SELECT v_consumed, v_audit_id, v_balance_before, v_balance_after;
END $function$;