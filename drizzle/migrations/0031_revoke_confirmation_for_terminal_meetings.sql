CREATE OR REPLACE FUNCTION public.confirm_session_by_token(p_token text)
RETURNS TABLE (success boolean, already_confirmed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_apt_id uuid;
  v_status text;
  v_confirmation_id uuid;
  v_confirmed timestamptz;
BEGIN
  SELECT sc.appointment_id INTO v_apt_id
  FROM public.session_confirmations sc WHERE sc.token = p_token LIMIT 1;
  IF v_apt_id IS NULL THEN
    RETURN QUERY SELECT false, false;
    RETURN;
  END IF;

  -- Lock the meeting first so cancellation and confirmation serialize.
  SELECT a.status INTO v_status FROM public.appointments a
  WHERE a.id = v_apt_id FOR UPDATE;
  IF NOT FOUND OR v_status IS NULL OR v_status NOT IN ('scheduled', 'confirmed') THEN
    RETURN QUERY SELECT false, false;
    RETURN;
  END IF;

  SELECT sc.id, sc.confirmed_at INTO v_confirmation_id, v_confirmed
  FROM public.session_confirmations sc
  WHERE sc.token = p_token AND sc.appointment_id = v_apt_id
  LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false;
    RETURN;
  END IF;
  IF v_confirmed IS NOT NULL THEN
    RETURN QUERY SELECT false, true;
    RETURN;
  END IF;

  UPDATE public.appointments
  SET status = 'confirmed', confirmation_status = 'confirmed', confirmation_timestamp = now()
  WHERE id = v_apt_id AND status IN ('scheduled', 'confirmed');
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false;
    RETURN;
  END IF;

  UPDATE public.session_confirmations SET confirmed_at = now()
  WHERE id = v_confirmation_id AND confirmed_at IS NULL;
  RETURN QUERY SELECT true, false;
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_session_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_session_by_token(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_session_confirmation(p_token text)
RETURNS TABLE (id uuid, appointment_id uuid, confirmed_at timestamptz,
  scheduled_at timestamptz, client_name text, service_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sc.id, sc.appointment_id, sc.confirmed_at, a.scheduled_at,
         c.name AS client_name, s.name AS service_name
  FROM public.session_confirmations sc
  JOIN public.appointments a ON a.id = sc.appointment_id
  LEFT JOIN public.clients c ON c.id = a.client_id
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE sc.token = p_token AND a.status IN ('scheduled', 'confirmed')
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_session_confirmation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_session_confirmation(text) TO anon, authenticated, service_role;