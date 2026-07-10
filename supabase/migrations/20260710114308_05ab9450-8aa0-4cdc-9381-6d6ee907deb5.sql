
-- Settings singleton
CREATE TABLE IF NOT EXISTS public.lifecycle_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  deletion_grace_days int NOT NULL DEFAULT 7,
  cron_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lifecycle_settings TO authenticated;
GRANT ALL ON public.lifecycle_settings TO service_role;
ALTER TABLE public.lifecycle_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_admin_read" ON public.lifecycle_settings FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.lifecycle_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- Lifecycle table (one row per user)
CREATE TABLE IF NOT EXISTS public.user_lifecycle (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','deactivation_pending','ready_for_deletion','deleted')),
  last_login_at timestamptz,
  last_activity_at timestamptz,
  deactivation_email_sent_at timestamptz,
  planned_deletion_date timestamptz,
  reactivated_at timestamptz,
  deleted_at timestamptz,
  deactivated_by uuid,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_lifecycle TO authenticated;
GRANT ALL ON public.user_lifecycle TO service_role;
ALTER TABLE public.user_lifecycle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lc_own_select" ON public.user_lifecycle FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lc_admin_all" ON public.user_lifecycle FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_user_lifecycle_updated
  BEFORE UPDATE ON public.user_lifecycle
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_lc_status ON public.user_lifecycle(status);
CREATE INDEX IF NOT EXISTS idx_lc_planned ON public.user_lifecycle(planned_deletion_date)
  WHERE planned_deletion_date IS NOT NULL;

-- Audit log
CREATE TABLE IF NOT EXISTS public.user_lifecycle_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  admin_id uuid,
  action text NOT NULL,
  previous_status text,
  new_status text,
  email_delivery_status text,
  ip_address inet,
  metadata jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_lifecycle_audit TO authenticated;
GRANT ALL ON public.user_lifecycle_audit TO service_role;
ALTER TABLE public.user_lifecycle_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lca_admin_read" ON public.user_lifecycle_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_lca_user ON public.user_lifecycle_audit(user_id, at DESC);

-- Records user activity, auto-reactivates a pending user on login.
CREATE OR REPLACE FUNCTION public.record_user_activity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_prev text;
  v_reactivated boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;

  INSERT INTO public.user_lifecycle (user_id, last_login_at, last_activity_at)
  VALUES (v_uid, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET last_login_at = now(), last_activity_at = now();

  SELECT status INTO v_prev FROM public.user_lifecycle WHERE user_id = v_uid;

  IF v_prev = 'deactivation_pending' THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
    UPDATE public.user_lifecycle
      SET status = 'active',
          reactivated_at = now(),
          planned_deletion_date = NULL,
          deactivation_email_sent_at = NULL,
          deactivated_by = NULL
      WHERE user_id = v_uid;
    INSERT INTO public.user_lifecycle_audit (user_id, user_email, action, previous_status, new_status)
    VALUES (v_uid, v_email, 'reactivated', v_prev, 'active');
    v_reactivated := true;
  END IF;

  RETURN jsonb_build_object('ok', true, 'reactivated', v_reactivated);
END $$;

REVOKE ALL ON FUNCTION public.record_user_activity() FROM public;
GRANT EXECUTE ON FUNCTION public.record_user_activity() TO authenticated;

-- Cron helper: move overdue pending → ready_for_deletion
CREATE OR REPLACE FUNCTION public.promote_expired_deactivations()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  WITH updated AS (
    UPDATE public.user_lifecycle
       SET status = 'ready_for_deletion'
     WHERE status = 'deactivation_pending'
       AND planned_deletion_date IS NOT NULL
       AND planned_deletion_date <= now()
    RETURNING user_id
  )
  SELECT count(*) INTO v_count FROM updated;

  INSERT INTO public.user_lifecycle_audit (action, new_status, metadata)
  VALUES ('cron_promote', 'ready_for_deletion', jsonb_build_object('count', v_count));

  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.promote_expired_deactivations() FROM public;
GRANT EXECUTE ON FUNCTION public.promote_expired_deactivations() TO service_role;
