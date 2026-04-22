
-- ============================================================
-- 1) Add demo flags to all demo-able tables
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_source text,
  ADD COLUMN IF NOT EXISTS seed_batch_id uuid;

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_source text,
  ADD COLUMN IF NOT EXISTS seed_batch_id uuid;

ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_source text,
  ADD COLUMN IF NOT EXISTS seed_batch_id uuid;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_source text,
  ADD COLUMN IF NOT EXISTS seed_batch_id uuid;

ALTER TABLE public.group_sessions
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_source text,
  ADD COLUMN IF NOT EXISTS seed_batch_id uuid;

ALTER TABLE public.group_attendance
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_source text,
  ADD COLUMN IF NOT EXISTS seed_batch_id uuid;

ALTER TABLE public.client_notes
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_source text,
  ADD COLUMN IF NOT EXISTS seed_batch_id uuid;

ALTER TABLE public.income
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_source text,
  ADD COLUMN IF NOT EXISTS seed_batch_id uuid;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_source text,
  ADD COLUMN IF NOT EXISTS seed_batch_id uuid;

ALTER TABLE public.breakeven_goals
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_source text,
  ADD COLUMN IF NOT EXISTS seed_batch_id uuid;

ALTER TABLE public.supervisions
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_source text,
  ADD COLUMN IF NOT EXISTS seed_batch_id uuid;

ALTER TABLE public.expected_payments
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_source text,
  ADD COLUMN IF NOT EXISTS seed_batch_id uuid;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_source text,
  ADD COLUMN IF NOT EXISTS seed_batch_id uuid;

-- Helpful indexes for cleanup queries
CREATE INDEX IF NOT EXISTS idx_clients_user_demo ON public.clients(user_id) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_appointments_user_demo ON public.appointments(user_id) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_income_user_demo ON public.income(user_id) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_expenses_user_demo ON public.expenses(user_id) WHERE is_demo = true;

-- ============================================================
-- 2) Audit log for demo operations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.demo_workspace_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL, -- 'seeded' | 'cleaned'
  seed_batch_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_workspace_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own demo audit"
  ON public.demo_workspace_audit FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages demo audit"
  ON public.demo_workspace_audit FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 3) Helper: does the calling user have demo data?
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_has_demo_data(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.clients WHERE user_id = p_user_id AND is_demo = true)
      OR EXISTS (SELECT 1 FROM public.appointments WHERE user_id = p_user_id AND is_demo = true)
      OR EXISTS (SELECT 1 FROM public.income WHERE user_id = p_user_id AND is_demo = true)
      OR EXISTS (SELECT 1 FROM public.expenses WHERE user_id = p_user_id AND is_demo = true);
$$;

-- ============================================================
-- 4) Cleanup function: delete only this user's demo records
--    Idempotent. Service-role or self callable.
-- ============================================================

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

  -- Delete in dependency-safe order. Each delete is scoped to user_id AND is_demo = true.

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
END;
$$;

