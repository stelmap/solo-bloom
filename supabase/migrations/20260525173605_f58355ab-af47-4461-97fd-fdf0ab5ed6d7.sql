
-- =========================================================
-- 1) Data Access Audit
-- =========================================================
CREATE TABLE IF NOT EXISTS public.data_access_audit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  action      text NOT NULL CHECK (action IN ('read','create','update','delete','export','erase_requested','erase_cancelled','erase_executed')),
  entity_type text NOT NULL,
  entity_id   uuid,
  metadata    jsonb,
  at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_access_audit_user_at
  ON public.data_access_audit (user_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_audit_entity
  ON public.data_access_audit (entity_type, entity_id);

ALTER TABLE public.data_access_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit log"
  ON public.data_access_audit FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Inserts only via SECURITY DEFINER triggers / RPCs below.
CREATE POLICY "Service role manages audit"
  ON public.data_access_audit FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =========================================================
-- 2) Write trigger that records create/update/delete on sensitive tables
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_audit_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_id   uuid;
  v_action text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user := OLD.user_id;
    v_id   := OLD.id;
    v_action := 'delete';
  ELSIF TG_OP = 'UPDATE' THEN
    v_user := NEW.user_id;
    v_id   := NEW.id;
    v_action := 'update';
  ELSE
    v_user := NEW.user_id;
    v_id   := NEW.id;
    v_action := 'create';
  END IF;

  IF v_user IS NOT NULL THEN
    INSERT INTO public.data_access_audit (user_id, action, entity_type, entity_id)
    VALUES (v_user, v_action, TG_TABLE_NAME, v_id);
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;

DROP TRIGGER IF EXISTS audit_clients_w              ON public.clients;
DROP TRIGGER IF EXISTS audit_client_notes_w         ON public.client_notes;
DROP TRIGGER IF EXISTS audit_appointments_w         ON public.appointments;
DROP TRIGGER IF EXISTS audit_supervisions_w         ON public.supervisions;
DROP TRIGGER IF EXISTS audit_client_attachments_w   ON public.client_attachments;
DROP TRIGGER IF EXISTS audit_payment_corrections_w  ON public.payment_corrections;

CREATE TRIGGER audit_clients_w
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_write();

CREATE TRIGGER audit_client_notes_w
  AFTER INSERT OR UPDATE OR DELETE ON public.client_notes
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_write();

CREATE TRIGGER audit_appointments_w
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_write();

CREATE TRIGGER audit_supervisions_w
  AFTER INSERT OR UPDATE OR DELETE ON public.supervisions
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_write();

CREATE TRIGGER audit_client_attachments_w
  AFTER INSERT OR UPDATE OR DELETE ON public.client_attachments
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_write();

CREATE TRIGGER audit_payment_corrections_w
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_corrections
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_write();

-- =========================================================
-- 3) Read-audit RPC (called from frontend when viewing sensitive entities)
-- =========================================================
CREATE OR REPLACE FUNCTION public.audit_read(p_entity_type text, p_entity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF p_entity_type NOT IN ('clients','client_notes','appointments','supervisions','client_attachments','payment_corrections') THEN
    RETURN;
  END IF;
  INSERT INTO public.data_access_audit (user_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'read', p_entity_type, p_entity_id);
END $$;

REVOKE ALL ON FUNCTION public.audit_read(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_read(text, uuid) TO authenticated;

-- =========================================================
-- 4) GDPR deletion requests
-- =========================================================
CREATE TABLE IF NOT EXISTS public.gdpr_deletion_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL UNIQUE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  cancelled_at timestamptz,
  executed_at  timestamptz,
  reason       text
);

ALTER TABLE public.gdpr_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own deletion request"
  ON public.gdpr_deletion_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own deletion request"
  ON public.gdpr_deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cancel own deletion request"
  ON public.gdpr_deletion_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND executed_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages deletion requests"
  ON public.gdpr_deletion_requests FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
