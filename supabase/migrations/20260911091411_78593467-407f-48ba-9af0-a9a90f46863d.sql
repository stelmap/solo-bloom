ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS request_type text,
  ADD COLUMN IF NOT EXISTS request_type_other text,
  ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.booking_requests ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.booking_requests DROP CONSTRAINT IF EXISTS booking_requests_status_check;
ALTER TABLE public.booking_requests ADD CONSTRAINT booking_requests_status_check
  CHECK (status = ANY (ARRAY['new','in_progress','contacted','resolved','closed','done','archived']));

DROP POLICY IF EXISTS "Anyone can create a booking request" ON public.booking_requests;
CREATE POLICY "Anyone can create a booking request"
ON public.booking_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(name)) >= 1 AND length(btrim(name)) <= 120
  AND (
    email IS NULL OR btrim(email) = '' OR (
      length(btrim(email)) >= 3 AND length(btrim(email)) <= 254
      AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    )
  )
  AND (phone IS NULL OR length(phone) <= 40)
  AND (message IS NULL OR length(message) <= 2000)
  AND (request_type IS NULL OR length(request_type) <= 60)
  AND (request_type_other IS NULL OR length(request_type_other) <= 500)
  AND (source IS NULL OR length(source) <= 120)
  AND (user_id IS NULL OR user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.admin_update_booking_request_status(p_id uuid, p_status text)
RETURNS public.booking_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.booking_requests;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('new','in_progress','contacted','resolved','closed','done','archived') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.booking_requests
     SET status = p_status
   WHERE id = p_id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;