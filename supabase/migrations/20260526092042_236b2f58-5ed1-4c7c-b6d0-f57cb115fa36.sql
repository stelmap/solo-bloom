-- Prevent duplicate active booking requests for the same therapist + slot (race-condition safe)
CREATE UNIQUE INDEX IF NOT EXISTS session_booking_requests_active_slot_unique
  ON public.session_booking_requests (user_id, requested_slot_at)
  WHERE status IN ('pending', 'needs_linking', 'confirmed');

-- Enable Realtime for instant calendar / inbox updates when a request arrives or changes
ALTER TABLE public.session_booking_requests REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'session_booking_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_booking_requests;
  END IF;
END $$;

-- Also publish appointments so confirmed sessions appear instantly across tabs
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;
END $$;