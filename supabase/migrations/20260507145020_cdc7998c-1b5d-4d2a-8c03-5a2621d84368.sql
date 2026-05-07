CREATE OR REPLACE FUNCTION public.cleanup_demo_workspace(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_role text := auth.role();
  v_deleted jsonb := '{}'::jsonb;
  v_count int;
BEGIN
  -- Authorization: must be service role or the user themselves
  IF v_role <> 'service_role' AND (v_caller IS NULL OR v_caller <> p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- ============================================================
  -- 1) Delete dependent records that reference demo parents.
  --    These tables don't have an is_demo flag of their own, but
  --    if their parent (client/appointment/income/etc.) is demo,
  --    the dependent row is logically demo too and would otherwise
  --    become a broken reference after the parent is deleted.
  --    Each statement is restricted by user_id to never touch
  --    other users' data.
  -- ============================================================

  -- invoices reference clients & appointments
  DELETE FROM public.invoices i
  WHERE i.user_id = p_user_id
    AND (
      EXISTS (SELECT 1 FROM public.clients c WHERE c.id = i.client_id AND c.is_demo = true)
      OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = i.appointment_id AND a.is_demo = true)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('invoices', v_count);

  -- payment_corrections reference appointments
  DELETE FROM public.payment_corrections pc
  WHERE pc.user_id = p_user_id
    AND EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = pc.appointment_id AND a.is_demo = true);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('payment_corrections', v_count);

  -- session_confirmations reference appointments
  DELETE FROM public.session_confirmations sc
  WHERE EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = sc.appointment_id AND a.user_id = p_user_id AND a.is_demo = true
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('session_confirmations', v_count);

  -- telegram_send_log references clients and appointments
  DELETE FROM public.telegram_send_log tl
  WHERE tl.user_id = p_user_id
    AND (
      EXISTS (SELECT 1 FROM public.clients c WHERE c.id = tl.client_id AND c.is_demo = true)
      OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = tl.appointment_id AND a.is_demo = true)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('telegram_send_log', v_count);

  -- income_session_allocations reference income & appointments
  DELETE FROM public.income_session_allocations isa
  WHERE isa.user_id = p_user_id
    AND (
      EXISTS (SELECT 1 FROM public.income i WHERE i.id = isa.income_id AND i.is_demo = true)
      OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = isa.appointment_id AND a.is_demo = true)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('income_session_allocations', v_count);

  -- income_audit references income
  DELETE FROM public.income_audit ia
  WHERE ia.user_id = p_user_id
    AND EXISTS (SELECT 1 FROM public.income i WHERE i.id = ia.income_id AND i.is_demo = true);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('income_audit', v_count);

  -- group_session_payments reference groups, group_sessions, expected_payments, income
  DELETE FROM public.group_session_payments gsp
  WHERE gsp.user_id = p_user_id
    AND (
      EXISTS (SELECT 1 FROM public.groups g WHERE g.id = gsp.group_id AND g.is_demo = true)
      OR EXISTS (SELECT 1 FROM public.group_sessions gs WHERE gs.id = gsp.group_session_id AND gs.is_demo = true)
      OR EXISTS (SELECT 1 FROM public.clients c WHERE c.id = gsp.client_id AND c.is_demo = true)
      OR EXISTS (SELECT 1 FROM public.income i WHERE i.id = gsp.income_id AND i.is_demo = true)
      OR EXISTS (SELECT 1 FROM public.expected_payments ep WHERE ep.id = gsp.expected_payment_id AND ep.is_demo = true)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('group_session_payments', v_count);

  -- client_credits reference clients & income
  DELETE FROM public.client_credits cc
  WHERE cc.user_id = p_user_id
    AND (
      EXISTS (SELECT 1 FROM public.clients c WHERE c.id = cc.client_id AND c.is_demo = true)
      OR EXISTS (SELECT 1 FROM public.income i WHERE i.id = cc.income_id AND i.is_demo = true)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('client_credits', v_count);

  -- client_attachments reference clients & appointments
  DELETE FROM public.client_attachments ca
  WHERE ca.user_id = p_user_id
    AND (
      EXISTS (SELECT 1 FROM public.clients c WHERE c.id = ca.client_id AND c.is_demo = true)
      OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = ca.appointment_id AND a.is_demo = true)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('client_attachments', v_count);

  -- client_price_changes reference clients & appointments
  DELETE FROM public.client_price_changes cpc
  WHERE cpc.user_id = p_user_id
    AND (
      EXISTS (SELECT 1 FROM public.clients c WHERE c.id = cpc.client_id AND c.is_demo = true)
      OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = cpc.appointment_id AND a.is_demo = true)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('client_price_changes', v_count);

  -- client_status_audit references clients
  DELETE FROM public.client_status_audit csa
  WHERE csa.user_id = p_user_id
    AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = csa.client_id AND c.is_demo = true);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('client_status_audit', v_count);

  -- recurring_rules reference clients & services
  DELETE FROM public.recurring_rules rr
  WHERE rr.user_id = p_user_id
    AND (
      EXISTS (SELECT 1 FROM public.clients c WHERE c.id = rr.client_id AND c.is_demo = true)
      OR EXISTS (SELECT 1 FROM public.services s WHERE s.id = rr.service_id AND s.is_demo = true)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('recurring_rules', v_count);

  -- ============================================================
  -- 2) Delete demo records in dependency-safe order.
  -- ============================================================

  DELETE FROM public.expected_payments WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('expected_payments', v_count);

  DELETE FROM public.client_notes WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('client_notes', v_count);

  DELETE FROM public.supervisions WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('supervisions', v_count);

  DELETE FROM public.income WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('income', v_count);

  DELETE FROM public.expenses WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('expenses', v_count);

  DELETE FROM public.group_attendance WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('group_attendance', v_count);

  DELETE FROM public.group_sessions WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('group_sessions', v_count);

  DELETE FROM public.appointments WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('appointments', v_count);

  DELETE FROM public.group_members WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('group_members', v_count);

  DELETE FROM public.groups WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('groups', v_count);

  DELETE FROM public.clients WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('clients', v_count);

  DELETE FROM public.breakeven_goals WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('breakeven_goals', v_count);

  DELETE FROM public.services WHERE user_id = p_user_id AND is_demo = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('services', v_count);

  INSERT INTO public.demo_workspace_audit (user_id, action, details)
  VALUES (p_user_id, 'cleaned', v_deleted);

  RETURN jsonb_build_object('status', 'ok', 'deleted', v_deleted);
EXCEPTION WHEN OTHERS THEN
  -- The whole function runs in a single transaction (PL/pgSQL block);
  -- raising re-throws so the client sees a clear error and Postgres
  -- rolls back any partial changes from this invocation.
  INSERT INTO public.demo_workspace_audit (user_id, action, details)
  VALUES (
    p_user_id,
    'cleanup_failed',
    jsonb_build_object('error', SQLERRM, 'partial', v_deleted)
  );
  RAISE;
END;
$$;