CREATE OR REPLACE FUNCTION public.seed_demo_workspace(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_role text := auth.role();
  v_batch uuid := gen_random_uuid();
  v_seed text := 'source_o_gilevich_demo_v3';
  v_source_email text := 'o.gilevich@gmail.com';
  v_source_user_id uuid;
  v_existing_v3 boolean;
  v_rec record;
  v_new_id uuid;
  v_clients int := 0;
  v_services int := 0;
  v_groups int := 0;
  v_group_members int := 0;
  v_appointments int := 0;
  v_income int := 0;
  v_expected_payments int := 0;
  v_expenses int := 0;
  v_breakeven_goals int := 0;
  v_group_sessions int := 0;
  v_group_attendance int := 0;
  v_client_notes int := 0;
  v_supervisions int := 0;
BEGIN
  IF v_role <> 'service_role' AND (v_caller IS NULL OR v_caller <> p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT id INTO v_source_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_source_email)
  LIMIT 1;

  IF v_source_user_id IS NULL THEN
    RAISE EXCEPTION 'Demo source account not found: %', v_source_email;
  END IF;

  IF v_source_user_id = p_user_id THEN
    RETURN jsonb_build_object('status', 'skipped_source_account', 'seed_source', v_seed, 'workspaceMode', 'source');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.demo_workspace_audit
    WHERE user_id = p_user_id
      AND action = 'seeded'
      AND details->>'seed_source' = v_seed
  ) INTO v_existing_v3;

  IF v_existing_v3 AND public.user_has_demo_data(p_user_id) THEN
    RETURN jsonb_build_object('status', 'already_seeded', 'seed_source', v_seed, 'workspaceMode', 'demo');
  END IF;

  IF public.user_has_demo_data(p_user_id) THEN
    PERFORM public.cleanup_demo_workspace(p_user_id);
  END IF;

  CREATE TEMP TABLE tmp_demo_service_map (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;
  CREATE TEMP TABLE tmp_demo_client_map (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;
  CREATE TEMP TABLE tmp_demo_group_map (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;
  CREATE TEMP TABLE tmp_demo_appointment_map (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;
  CREATE TEMP TABLE tmp_demo_expense_map (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;
  CREATE TEMP TABLE tmp_demo_group_session_map (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;
  CREATE TEMP TABLE tmp_demo_supervision_map (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;

  FOR v_rec IN SELECT * FROM public.services WHERE user_id = v_source_user_id ORDER BY created_at, id LOOP
    INSERT INTO public.services (user_id, name, price, duration_minutes, is_demo, seed_source, seed_batch_id)
    VALUES (p_user_id, v_rec.name, v_rec.price, v_rec.duration_minutes, true, v_seed, v_batch)
    RETURNING id INTO v_new_id;
    INSERT INTO tmp_demo_service_map VALUES (v_rec.id, v_new_id);
    v_services := v_services + 1;
  END LOOP;

  FOR v_rec IN SELECT * FROM public.clients WHERE user_id = v_source_user_id ORDER BY created_at, id LOOP
    INSERT INTO public.clients (
      user_id, name, email, phone, notes, base_price, pricing_mode,
      confirmation_required, notification_preference, telegram,
      billing_company_name, billing_tax_id, billing_country, billing_address,
      is_demo, seed_source, seed_batch_id
    ) VALUES (
      p_user_id, v_rec.name, v_rec.email, v_rec.phone, v_rec.notes, v_rec.base_price, v_rec.pricing_mode,
      v_rec.confirmation_required, v_rec.notification_preference, v_rec.telegram,
      v_rec.billing_company_name, v_rec.billing_tax_id, v_rec.billing_country, v_rec.billing_address,
      true, v_seed, v_batch
    ) RETURNING id INTO v_new_id;
    INSERT INTO tmp_demo_client_map VALUES (v_rec.id, v_new_id);
    v_clients := v_clients + 1;
  END LOOP;

  FOR v_rec IN SELECT * FROM public.groups WHERE user_id = v_source_user_id ORDER BY created_at, id LOOP
    INSERT INTO public.groups (user_id, name, description, status, bill_present, bill_absent, bill_skipped, is_demo, seed_source, seed_batch_id)
    VALUES (p_user_id, v_rec.name, v_rec.description, v_rec.status, v_rec.bill_present, v_rec.bill_absent, v_rec.bill_skipped, true, v_seed, v_batch)
    RETURNING id INTO v_new_id;
    INSERT INTO tmp_demo_group_map VALUES (v_rec.id, v_new_id);
    v_groups := v_groups + 1;
  END LOOP;

  FOR v_rec IN
    SELECT gm.*, gm_map.new_id AS new_group_id, cm.new_id AS new_client_id
    FROM public.group_members gm
    JOIN tmp_demo_group_map gm_map ON gm_map.old_id = gm.group_id
    JOIN tmp_demo_client_map cm ON cm.old_id = gm.client_id
    WHERE gm.user_id = v_source_user_id
    ORDER BY gm.created_at, gm.id
  LOOP
    INSERT INTO public.group_members (user_id, group_id, client_id, price_per_session, is_demo, seed_source, seed_batch_id)
    VALUES (p_user_id, v_rec.new_group_id, v_rec.new_client_id, v_rec.price_per_session, true, v_seed, v_batch);
    v_group_members := v_group_members + 1;
  END LOOP;

  FOR v_rec IN
    SELECT a.*, cm.new_id AS new_client_id, sm.new_id AS new_service_id
    FROM public.appointments a
    JOIN tmp_demo_client_map cm ON cm.old_id = a.client_id
    JOIN tmp_demo_service_map sm ON sm.old_id = a.service_id
    WHERE a.user_id = v_source_user_id
    ORDER BY a.scheduled_at, a.created_at, a.id
  LOOP
    INSERT INTO public.appointments (
      user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, notes,
      payment_status, cancellation_reason, confirmation_timestamp, confirmation_status,
      price_override_reason, is_demo, seed_source, seed_batch_id
    ) VALUES (
      p_user_id, v_rec.new_client_id, v_rec.new_service_id, v_rec.scheduled_at, v_rec.duration_minutes, v_rec.price, v_rec.status, v_rec.notes,
      v_rec.payment_status, v_rec.cancellation_reason, v_rec.confirmation_timestamp, v_rec.confirmation_status,
      v_rec.price_override_reason, true, v_seed, v_batch
    ) RETURNING id INTO v_new_id;
    INSERT INTO tmp_demo_appointment_map VALUES (v_rec.id, v_new_id);
    v_appointments := v_appointments + 1;
  END LOOP;

  FOR v_rec IN
    SELECT i.*, cm.new_id AS new_client_id, am.new_id AS new_appointment_id
    FROM public.income i
    LEFT JOIN tmp_demo_client_map cm ON cm.old_id = i.client_id
    LEFT JOIN tmp_demo_appointment_map am ON am.old_id = i.appointment_id
    WHERE i.user_id = v_source_user_id
      AND (i.client_id IS NULL OR cm.new_id IS NOT NULL)
      AND (i.appointment_id IS NULL OR am.new_id IS NOT NULL)
    ORDER BY i.date, i.created_at, i.id
  LOOP
    INSERT INTO public.income (user_id, client_id, appointment_id, amount, date, payment_method, source, description, is_demo, seed_source, seed_batch_id)
    VALUES (p_user_id, v_rec.new_client_id, v_rec.new_appointment_id, v_rec.amount, v_rec.date, v_rec.payment_method, v_rec.source, v_rec.description, true, v_seed, v_batch);
    v_income := v_income + 1;
  END LOOP;

  FOR v_rec IN
    SELECT ep.*, cm.new_id AS new_client_id, am.new_id AS new_appointment_id
    FROM public.expected_payments ep
    JOIN tmp_demo_client_map cm ON cm.old_id = ep.client_id
    JOIN tmp_demo_appointment_map am ON am.old_id = ep.appointment_id
    WHERE ep.user_id = v_source_user_id
    ORDER BY ep.created_at, ep.id
  LOOP
    INSERT INTO public.expected_payments (user_id, client_id, appointment_id, amount, status, payment_method, paid_at, is_demo, seed_source, seed_batch_id)
    VALUES (p_user_id, v_rec.new_client_id, v_rec.new_appointment_id, v_rec.amount, v_rec.status, v_rec.payment_method, v_rec.paid_at, true, v_seed, v_batch);
    v_expected_payments := v_expected_payments + 1;
  END LOOP;

  FOR v_rec IN SELECT * FROM public.expenses WHERE user_id = v_source_user_id ORDER BY date, created_at, id LOOP
    INSERT INTO public.expenses (
      user_id, category, amount, date, description, is_recurring,
      recurring_start_date, payment_status, recurring_group_id,
      is_demo, seed_source, seed_batch_id
    ) VALUES (
      p_user_id, v_rec.category, v_rec.amount, v_rec.date, v_rec.description, v_rec.is_recurring,
      v_rec.recurring_start_date, v_rec.payment_status, v_rec.recurring_group_id,
      true, v_seed, v_batch
    ) RETURNING id INTO v_new_id;
    INSERT INTO tmp_demo_expense_map VALUES (v_rec.id, v_new_id);
    v_expenses := v_expenses + 1;
  END LOOP;

  FOR v_rec IN SELECT * FROM public.breakeven_goals WHERE user_id = v_source_user_id ORDER BY goal_number, created_at, id LOOP
    INSERT INTO public.breakeven_goals (user_id, goal_number, label, description, fixed_expenses, desired_income, buffer, goal_type, is_demo, seed_source, seed_batch_id)
    VALUES (p_user_id, v_rec.goal_number, v_rec.label, v_rec.description, v_rec.fixed_expenses, v_rec.desired_income, v_rec.buffer, v_rec.goal_type, true, v_seed, v_batch);
    v_breakeven_goals := v_breakeven_goals + 1;
  END LOOP;

  FOR v_rec IN
    SELECT gs.*, gm.new_id AS new_group_id, am.new_id AS new_appointment_id
    FROM public.group_sessions gs
    JOIN tmp_demo_group_map gm ON gm.old_id = gs.group_id
    JOIN tmp_demo_appointment_map am ON am.old_id = gs.appointment_id
    WHERE gs.user_id = v_source_user_id
    ORDER BY gs.created_at, gs.id
  LOOP
    INSERT INTO public.group_sessions (user_id, group_id, appointment_id, notes, is_demo, seed_source, seed_batch_id)
    VALUES (p_user_id, v_rec.new_group_id, v_rec.new_appointment_id, v_rec.notes, true, v_seed, v_batch)
    RETURNING id INTO v_new_id;
    INSERT INTO tmp_demo_group_session_map VALUES (v_rec.id, v_new_id);
    v_group_sessions := v_group_sessions + 1;
  END LOOP;

  FOR v_rec IN
    SELECT ga.*, gsm.new_id AS new_group_session_id, cm.new_id AS new_client_id
    FROM public.group_attendance ga
    JOIN tmp_demo_group_session_map gsm ON gsm.old_id = ga.group_session_id
    JOIN tmp_demo_client_map cm ON cm.old_id = ga.client_id
    WHERE ga.user_id = v_source_user_id
    ORDER BY ga.created_at, ga.id
  LOOP
    INSERT INTO public.group_attendance (user_id, group_session_id, client_id, status, is_demo, seed_source, seed_batch_id)
    VALUES (p_user_id, v_rec.new_group_session_id, v_rec.new_client_id, v_rec.status, true, v_seed, v_batch);
    v_group_attendance := v_group_attendance + 1;
  END LOOP;

  FOR v_rec IN
    SELECT s.*, cm.new_id AS new_client_id, em.new_id AS new_expense_id
    FROM public.supervisions s
    JOIN tmp_demo_client_map cm ON cm.old_id = s.client_id
    LEFT JOIN tmp_demo_expense_map em ON em.old_id = s.expense_id
    WHERE s.user_id = v_source_user_id
      AND (s.expense_id IS NULL OR em.new_id IS NOT NULL)
    ORDER BY s.supervision_date, s.created_at, s.id
  LOOP
    INSERT INTO public.supervisions (
      user_id, client_id, supervision_date, paid_amount, expense_id,
      imported_notes_snapshot, supervision_outcome, supervisor_feedback, next_steps,
      is_demo, seed_source, seed_batch_id
    ) VALUES (
      p_user_id, v_rec.new_client_id, v_rec.supervision_date, v_rec.paid_amount, v_rec.new_expense_id,
      v_rec.imported_notes_snapshot, v_rec.supervision_outcome, v_rec.supervisor_feedback, v_rec.next_steps,
      true, v_seed, v_batch
    ) RETURNING id INTO v_new_id;
    INSERT INTO tmp_demo_supervision_map VALUES (v_rec.id, v_new_id);
    v_supervisions := v_supervisions + 1;
  END LOOP;

  FOR v_rec IN
    SELECT cn.*, cm.new_id AS new_client_id, am.new_id AS new_appointment_id, sm.new_id AS new_supervision_id
    FROM public.client_notes cn
    JOIN tmp_demo_client_map cm ON cm.old_id = cn.client_id
    LEFT JOIN tmp_demo_appointment_map am ON am.old_id = cn.appointment_id
    LEFT JOIN tmp_demo_supervision_map sm ON sm.old_id = cn.supervision_id
    WHERE cn.user_id = v_source_user_id
      AND (cn.appointment_id IS NULL OR am.new_id IS NOT NULL)
      AND (cn.supervision_id IS NULL OR sm.new_id IS NOT NULL)
    ORDER BY cn.created_at, cn.id
  LOOP
    INSERT INTO public.client_notes (
      user_id, client_id, appointment_id, supervision_id, content, included_in_supervision,
      is_demo, seed_source, seed_batch_id
    ) VALUES (
      p_user_id, v_rec.new_client_id, v_rec.new_appointment_id, v_rec.new_supervision_id, v_rec.content, v_rec.included_in_supervision,
      true, v_seed, v_batch
    );
    v_client_notes := v_client_notes + 1;
  END LOOP;

  INSERT INTO public.demo_workspace_audit (user_id, action, seed_batch_id, details)
  VALUES (
    p_user_id,
    'seeded',
    v_batch,
    jsonb_build_object(
      'seed_source', v_seed,
      'source_email', v_source_email,
      'source_user_id', v_source_user_id,
      'workspaceMode', 'demo',
      'clients', v_clients,
      'services', v_services,
      'groups', v_groups,
      'group_members', v_group_members,
      'appointments', v_appointments,
      'income', v_income,
      'expected_payments', v_expected_payments,
      'expenses', v_expenses,
      'breakeven_goals', v_breakeven_goals,
      'group_sessions', v_group_sessions,
      'group_attendance', v_group_attendance,
      'client_notes', v_client_notes,
      'supervisions', v_supervisions
    )
  );

  RETURN jsonb_build_object(
    'status', 'seeded',
    'seed_batch_id', v_batch,
    'seed_source', v_seed,
    'source_email', v_source_email,
    'workspaceMode', 'demo',
    'clients', v_clients,
    'services', v_services,
    'groups', v_groups,
    'appointments', v_appointments,
    'income', v_income,
    'expected_payments', v_expected_payments,
    'expenses', v_expenses,
    'breakeven_goals', v_breakeven_goals,
    'group_sessions', v_group_sessions,
    'group_attendance', v_group_attendance,
    'client_notes', v_client_notes,
    'supervisions', v_supervisions
  );
END;
$$;