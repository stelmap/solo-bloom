CREATE OR REPLACE FUNCTION public.notify_booking_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_key text;
  v_project_url text;
BEGIN
  SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
   WHERE name = 'email_queue_service_role_key'
   LIMIT 1;

  v_project_url := 'https://rxculneqqaziutulnocs.supabase.co';

  IF v_service_key IS NULL THEN
    RAISE WARNING 'notify_booking_request: missing service role secret, skipping email';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_project_url || '/functions/v1/send-booking-request-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('requestId', NEW.id)
  );

  RETURN NEW;
END;
$$;