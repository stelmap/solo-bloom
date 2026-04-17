-- Replace overly permissive SELECT policy on session_confirmations with token-scoped RPC

DROP POLICY IF EXISTS "Read confirmation by token lookup" ON public.session_confirmations;
DROP POLICY IF EXISTS "Confirm via token" ON public.session_confirmations;

-- Owners can still read their own confirmations (for app-side use if needed)
CREATE POLICY "Owners can read own session_confirmations"
ON public.session_confirmations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = session_confirmations.appointment_id
      AND a.user_id = auth.uid()
  )
);

-- SECURITY DEFINER function for token-based lookup (no enumeration possible)
CREATE OR REPLACE FUNCTION public.get_session_confirmation(p_token text)
RETURNS TABLE (
  id uuid,
  appointment_id uuid,
  confirmed_at timestamptz,
  scheduled_at timestamptz,
  client_name text,
  service_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT sc.id, sc.appointment_id, sc.confirmed_at,
         a.scheduled_at, c.name AS client_name, s.name AS service_name
  FROM public.session_confirmations sc
  JOIN public.appointments a ON a.id = sc.appointment_id
  LEFT JOIN public.clients c ON c.id = a.client_id
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE sc.token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_session_confirmation(text) TO anon, authenticated;

-- SECURITY DEFINER function for token-based confirmation
CREATE OR REPLACE FUNCTION public.confirm_session_by_token(p_token text)
RETURNS TABLE (success boolean, already_confirmed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_apt_id uuid;
  v_confirmed timestamptz;
BEGIN
  SELECT appointment_id, confirmed_at INTO v_apt_id, v_confirmed
  FROM public.session_confirmations
  WHERE token = p_token
  LIMIT 1;

  IF v_apt_id IS NULL THEN
    RETURN QUERY SELECT false, false;
    RETURN;
  END IF;

  IF v_confirmed IS NOT NULL THEN
    RETURN QUERY SELECT false, true;
    RETURN;
  END IF;

  UPDATE public.session_confirmations
  SET confirmed_at = now()
  WHERE token = p_token AND confirmed_at IS NULL;

  UPDATE public.appointments
  SET status = 'confirmed',
      confirmation_status = 'confirmed',
      confirmation_timestamp = now()
  WHERE id = v_apt_id;

  RETURN QUERY SELECT true, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_session_by_token(text) TO anon, authenticated;