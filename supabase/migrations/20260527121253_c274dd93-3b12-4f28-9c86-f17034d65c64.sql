
-- Allow multiple intervals per (user_id, weekday)
ALTER TABLE public.booking_availability
  DROP CONSTRAINT IF EXISTS booking_availability_user_weekday_unique;

ALTER TABLE public.booking_availability
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS booking_availability_user_weekday_idx
  ON public.booking_availability (user_id, weekday, sort_order);

-- Validation trigger: prevent overlapping enabled intervals within same (user_id, weekday)
CREATE OR REPLACE FUNCTION public.validate_booking_availability_intervals()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'booking_availability: start_time must be before end_time';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.booking_availability ba
    WHERE ba.user_id = NEW.user_id
      AND ba.weekday = NEW.weekday
      AND ba.id <> NEW.id
      AND ba.is_enabled = true
      AND ba.start_time < NEW.end_time
      AND ba.end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'booking_availability: intervals overlap for this weekday';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS booking_availability_validate_intervals ON public.booking_availability;
CREATE TRIGGER booking_availability_validate_intervals
  BEFORE INSERT OR UPDATE ON public.booking_availability
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_availability_intervals();
