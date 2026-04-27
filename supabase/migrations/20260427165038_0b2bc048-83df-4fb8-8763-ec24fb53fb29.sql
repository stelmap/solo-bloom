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
  v_seed text := 'harry_potter_films_demo_v2';
  v_today date := CURRENT_DATE;
  v_base_ts timestamp := CURRENT_DATE::timestamp;
  v_svc_individual uuid;
  v_svc_group uuid;
  v_svc_training uuid;
  v_group_main uuid;
  v_group_training uuid;
  v_client record;
  v_client_id uuid;
  v_apt uuid;
  v_client_index int := 0;
  v_i int;
  v_slot int := 0;
  v_paid_count int := 0;
  v_cancelled_count int := 0;
  v_unpaid_done_count int := 0;
  v_existing_v2 boolean;
BEGIN
  IF v_role <> 'service_role' AND (v_caller IS NULL OR v_caller <> p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.demo_workspace_audit
    WHERE user_id = p_user_id
      AND action = 'seeded'
      AND details->>'seed_source' = v_seed
  ) INTO v_existing_v2;

  IF v_existing_v2 AND public.user_has_demo_data(p_user_id) THEN
    RETURN jsonb_build_object('status', 'already_seeded', 'seed_source', v_seed, 'workspaceMode', 'demo');
  END IF;

  IF public.user_has_demo_data(p_user_id) THEN
    PERFORM public.cleanup_demo_workspace(p_user_id);
  END IF;

  INSERT INTO public.services (user_id, name, price, duration_minutes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Individual Session', 50, 50, true, v_seed, v_batch)
  RETURNING id INTO v_svc_individual;

  INSERT INTO public.services (user_id, name, price, duration_minutes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Group Session', 100, 90, true, v_seed, v_batch)
  RETURNING id INTO v_svc_group;

  INSERT INTO public.services (user_id, name, price, duration_minutes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Training', 20, 45, true, v_seed, v_batch)
  RETURNING id INTO v_svc_training;

  INSERT INTO public.groups (user_id, name, description, status, bill_present, bill_absent, bill_skipped, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Hogwarts Group Session', 'Demo group sessions inspired by the Harry Potter films.', 'active', true, true, false, true, v_seed, v_batch)
  RETURNING id INTO v_group_main;

  INSERT INTO public.groups (user_id, name, description, status, bill_present, bill_absent, bill_skipped, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Defence Training Circle', 'Demo training group for short practice sessions.', 'active', true, false, false, true, v_seed, v_batch)
  RETURNING id INTO v_group_training;

  FOR v_client IN
    SELECT * FROM (VALUES
      ('Harry Potter', 'harry.potter.demo@example.com', '+44 7000 010001', 'The Boy Who Lived — demo client.'),
      ('Hermione Granger', 'hermione.granger.demo@example.com', '+44 7000 010002', 'Brilliant planner with regular attendance.'),
      ('Ron Weasley', 'ron.weasley.demo@example.com', '+44 7000 010003', 'Loyal friend with mixed payment history.'),
      ('Albus Dumbledore', 'albus.dumbledore.demo@example.com', '+44 7000 010004', 'Wise mentor profile for demo reporting.'),
      ('Severus Snape', 'severus.snape.demo@example.com', '+44 7000 010005', 'Complex case with consistent completed sessions.'),
      ('Sirius Black', 'sirius.black.demo@example.com', '+44 7000 010006', 'High-engagement demo client.'),
      ('Rubeus Hagrid', 'rubeus.hagrid.demo@example.com', '+44 7000 010007', 'Warm support profile for demo sessions.'),
      ('Draco Malfoy', 'draco.malfoy.demo@example.com', '+44 7000 010008', 'Demo client with unpaid completed sessions.'),
      ('Luna Lovegood', 'luna.lovegood.demo@example.com', '+44 7000 010009', 'Creative client profile for exploration.'),
      ('Neville Longbottom', 'neville.longbottom.demo@example.com', '+44 7000 010010', 'Growth-focused demo client.')
    ) AS c(name, email, phone, notes)
  LOOP
    v_client_index := v_client_index + 1;

    INSERT INTO public.clients (user_id, name, email, phone, base_price, pricing_mode, notes, is_demo, seed_source, seed_batch_id)
    VALUES (p_user_id, v_client.name, v_client.email, v_client.phone, 50, 'fixed', v_client.notes, true, v_seed, v_batch)
    RETURNING id INTO v_client_id;

    INSERT INTO public.group_members (user_id, group_id, client_id, price_per_session, is_demo, seed_source, seed_batch_id)
    VALUES
      (p_user_id, v_group_main, v_client_id, 100, true, v_seed, v_batch),
      (p_user_id, v_group_training, v_client_id, 20, true, v_seed, v_batch);

    FOR v_i IN 1..20 LOOP
      v_slot := v_slot + 1;
      INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
      VALUES (
        p_user_id, v_client_id, v_svc_individual,
        v_base_ts + make_interval(mins => v_slot * 3),
        50, 50, 'completed', 'paid_now',
        'Demo paid individual session from the Harry Potter film workspace.',
        true, v_seed, v_batch
      ) RETURNING id INTO v_apt;

      INSERT INTO public.income (user_id, client_id, appointment_id, amount, date, payment_method, source, description, is_demo, seed_source, seed_batch_id)
      VALUES (p_user_id, v_client_id, v_apt, 50, v_today, 'card', 'appointment', v_client.name || ' — Individual Session', true, v_seed, v_batch);
      v_paid_count := v_paid_count + 1;
    END LOOP;

    FOR v_i IN 1..5 LOOP
      v_slot := v_slot + 1;
      INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, cancellation_reason, notes, is_demo, seed_source, seed_batch_id)
      VALUES (
        p_user_id, v_client_id, v_svc_training,
        v_base_ts + make_interval(mins => v_slot * 3),
        45, 20, 'cancelled', 'unpaid', 'Cancelled by client',
        'Demo cancelled training session.',
        true, v_seed, v_batch
      );
      v_cancelled_count := v_cancelled_count + 1;
    END LOOP;

    FOR v_i IN 1..20 LOOP
      v_slot := v_slot + 1;
      INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
      VALUES (
        p_user_id, v_client_id,
        CASE WHEN v_i % 2 = 0 THEN v_svc_group ELSE v_svc_training END,
        v_base_ts + make_interval(mins => v_slot * 3),
        CASE WHEN v_i % 2 = 0 THEN 90 ELSE 45 END,
        CASE WHEN v_i % 2 = 0 THEN 100 ELSE 20 END,
        'completed', 'waiting_for_payment',
        'Demo completed session awaiting payment.',
        true, v_seed, v_batch
      ) RETURNING id INTO v_apt;

      INSERT INTO public.expected_payments (user_id, client_id, appointment_id, amount, status, is_demo, seed_source, seed_batch_id)
      VALUES (
        p_user_id, v_client_id, v_apt,
        CASE WHEN v_i % 2 = 0 THEN 100 ELSE 20 END,
        'pending', true, v_seed, v_batch
      );
      v_unpaid_done_count := v_unpaid_done_count + 1;
    END LOOP;
  END LOOP;

  INSERT INTO public.expenses (user_id, category, amount, date, description, payment_status, is_demo, seed_source, seed_batch_id)
  VALUES
    (p_user_id, 'rent', 600, v_today, 'Demo office room rent', 'paid', true, v_seed, v_batch),
    (p_user_id, 'software', 120, v_today, 'Demo practice software', 'paid', true, v_seed, v_batch),
    (p_user_id, 'training', 200, v_today, 'Demo professional training cost', 'paid', true, v_seed, v_batch);

  INSERT INTO public.breakeven_goals (user_id, label, description, goal_type, fixed_expenses, buffer, desired_income, goal_number, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Demo monthly target', 'Harry Potter film demo workspace target.', 'monthly', 920, 300, 4500, 1, true, v_seed, v_batch);

  INSERT INTO public.demo_workspace_audit (user_id, action, seed_batch_id, details)
  VALUES (
    p_user_id,
    'seeded',
    v_batch,
    jsonb_build_object(
      'seed_source', v_seed,
      'workspaceMode', 'demo',
      'clients', v_client_index,
      'paid_completed_sessions', v_paid_count,
      'cancelled_sessions', v_cancelled_count,
      'completed_unpaid_sessions', v_unpaid_done_count,
      'individual_session_price', 50,
      'group_session_price', 100,
      'training_price', 20
    )
  );

  RETURN jsonb_build_object(
    'status', 'seeded',
    'seed_batch_id', v_batch,
    'seed_source', v_seed,
    'workspaceMode', 'demo',
    'clients', v_client_index,
    'paid_completed_sessions', v_paid_count,
    'cancelled_sessions', v_cancelled_count,
    'completed_unpaid_sessions', v_unpaid_done_count
  );
END;
$function$;