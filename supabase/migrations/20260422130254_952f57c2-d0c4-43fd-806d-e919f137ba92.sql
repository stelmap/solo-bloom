-- Backfill income.client_id from related appointment
UPDATE public.income i
SET client_id = a.client_id
FROM public.appointments a
WHERE i.appointment_id = a.id
  AND i.client_id IS NULL
  AND a.client_id IS NOT NULL;

-- Trigger to auto-populate client_id from appointment going forward
CREATE OR REPLACE FUNCTION public.populate_income_client_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NULL AND NEW.appointment_id IS NOT NULL THEN
    SELECT a.client_id INTO NEW.client_id
    FROM public.appointments a
    WHERE a.id = NEW.appointment_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_populate_income_client_id ON public.income;
CREATE TRIGGER trg_populate_income_client_id
BEFORE INSERT OR UPDATE OF appointment_id, client_id ON public.income
FOR EACH ROW
EXECUTE FUNCTION public.populate_income_client_id();