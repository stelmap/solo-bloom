CREATE OR REPLACE FUNCTION public.validate_client_communication_language()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.communication_language IS NOT NULL
     AND NEW.communication_language NOT IN ('uk','ru','en','pl','fr') THEN
    RAISE EXCEPTION 'INVALID_CLIENT_LANGUAGE: %', NEW.communication_language;
  END IF;
  RETURN NEW;
END;
$$;