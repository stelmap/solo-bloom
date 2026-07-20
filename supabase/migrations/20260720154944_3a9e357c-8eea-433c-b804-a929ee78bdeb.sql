-- Add communication_language to clients (single source of truth for client-facing communication)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS communication_language text;

-- Validate allowed codes via trigger (avoid CHECK constraint per project convention)
CREATE OR REPLACE FUNCTION public.validate_client_communication_language()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.communication_language IS NOT NULL
     AND NEW.communication_language NOT IN ('uk','ru','en','pl') THEN
    RAISE EXCEPTION 'INVALID_CLIENT_LANGUAGE: %', NEW.communication_language;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_client_communication_language ON public.clients;
CREATE TRIGGER trg_validate_client_communication_language
BEFORE INSERT OR UPDATE OF communication_language ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.validate_client_communication_language();

-- Snapshot language on agreement artefacts
ALTER TABLE public.agreement_instances
  ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE public.agreement_revisions
  ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE public.agreement_invitations
  ADD COLUMN IF NOT EXISTS language text;

-- Audit trail for language changes
CREATE TABLE IF NOT EXISTS public.client_language_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  previous_language text,
  new_language text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.client_language_audit TO authenticated;
GRANT ALL ON public.client_language_audit TO service_role;

ALTER TABLE public.client_language_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own client language audit"
  ON public.client_language_audit FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own client language audit"
  ON public.client_language_audit FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Auto-record language changes
CREATE OR REPLACE FUNCTION public.log_client_language_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.communication_language IS NOT NULL THEN
    INSERT INTO public.client_language_audit (user_id, client_id, previous_language, new_language, actor_id)
    VALUES (NEW.user_id, NEW.id, NULL, NEW.communication_language, auth.uid());
  ELSIF TG_OP = 'UPDATE' AND COALESCE(OLD.communication_language,'') IS DISTINCT FROM COALESCE(NEW.communication_language,'') THEN
    INSERT INTO public.client_language_audit (user_id, client_id, previous_language, new_language, actor_id)
    VALUES (NEW.user_id, NEW.id, OLD.communication_language, NEW.communication_language, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_client_language_change ON public.clients;
CREATE TRIGGER trg_log_client_language_change
AFTER INSERT OR UPDATE OF communication_language ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.log_client_language_change();