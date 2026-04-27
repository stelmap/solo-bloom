CREATE OR REPLACE FUNCTION public.seed_demo_workspace(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_role text := auth.role();
  v_batch uuid := gen_random_uuid();
  v_seed text := 'hogwarts_demo_v1';
  v_monday date := (CURRENT_DATE - ((EXTRACT(ISODOW FROM CURRENT_DATE)::int - 1) * interval '1 day'))::date;

  v_svc_individual uuid;
  v_svc_group uuid;

  v_harry uuid;
  v_hermione uuid;
  v_ron uuid;
  v_hogwarts uuid;
  v_gryffindor uuid;
  v_apt uuid;
  v_gs uuid;
BEGIN
  IF v_role <> 'service_role' AND (v_caller IS NULL OR v_caller <> p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF public.user_has_demo_data(p_user_id) THEN
    RETURN jsonb_build_object('status', 'already_seeded');
  END IF;

  INSERT INTO public.services (user_id, name, price, duration_minutes, is_demo, seed_source, seed_batch_id)
  VALUES
    (p_user_id, 'Individual Therapy Session', 50, 50, true, v_seed, v_batch)
  RETURNING id INTO v_svc_individual;

  INSERT INTO public.services (user_id, name, price, duration_minutes, is_demo, seed_source, seed_batch_id)
  VALUES
    (p_user_id, 'Group Therapy Session', 50, 90, true, v_seed, v_batch)
  RETURNING id INTO v_svc_group;

  INSERT INTO public.clients (user_id, name, email, phone, base_price, pricing_mode, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Harry Potter', 'harry.demo@example.com', '+44 7000 010001', 50, 'fixed', 'Demo client for individual therapy sessions.', true, v_seed, v_batch)
  RETURNING id INTO v_harry;

  INSERT INTO public.clients (user_id, name, email, phone, base_price, pricing_mode, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Hermione Granger', 'hermione.demo@example.com', '+44 7000 010002', 50, 'fixed', 'Demo client with regular planned sessions.', true, v_seed, v_batch)
  RETURNING id INTO v_hermione;

  INSERT INTO public.clients (user_id, name, email, phone, base_price, pricing_mode, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Ron Weasley', 'ron.demo@example.com', '+44 7000 010003', 50, 'fixed', 'Demo client with mixed attendance history.', true, v_seed, v_batch)
  RETURNING id INTO v_ron;

  INSERT INTO public.groups (user_id, name, description, status, bill_present, bill_absent, bill_skipped, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Hogwarts Support Group', 'Demo active group for support sessions.', 'active', true, true, false, true, v_seed, v_batch)
  RETURNING id INTO v_hogwarts;

  INSERT INTO public.group_members (user_id, group_id, client_id, price_per_session, is_demo, seed_source, seed_batch_id)
  VALUES
    (p_user_id, v_hogwarts, v_harry, 50, true, v_seed, v_batch),
    (p_user_id, v_hogwarts, v_hermione, 50, true, v_seed, v_batch),
    (p_user_id, v_hogwarts, v_ron, 50, true, v_seed, v_batch);

  INSERT INTO public.groups (user_id, name, description, status, bill_present, bill_absent, bill_skipped, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Gryffindor Reflection Group', 'Demo reflection group with recurring members.', 'active', true, false, false, true, v_seed, v_batch)
  RETURNING id INTO v_gryffindor;

  INSERT INTO public.group_members (user_id, group_id, client_id, price_per_session, is_demo, seed_source, seed_batch_id)
  VALUES
    (p_user_id, v_gryffindor, v_harry, 50, true, v_seed, v_batch),
    (p_user_id, v_gryffindor, v_hermione, 50, true, v_seed, v_batch);

  -- 1. Monday 09:00 — completed paid individual
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_harry, v_svc_individual, v_monday::timestamp + interval '9 hours', 50, 50, 'completed', 'paid_now', 'Demo completed paid individual session.', true, v_seed, v_batch)
  RETURNING id INTO v_apt;
  INSERT INTO public.income (user_id, client_id, appointment_id, amount, date, payment_method, source, description, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_harry, v_apt, 50, v_monday, 'cash', 'session', 'Harry Potter — Individual Therapy Session', true, v_seed, v_batch);

  -- 2. Monday 14:00 — completed group, Ron missed and unpaid but billable
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_harry, v_svc_group, v_monday::timestamp + interval '14 hours', 90, 50, 'completed', 'paid_now', 'Hogwarts Support Group demo session.', true, v_seed, v_batch)
  RETURNING id INTO v_apt;
  INSERT INTO public.group_sessions (user_id, group_id, appointment_id, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_hogwarts, v_apt, 'Completed group demo session.', true, v_seed, v_batch)
  RETURNING id INTO v_gs;
  UPDATE public.appointments SET group_session_id = v_gs WHERE id = v_apt;
  INSERT INTO public.group_attendance (user_id, group_session_id, client_id, status, is_demo, seed_source, seed_batch_id)
  VALUES
    (p_user_id, v_gs, v_harry, 'attended', true, v_seed, v_batch),
    (p_user_id, v_gs, v_hermione, 'attended', true, v_seed, v_batch),
    (p_user_id, v_gs, v_ron, 'absent', true, v_seed, v_batch);
  INSERT INTO public.income (user_id, client_id, appointment_id, amount, date, payment_method, source, description, is_demo, seed_source, seed_batch_id)
  VALUES
    (p_user_id, v_harry, v_apt, 50, v_monday, 'card', 'group_session', 'Hogwarts Support Group — Harry Potter', true, v_seed, v_batch),
    (p_user_id, v_hermione, v_apt, 50, v_monday, 'card', 'group_session', 'Hogwarts Support Group — Hermione Granger', true, v_seed, v_batch);
  INSERT INTO public.expected_payments (user_id, client_id, appointment_id, amount, status, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_ron, v_apt, 50, 'pending', true, v_seed, v_batch);

  -- 3. Tuesday 10:00 — completed unpaid individual
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_hermione, v_svc_individual, (v_monday + 1)::timestamp + interval '10 hours', 50, 50, 'completed', 'waiting_for_payment', 'Demo completed unpaid individual session.', true, v_seed, v_batch)
  RETURNING id INTO v_apt;
  INSERT INTO public.expected_payments (user_id, client_id, appointment_id, amount, status, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_hermione, v_apt, 50, 'pending', true, v_seed, v_batch);

  -- 4. Tuesday 16:00 — cancelled individual
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, cancellation_reason, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_ron, v_svc_individual, (v_monday + 1)::timestamp + interval '16 hours', 50, 50, 'cancelled', 'unpaid', 'Cancelled by client', 'Demo cancelled session.', true, v_seed, v_batch);

  -- 5. Wednesday 11:00 — completed paid group
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_harry, v_svc_group, (v_monday + 2)::timestamp + interval '11 hours', 90, 50, 'completed', 'paid_now', 'Gryffindor Reflection Group demo session.', true, v_seed, v_batch)
  RETURNING id INTO v_apt;
  INSERT INTO public.group_sessions (user_id, group_id, appointment_id, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_gryffindor, v_apt, 'Completed reflection group demo session.', true, v_seed, v_batch)
  RETURNING id INTO v_gs;
  UPDATE public.appointments SET group_session_id = v_gs WHERE id = v_apt;
  INSERT INTO public.group_attendance (user_id, group_session_id, client_id, status, is_demo, seed_source, seed_batch_id)
  VALUES
    (p_user_id, v_gs, v_harry, 'attended', true, v_seed, v_batch),
    (p_user_id, v_gs, v_hermione, 'attended', true, v_seed, v_batch);
  INSERT INTO public.income (user_id, client_id, appointment_id, amount, date, payment_method, source, description, is_demo, seed_source, seed_batch_id)
  VALUES
    (p_user_id, v_harry, v_apt, 50, v_monday + 2, 'bank_transfer', 'group_session', 'Gryffindor Reflection Group — Harry Potter', true, v_seed, v_batch),
    (p_user_id, v_hermione, v_apt, 50, v_monday + 2, 'bank_transfer', 'group_session', 'Gryffindor Reflection Group — Hermione Granger', true, v_seed, v_batch);

  -- 6. Wednesday 15:00 — no-show unpaid individual
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_harry, v_svc_individual, (v_monday + 2)::timestamp + interval '15 hours', 50, 50, 'no_show', 'waiting_for_payment', 'Demo no-show session.', true, v_seed, v_batch)
  RETURNING id INTO v_apt;
  INSERT INTO public.expected_payments (user_id, client_id, appointment_id, amount, status, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_harry, v_apt, 50, 'pending', true, v_seed, v_batch);

  -- 7. Thursday 09:30 — planned individual
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_hermione, v_svc_individual, (v_monday + 3)::timestamp + interval '9 hours 30 minutes', 50, 50, 'scheduled', 'unpaid', 'Demo planned individual session.', true, v_seed, v_batch);

  -- 8. Friday 12:00 — planned group
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_harry, v_svc_group, (v_monday + 4)::timestamp + interval '12 hours', 90, 50, 'scheduled', 'unpaid', 'Planned Hogwarts Support Group demo session.', true, v_seed, v_batch)
  RETURNING id INTO v_apt;
  INSERT INTO public.group_sessions (user_id, group_id, appointment_id, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_hogwarts, v_apt, 'Planned group demo session.', true, v_seed, v_batch)
  RETURNING id INTO v_gs;
  UPDATE public.appointments SET group_session_id = v_gs WHERE id = v_apt;

  -- 9. Saturday 10:00 — completed paid individual
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_ron, v_svc_individual, (v_monday + 5)::timestamp + interval '10 hours', 50, 50, 'completed', 'paid_now', 'Demo completed paid individual session.', true, v_seed, v_batch)
  RETURNING id INTO v_apt;
  INSERT INTO public.income (user_id, client_id, appointment_id, amount, date, payment_method, source, description, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_ron, v_apt, 50, v_monday + 5, 'cash', 'session', 'Ron Weasley — Individual Therapy Session', true, v_seed, v_batch);

  -- 10. Sunday 18:00 — planned individual
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_harry, v_svc_individual, (v_monday + 6)::timestamp + interval '18 hours', 50, 50, 'scheduled', 'unpaid', 'Demo planned individual session.', true, v_seed, v_batch);

  INSERT INTO public.expenses (user_id, category, amount, date, description, payment_status, is_demo, seed_source, seed_batch_id)
  VALUES
    (p_user_id, 'rent', 300, v_monday, 'Demo office room rent', 'paid', true, v_seed, v_batch),
    (p_user_id, 'software', 45, v_monday + 1, 'Demo practice software', 'paid', true, v_seed, v_batch),
    (p_user_id, 'supervision', 80, v_monday + 2, 'Demo supervision expense', 'paid', true, v_seed, v_batch);

  INSERT INTO public.supervisions (user_id, client_id, supervision_date, paid_amount, supervisor_feedback, next_steps, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_harry, v_monday + 2, 80, 'Demo supervision note for a complex case.', 'Review intervention plan next week.', true, v_seed, v_batch);

  INSERT INTO public.breakeven_goals (user_id, label, description, goal_type, fixed_expenses, buffer, desired_income, goal_number, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Demo monthly target', 'Covers basic practice costs for the demo workspace.', 'monthly', 425, 100, 1200, 1, true, v_seed, v_batch);

  INSERT INTO public.demo_workspace_audit (user_id, action, seed_batch_id, details)
  VALUES (p_user_id, 'seeded', v_batch, jsonb_build_object('seed_source', v_seed, 'workspaceMode', 'demo'));

  RETURN jsonb_build_object('status', 'seeded', 'seed_batch_id', v_batch, 'workspaceMode', 'demo');
END;
$function$;