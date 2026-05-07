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

  -- Project URL hardcoded (matches edge function host).
  v_project_url := 'https://rxculneqqaziutulnocs.supabase.co';

  IF v_service_key IS NULL THEN
    RAISE WARNING 'notify_booking_request: missing service role secret, skipping email';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_project_url || '/functions/v1/send-transactional-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'templateName', 'booking-request-notification',
      'recipientEmail', 'info@solo-bizz.com',
      'idempotencyKey', 'booking-' || NEW.id::text,
      'templateData', jsonb_build_object(
        'name', NEW.name,
        'email', NEW.email,
        'phone', NEW.phone,
        'message', NEW.message,
        'language', NEW.language,
        'source', NEW.source,
        'created_at', NEW.created_at
      )
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_request ON public.booking_requests;
CREATE TRIGGER trg_notify_booking_request
AFTER INSERT ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_booking_request();