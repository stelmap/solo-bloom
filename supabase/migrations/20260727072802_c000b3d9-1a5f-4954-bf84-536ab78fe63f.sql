DROP FUNCTION IF EXISTS public.admin_delete_user_and_data(uuid);

CREATE OR REPLACE FUNCTION public.admin_delete_user_and_data(p_user_id uuid, p_admin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counts jsonb := '{}'::jsonb;
BEGIN
  IF p_user_id IS NULL OR p_admin_id IS NULL THEN
    RAISE EXCEPTION 'target user id and admin id are required';
  END IF;
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_user_id = p_admin_id THEN
    RAISE EXCEPTION 'an admin cannot delete their own account';
  END IF;
  IF public.has_role(p_user_id, 'admin') THEN
    RAISE EXCEPTION 'admin accounts cannot be deleted with this operation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'target user does not exist';
  END IF;

  SELECT jsonb_build_object(
    'clients', (SELECT count(*) FROM public.clients WHERE user_id = p_user_id),
    'appointments', (SELECT count(*) FROM public.appointments WHERE user_id = p_user_id),
    'session_notes', (SELECT count(*) FROM public.session_notes WHERE user_id = p_user_id),
    'invoices', (SELECT count(*) FROM public.invoices WHERE user_id = p_user_id),
    'income', (SELECT count(*) FROM public.income WHERE user_id = p_user_id),
    'expenses', (SELECT count(*) FROM public.expenses WHERE user_id = p_user_id)
  ) INTO v_counts;

  DELETE FROM public.agreement_otp_challenges c
   USING public.agreement_invitations i
   WHERE c.invitation_id = i.id AND i.user_id = p_user_id;

  DELETE FROM public.agreement_verified_sessions s
   USING public.agreement_invitations i
   WHERE s.invitation_id = i.id AND i.user_id = p_user_id;

  DELETE FROM public.session_confirmations sc
   USING public.appointments a
   WHERE sc.appointment_id = a.id AND a.user_id = p_user_id;

  DELETE FROM public.session_booking_requests WHERE user_id = p_user_id;
  DELETE FROM public.agreement_acceptances WHERE user_id = p_user_id;
  DELETE FROM public.agreement_audit_events WHERE user_id = p_user_id;
  DELETE FROM public.accepted_documents WHERE user_id = p_user_id;
  DELETE FROM public.agreement_invitations WHERE user_id = p_user_id;
  DELETE FROM public.agreement_instances WHERE user_id = p_user_id;
  DELETE FROM public.agreement_revisions WHERE user_id = p_user_id;
  DELETE FROM public.agreement_template_versions WHERE user_id = p_user_id;
  DELETE FROM public.agreement_templates WHERE user_id = p_user_id;
  DELETE FROM public.income_session_allocations WHERE user_id = p_user_id;
  DELETE FROM public.income_audit WHERE user_id = p_user_id;
  DELETE FROM public.payment_corrections WHERE user_id = p_user_id;
  DELETE FROM public.expected_payments WHERE user_id = p_user_id;
  DELETE FROM public.group_session_payments WHERE user_id = p_user_id;
  DELETE FROM public.group_attendance WHERE user_id = p_user_id;
  DELETE FROM public.group_sessions WHERE user_id = p_user_id;
  DELETE FROM public.group_members WHERE user_id = p_user_id;
  DELETE FROM public.groups WHERE user_id = p_user_id;
  DELETE FROM public.invoices WHERE user_id = p_user_id;
  DELETE FROM public.income WHERE user_id = p_user_id;
  DELETE FROM public.expenses WHERE user_id = p_user_id;
  DELETE FROM public.client_credits WHERE user_id = p_user_id;
  DELETE FROM public.client_price_changes WHERE user_id = p_user_id;
  DELETE FROM public.client_status_audit WHERE user_id = p_user_id;
  DELETE FROM public.client_language_audit WHERE user_id = p_user_id;
  DELETE FROM public.client_attachments WHERE user_id = p_user_id;
  DELETE FROM public.supervisions WHERE user_id = p_user_id;
  DELETE FROM public.session_notes WHERE user_id = p_user_id;
  DELETE FROM public.client_notes_raw WHERE user_id = p_user_id;
  DELETE FROM public.recurring_rules WHERE user_id = p_user_id;
  DELETE FROM public.appointments WHERE user_id = p_user_id;
  DELETE FROM public.clients WHERE user_id = p_user_id;
  DELETE FROM public.booking_availability WHERE user_id = p_user_id;
  DELETE FROM public.booking_links WHERE user_id = p_user_id;
  DELETE FROM public.days_off WHERE user_id = p_user_id;
  DELETE FROM public.working_schedule WHERE user_id = p_user_id;
  DELETE FROM public.services WHERE user_id = p_user_id;
  DELETE FROM public.payment_methods WHERE user_id = p_user_id;
  DELETE FROM public.tax_settings WHERE user_id = p_user_id;
  DELETE FROM public.breakeven_goals WHERE user_id = p_user_id;
  DELETE FROM public.telegram_send_log WHERE user_id = p_user_id;
  DELETE FROM public.user_activity_events WHERE user_id = p_user_id;
  DELETE FROM public.data_access_audit WHERE user_id = p_user_id;
  DELETE FROM public.demo_workspace_audit WHERE user_id = p_user_id;
  DELETE FROM public.gdpr_deletion_requests WHERE user_id = p_user_id;
  DELETE FROM public.subscription_cache WHERE user_id = p_user_id;
  DELETE FROM public.subscriptions WHERE user_id = p_user_id;
  DELETE FROM public.user_plan_history WHERE user_id = p_user_id;
  DELETE FROM public.entitlements WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.user_lifecycle WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE user_id = p_user_id;

  -- public.user_lifecycle_audit is intentionally preserved (minimal admin audit).

  RETURN jsonb_build_object('ok', true, 'user_id', p_user_id, 'deleted_counts', v_counts);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user_and_data(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_and_data(uuid, uuid) TO service_role;