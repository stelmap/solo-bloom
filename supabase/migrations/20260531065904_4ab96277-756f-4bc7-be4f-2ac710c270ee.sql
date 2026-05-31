REVOKE ALL ON FUNCTION public.consume_client_credit_for_appointment(uuid, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_client_credit_for_appointment(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_client_credit_for_appointment(uuid, uuid, numeric) TO service_role;