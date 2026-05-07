
-- 1) Restrict promotions visibility to service_role only (server-side validation)
DROP POLICY IF EXISTS "Authenticated can read active promotions" ON public.promotions;

-- 2) Lock down SECURITY DEFINER functions from anon/authenticated where not needed.
-- Keep public flows: confirm_session_by_token, get_session_confirmation (used by confirm page).
REVOKE EXECUTE ON FUNCTION public.cleanup_demo_workspace(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_demo_workspace(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.migrate_legacy_user(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.migrate_all_legacy_users() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_appointment_payment_status(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_default_payment_methods(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_client_revenue_consistency() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_demo_data(uuid) FROM anon, authenticated;
-- generate_invoice_number is invoked from client when creating invoices; keep authenticated
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number(uuid) FROM anon;
-- has_role is used inside policies; revoke direct call
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