-- ============================================================
-- 5) Seed function: insert curated demo dataset for a user
--    Idempotent: skips if user already has demo data.
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_demo_workspace(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_role text := auth.role();
  v_batch uuid := gen_random_uuid();
  v_seed text := 'curated_v1';
  v_today date := CURRENT_DATE;

  v_svc_individual uuid;
  v_svc_couple uuid;
  v_svc_group uuid;

  v_c1 uuid; v_c2 uuid; v_c3 uuid; v_c4 uuid; v_c5 uuid; v_c6 uuid; v_c7 uuid;
  v_g1 uuid;
  v_apt uuid;
  v_gs uuid;
  i int;
BEGIN
  -- Authorization
  IF v_role <> 'service_role' AND (v_caller IS NULL OR v_caller <> p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Idempotency: skip if user already has demo data
  IF public.user_has_demo_data(p_user_id) THEN
    RETURN jsonb_build_object('status', 'already_seeded');
  END IF;

  -- ---------------- Services ----------------
  INSERT INTO public.services (user_id, name, price, duration_minutes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Individual session', 60, 60, true, v_seed, v_batch)
  RETURNING id INTO v_svc_individual;

  INSERT INTO public.services (user_id, name, price, duration_minutes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Couple session', 90, 90, true, v_seed, v_batch)
  RETURNING id INTO v_svc_couple;

  INSERT INTO public.services (user_id, name, price, duration_minutes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Group session', 30, 90, true, v_seed, v_batch)
  RETURNING id INTO v_svc_group;

  -- ---------------- Clients ----------------
  INSERT INTO public.clients (user_id, name, email, phone, base_price, pricing_mode, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Anna Müller', 'anna.demo@example.com', '+49 170 1111111', 60, 'fixed', 'Recurring weekly client', true, v_seed, v_batch)
  RETURNING id INTO v_c1;

  INSERT INTO public.clients (user_id, name, email, phone, base_price, pricing_mode, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Marco Rossi', 'marco.demo@example.com', '+39 320 2222222', 60, 'fixed', 'Started 3 months ago', true, v_seed, v_batch)
  RETURNING id INTO v_c2;

  INSERT INTO public.clients (user_id, name, email, phone, base_price, pricing_mode, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Sophie Laurent', 'sophie.demo@example.com', '+33 612 333333', 70, 'fixed', 'Prefers evening sessions', true, v_seed, v_batch)
  RETURNING id INTO v_c3;

  INSERT INTO public.clients (user_id, name, email, phone, base_price, pricing_mode, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'James Carter', 'james.demo@example.com', '+44 7700 444444', 60, 'fixed', 'Anxiety focus', true, v_seed, v_batch)
  RETURNING id INTO v_c4;

  INSERT INTO public.clients (user_id, name, email, phone, base_price, pricing_mode, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Olena Petrova', 'olena.demo@example.com', '+380 67 5555555', 55, 'fixed', 'Bi-weekly', true, v_seed, v_batch)
  RETURNING id INTO v_c5;

  INSERT INTO public.clients (user_id, name, email, phone, base_price, pricing_mode, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'David Kim', 'david.demo@example.com', '+1 415 6666666', 80, 'fixed', 'Couples therapy', true, v_seed, v_batch)
  RETURNING id INTO v_c6;

  INSERT INTO public.clients (user_id, name, email, phone, base_price, pricing_mode, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Lucia García', 'lucia.demo@example.com', '+34 612 777777', 60, 'fixed', 'Recently joined', true, v_seed, v_batch)
  RETURNING id INTO v_c7;

  -- ---------------- Group ----------------
  INSERT INTO public.groups (user_id, name, description, status, bill_present, bill_absent, bill_skipped, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Anxiety support group', 'Weekly group session focused on anxiety coping skills', 'active', true, false, false, true, v_seed, v_batch)
  RETURNING id INTO v_g1;

  INSERT INTO public.group_members (user_id, group_id, client_id, price_per_session, is_demo, seed_source, seed_batch_id) VALUES
    (p_user_id, v_g1, v_c1, 30, true, v_seed, v_batch),
    (p_user_id, v_g1, v_c4, 30, true, v_seed, v_batch),
    (p_user_id, v_g1, v_c5, 30, true, v_seed, v_batch),
    (p_user_id, v_g1, v_c7, 30, true, v_seed, v_batch);

  -- ---------------- Past appointments (2 weeks back) ----------------
  -- Completed + paid
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c1, v_svc_individual, (v_today - 13)::timestamp + interval '10 hours', 60, 60, 'completed', 'paid', 'Session paid in cash', true, v_seed, v_batch)
  RETURNING id INTO v_apt;
  INSERT INTO public.income (user_id, client_id, appointment_id, amount, date, payment_method, source, description, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c1, v_apt, 60, v_today - 13, 'cash', 'session', 'Anna Müller — Individual session', true, v_seed, v_batch);
  INSERT INTO public.client_notes (user_id, client_id, appointment_id, content, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c1, v_apt, 'Follow-up recommended next week', true, v_seed, v_batch);

  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c2, v_svc_individual, (v_today - 12)::timestamp + interval '14 hours', 60, 60, 'completed', 'paid', NULL, true, v_seed, v_batch)
  RETURNING id INTO v_apt;
  INSERT INTO public.income (user_id, client_id, appointment_id, amount, date, payment_method, source, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c2, v_apt, 60, v_today - 12, 'card', 'session', true, v_seed, v_batch);

  -- Cancelled
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, cancellation_reason, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c3, v_svc_individual, (v_today - 11)::timestamp + interval '11 hours', 60, 70, 'cancelled', 'unpaid', 'Client cancelled 24h before', 'Client requested reschedule', true, v_seed, v_batch);

  -- No-show
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c4, v_svc_individual, (v_today - 10)::timestamp + interval '15 hours', 60, 60, 'no_show', 'unpaid', 'Did not show up', true, v_seed, v_batch);

  -- Completed + unpaid (creates expected payment)
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c5, v_svc_individual, (v_today - 9)::timestamp + interval '09 hours', 60, 55, 'completed', 'unpaid', 'Will pay next session', true, v_seed, v_batch)
  RETURNING id INTO v_apt;
  INSERT INTO public.expected_payments (user_id, client_id, appointment_id, amount, status, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c5, v_apt, 55, 'pending', true, v_seed, v_batch);

  -- Couple session completed
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c6, v_svc_couple, (v_today - 8)::timestamp + interval '17 hours', 90, 80, 'completed', 'paid', true, v_seed, v_batch)
  RETURNING id INTO v_apt;
  INSERT INTO public.income (user_id, client_id, appointment_id, amount, date, payment_method, source, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c6, v_apt, 80, v_today - 8, 'transfer', 'session', true, v_seed, v_batch);

  -- Group session (past)
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c1, v_svc_group, (v_today - 7)::timestamp + interval '18 hours', 90, 0, 'completed', 'paid', 'Group session focused on anxiety coping', true, v_seed, v_batch)
  RETURNING id INTO v_apt;
  INSERT INTO public.group_sessions (user_id, group_id, appointment_id, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_g1, v_apt, 'Group session focused on anxiety coping', true, v_seed, v_batch)
  RETURNING id INTO v_gs;
  INSERT INTO public.group_attendance (user_id, group_session_id, client_id, status, is_demo, seed_source, seed_batch_id) VALUES
    (p_user_id, v_gs, v_c1, 'attended', true, v_seed, v_batch),
    (p_user_id, v_gs, v_c4, 'attended', true, v_seed, v_batch),
    (p_user_id, v_gs, v_c5, 'absent', true, v_seed, v_batch),
    (p_user_id, v_gs, v_c7, 'attended', true, v_seed, v_batch);
  -- Group income (3 attended × 30)
  INSERT INTO public.income (user_id, client_id, appointment_id, amount, date, payment_method, source, description, is_demo, seed_source, seed_batch_id)
  VALUES
    (p_user_id, v_c1, v_apt, 30, v_today - 7, 'cash', 'session', 'Group — Anna', true, v_seed, v_batch),
    (p_user_id, v_c4, v_apt, 30, v_today - 7, 'cash', 'session', 'Group — James', true, v_seed, v_batch),
    (p_user_id, v_c7, v_apt, 30, v_today - 7, 'card', 'session', 'Group — Lucia', true, v_seed, v_batch);

  -- Recent confirmed (yesterday)
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c2, v_svc_individual, (v_today - 1)::timestamp + interval '10 hours', 60, 60, 'completed', 'paid', true, v_seed, v_batch)
  RETURNING id INTO v_apt;
  INSERT INTO public.income (user_id, client_id, appointment_id, amount, date, payment_method, source, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c2, v_apt, 60, v_today - 1, 'card', 'session', true, v_seed, v_batch);

  -- ---------------- Future appointments (next 7 days) ----------------
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, confirmation_status, is_demo, seed_source, seed_batch_id) VALUES
    (p_user_id, v_c1, v_svc_individual, (v_today + 1)::timestamp + interval '10 hours', 60, 60, 'confirmed', 'unpaid', 'confirmed', true, v_seed, v_batch),
    (p_user_id, v_c3, v_svc_individual, (v_today + 1)::timestamp + interval '14 hours', 60, 70, 'scheduled', 'unpaid', 'not_required', true, v_seed, v_batch),
    (p_user_id, v_c4, v_svc_individual, (v_today + 2)::timestamp + interval '15 hours', 60, 60, 'scheduled', 'unpaid', 'not_required', true, v_seed, v_batch),
    (p_user_id, v_c6, v_svc_couple, (v_today + 3)::timestamp + interval '17 hours', 90, 80, 'confirmed', 'unpaid', 'confirmed', true, v_seed, v_batch),
    (p_user_id, v_c7, v_svc_individual, (v_today + 4)::timestamp + interval '11 hours', 60, 60, 'scheduled', 'unpaid', 'not_required', true, v_seed, v_batch);

  -- Future group session
  INSERT INTO public.appointments (user_id, client_id, service_id, scheduled_at, duration_minutes, price, status, payment_status, notes, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_c1, v_svc_group, (v_today + 5)::timestamp + interval '18 hours', 90, 0, 'scheduled', 'unpaid', 'Group session — anxiety coping', true, v_seed, v_batch)
  RETURNING id INTO v_apt;
  INSERT INTO public.group_sessions (user_id, group_id, appointment_id, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, v_g1, v_apt, true, v_seed, v_batch);

  -- ---------------- Expenses ----------------
  INSERT INTO public.expenses (user_id, category, amount, date, description, payment_status, is_demo, seed_source, seed_batch_id) VALUES
    (p_user_id, 'rent', 450, v_today - 10, 'Office rent', 'paid', true, v_seed, v_batch),
    (p_user_id, 'software', 25, v_today - 9, 'Practice management tool', 'paid', true, v_seed, v_batch),
    (p_user_id, 'supervision', 90, v_today - 7, 'Monthly supervision', 'paid', true, v_seed, v_batch),
    (p_user_id, 'training', 180, v_today - 5, 'CPD workshop', 'paid', true, v_seed, v_batch),
    (p_user_id, 'utilities', 60, v_today - 3, 'Electricity', 'paid', true, v_seed, v_batch),
    (p_user_id, 'marketing', 40, v_today - 2, 'Online ads', 'unpaid', true, v_seed, v_batch);

  -- ---------------- Manual income (not tied to a session) ----------------
  INSERT INTO public.income (user_id, amount, date, payment_method, source, description, is_demo, seed_source, seed_batch_id) VALUES
    (p_user_id, 120, v_today - 6, 'transfer', 'manual', 'Workshop fee', true, v_seed, v_batch),
    (p_user_id, 50, v_today - 4, 'cash', 'manual', 'Book sale', true, v_seed, v_batch);

  -- ---------------- Supervisions ----------------
  INSERT INTO public.supervisions (user_id, client_id, supervision_date, paid_amount, supervisor_feedback, next_steps, is_demo, seed_source, seed_batch_id) VALUES
    (p_user_id, v_c4, v_today - 7, 90, 'Supervision discussion on difficult case boundaries', 'Continue with current approach, monitor anxiety levels', true, v_seed, v_batch),
    (p_user_id, v_c6, v_today - 14, 90, 'Discussed couple dynamics and co-regulation strategies', 'Introduce communication exercises next session', true, v_seed, v_batch);

  -- ---------------- Break-even goal ----------------
  INSERT INTO public.breakeven_goals (user_id, label, description, goal_type, fixed_expenses, buffer, desired_income, goal_number, is_demo, seed_source, seed_batch_id)
  VALUES (p_user_id, 'Monthly target', 'Cover rent, software, and basic living', 'monthly', 800, 200, 2500, 1, true, v_seed, v_batch);

  -- Audit
  INSERT INTO public.demo_workspace_audit (user_id, action, seed_batch_id, details)
  VALUES (p_user_id, 'seeded', v_batch, jsonb_build_object('seed_source', v_seed));

  RETURN jsonb_build_object('status', 'seeded', 'seed_batch_id', v_batch);
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_demo_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_demo_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_demo_data(uuid) TO authenticated;
