-- Add archive fields to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS archive_reason text,
  ADD COLUMN IF NOT EXISTS archive_comment text,
  ADD COLUMN IF NOT EXISTS unarchived_at timestamptz;

-- Validate status via trigger (avoid CHECK constraint per project rules)
CREATE OR REPLACE FUNCTION public.validate_client_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('active','archived') THEN
    RAISE EXCEPTION 'invalid client.status: %', NEW.status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_client_status_trg ON public.clients;
CREATE TRIGGER validate_client_status_trg
BEFORE INSERT OR UPDATE OF status ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.validate_client_status();

CREATE INDEX IF NOT EXISTS clients_status_idx ON public.clients(user_id, status);

-- Audit table for archive/unarchive actions
CREATE TABLE IF NOT EXISTS public.client_status_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  archive_reason text,
  archive_comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_status_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own client_status_audit" ON public.client_status_audit;
CREATE POLICY "Users manage own client_status_audit"
ON public.client_status_audit
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS client_status_audit_client_idx ON public.client_status_audit(client_id, created_at DESC);
