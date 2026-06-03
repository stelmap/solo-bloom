
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS provider_business_name text,
  ADD COLUMN IF NOT EXISTS payment_status text;

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_user_id uuid, p_session_date date)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text;
  v_seq int;
BEGIN
  IF auth.uid() IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_prefix := to_char(p_session_date, 'YYYY-MM-DD') || '-';

  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.invoices
  WHERE user_id = p_user_id
    AND invoice_number LIKE v_prefix || '%';

  RETURN v_prefix || lpad(v_seq::text, 3, '0');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.generate_invoice_number(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(uuid, date) TO authenticated;
