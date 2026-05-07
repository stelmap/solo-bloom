ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';

ALTER TABLE public.booking_requests
  DROP CONSTRAINT IF EXISTS booking_requests_status_check;

ALTER TABLE public.booking_requests
  ADD CONSTRAINT booking_requests_status_check
  CHECK (status IN ('new', 'in_progress', 'done', 'archived'));

CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON public.booking_requests (status);

DROP POLICY IF EXISTS "Admins can update booking requests" ON public.booking_requests;
CREATE POLICY "Admins can update booking requests"
ON public.booking_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));