
-- =========================================================
-- Information Agreement — Phase 1 data model
-- =========================================================

-- Enum for template/version/instance statuses
DO $$ BEGIN
  CREATE TYPE public.agreement_version_status AS ENUM ('draft','active','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agreement_instance_status AS ENUM (
    'draft','sent','opened','verified','accepted','revoked','expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Shared updated_at trigger (reuse if exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ---------------------------------------------------------
-- agreement_templates
-- ---------------------------------------------------------
CREATE TABLE public.agreement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL DEFAULT 'uk',
  is_system_starter BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agreement_templates TO authenticated;
GRANT ALL ON public.agreement_templates TO service_role;
ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own templates" ON public.agreement_templates
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_agreement_templates_updated
  BEFORE UPDATE ON public.agreement_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_agreement_templates_user ON public.agreement_templates(user_id);

-- ---------------------------------------------------------
-- agreement_template_versions
-- ---------------------------------------------------------
CREATE TABLE public.agreement_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.agreement_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  status public.agreement_version_status NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,   -- sections, rich text
  controls JSONB NOT NULL DEFAULT '[]'::jsonb,  -- checkbox / typed ack config
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, version_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agreement_template_versions TO authenticated;
GRANT ALL ON public.agreement_template_versions TO service_role;
ALTER TABLE public.agreement_template_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own template versions" ON public.agreement_template_versions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_agreement_template_versions_updated
  BEFORE UPDATE ON public.agreement_template_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_atv_template ON public.agreement_template_versions(template_id);
-- Only one active version per template
CREATE UNIQUE INDEX idx_atv_one_active
  ON public.agreement_template_versions(template_id)
  WHERE status = 'active';

-- ---------------------------------------------------------
-- agreement_instances
-- ---------------------------------------------------------
CREATE TABLE public.agreement_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_version_id UUID NOT NULL REFERENCES public.agreement_template_versions(id) ON DELETE RESTRICT,
  status public.agreement_instance_status NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,   -- client-editable copy
  controls JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_revision_id UUID,                     -- FK set later
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agreement_instances TO authenticated;
GRANT ALL ON public.agreement_instances TO service_role;
ALTER TABLE public.agreement_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agreement instances" ON public.agreement_instances
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_agreement_instances_updated
  BEFORE UPDATE ON public.agreement_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_ai_user ON public.agreement_instances(user_id);
CREATE INDEX idx_ai_client ON public.agreement_instances(client_id);

-- ---------------------------------------------------------
-- agreement_revisions (frozen snapshot)
-- ---------------------------------------------------------
CREATE TABLE public.agreement_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.agreement_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  revision_number INTEGER NOT NULL,
  content_snapshot JSONB NOT NULL,
  controls_snapshot JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (instance_id, revision_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agreement_revisions TO authenticated;
GRANT ALL ON public.agreement_revisions TO service_role;
ALTER TABLE public.agreement_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agreement revisions" ON public.agreement_revisions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_ar_instance ON public.agreement_revisions(instance_id);

ALTER TABLE public.agreement_instances
  ADD CONSTRAINT agreement_instances_current_revision_fk
  FOREIGN KEY (current_revision_id) REFERENCES public.agreement_revisions(id) ON DELETE SET NULL;

-- ---------------------------------------------------------
-- agreement_invitations
-- ---------------------------------------------------------
CREATE TABLE public.agreement_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instance_id UUID NOT NULL REFERENCES public.agreement_instances(id) ON DELETE CASCADE,
  revision_id UUID NOT NULL REFERENCES public.agreement_revisions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,       -- sha256 of raw token; raw token never stored
  email_bound TEXT NOT NULL,             -- lowercased email at time of issue
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agreement_invitations TO authenticated;
GRANT ALL ON public.agreement_invitations TO service_role;
ALTER TABLE public.agreement_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agreement invitations" ON public.agreement_invitations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_agreement_invitations_updated
  BEFORE UPDATE ON public.agreement_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_ainv_instance ON public.agreement_invitations(instance_id);
CREATE INDEX idx_ainv_client ON public.agreement_invitations(client_id);

-- ---------------------------------------------------------
-- agreement_otp_challenges (backend-only)
-- ---------------------------------------------------------
CREATE TABLE public.agreement_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.agreement_invitations(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.agreement_otp_challenges TO service_role;
ALTER TABLE public.agreement_otp_challenges ENABLE ROW LEVEL SECURITY;
-- No authenticated policy — service role only via edge functions.
CREATE INDEX idx_aotp_inv ON public.agreement_otp_challenges(invitation_id);

-- ---------------------------------------------------------
-- agreement_verified_sessions (backend-only)
-- ---------------------------------------------------------
CREATE TABLE public.agreement_verified_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.agreement_invitations(id) ON DELETE CASCADE,
  revision_id UUID NOT NULL REFERENCES public.agreement_revisions(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.agreement_verified_sessions TO service_role;
ALTER TABLE public.agreement_verified_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_avs_inv ON public.agreement_verified_sessions(invitation_id);

-- ---------------------------------------------------------
-- agreement_acceptances
-- ---------------------------------------------------------
CREATE TABLE public.agreement_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instance_id UUID NOT NULL REFERENCES public.agreement_instances(id) ON DELETE CASCADE,
  revision_id UUID NOT NULL REFERENCES public.agreement_revisions(id) ON DELETE CASCADE,
  invitation_id UUID NOT NULL REFERENCES public.agreement_invitations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  typed_name TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  evidence_hash TEXT NOT NULL,
  UNIQUE (invitation_id)
);
GRANT SELECT ON public.agreement_acceptances TO authenticated;
GRANT ALL ON public.agreement_acceptances TO service_role;
ALTER TABLE public.agreement_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "therapist reads own acceptances" ON public.agreement_acceptances
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX idx_aacc_instance ON public.agreement_acceptances(instance_id);
CREATE INDEX idx_aacc_client ON public.agreement_acceptances(client_id);

-- ---------------------------------------------------------
-- agreement_audit_events (backend-writable, therapist-readable)
-- ---------------------------------------------------------
CREATE TABLE public.agreement_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  instance_id UUID REFERENCES public.agreement_instances(id) ON DELETE CASCADE,
  invitation_id UUID REFERENCES public.agreement_invitations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  correlation_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agreement_audit_events TO authenticated;
GRANT ALL ON public.agreement_audit_events TO service_role;
ALTER TABLE public.agreement_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "therapist reads own audit events" ON public.agreement_audit_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX idx_aae_instance ON public.agreement_audit_events(instance_id);

-- ---------------------------------------------------------
-- accepted_documents (metadata; blob in storage bucket)
-- ---------------------------------------------------------
CREATE TABLE public.accepted_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instance_id UUID NOT NULL REFERENCES public.agreement_instances(id) ON DELETE CASCADE,
  revision_id UUID NOT NULL REFERENCES public.agreement_revisions(id) ON DELETE CASCADE,
  acceptance_id UUID NOT NULL REFERENCES public.agreement_acceptances(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL DEFAULT 'agreement-documents',
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'text/html',
  evidence_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.accepted_documents TO authenticated;
GRANT ALL ON public.accepted_documents TO service_role;
ALTER TABLE public.accepted_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "therapist reads own accepted docs" ON public.accepted_documents
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX idx_ad_client ON public.accepted_documents(client_id);
