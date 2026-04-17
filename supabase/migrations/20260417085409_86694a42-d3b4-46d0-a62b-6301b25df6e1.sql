CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year text;
  v_month text;
  v_seq int;
  v_prefix text;
BEGIN
  IF auth.uid() IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_month := to_char(CURRENT_DATE, 'MM');
  v_prefix := v_year || '/' || v_month || '/';

  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.invoices
  WHERE user_id = p_user_id
    AND invoice_number LIKE v_prefix || '%';

  RETURN v_prefix || lpad(v_seq::text, 4, '0');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.generate_invoice_number(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(uuid) TO authenticated;