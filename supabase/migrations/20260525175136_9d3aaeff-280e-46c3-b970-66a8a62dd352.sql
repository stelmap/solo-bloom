
-- =====================================================================
-- Phase 2: Encrypt client_notes.content at rest
-- Pattern: rename table -> raw, add bytea ct column, expose original
-- name as security_invoker view, route writes via INSTEAD OF triggers.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Ensure a master key exists in vault
DO $$
DECLARE
  has_key boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'gdpr_master_key') INTO has_key;
  IF NOT has_key THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'base64'),
      'gdpr_master_key',
      'GDPR column-encryption master key. Rotate via re-encryption job.'
    );
  END IF;
END $$;

-- 2. Key accessor (SECURITY DEFINER, not callable by clients)
CREATE OR REPLACE FUNCTION public._gdpr_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = vault, public
AS $$
  SELECT decrypted_secret
    FROM vault.decrypted_secrets
   WHERE name = 'gdpr_master_key'
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public._gdpr_key() FROM public, anon, authenticated;

-- 3. Helpers
CREATE OR REPLACE FUNCTION public._gdpr_encrypt(plain text)
RETURNS bytea
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT CASE WHEN plain IS NULL THEN NULL
              ELSE extensions.pgp_sym_encrypt(plain, public._gdpr_key()) END;
$$;
REVOKE ALL ON FUNCTION public._gdpr_encrypt(text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public._gdpr_decrypt(cipher bytea)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT CASE WHEN cipher IS NULL THEN NULL
              ELSE extensions.pgp_sym_decrypt(cipher, public._gdpr_key()) END;
$$;
REVOKE ALL ON FUNCTION public._gdpr_decrypt(bytea) FROM public, anon, authenticated;

-- 4. Move client_notes -> client_notes_raw, add ciphertext column
ALTER TABLE public.client_notes RENAME TO client_notes_raw;
ALTER TABLE public.client_notes_raw ADD COLUMN IF NOT EXISTS content_ct bytea;

-- Backfill
UPDATE public.client_notes_raw
   SET content_ct = public._gdpr_encrypt(content)
 WHERE content_ct IS NULL AND content IS NOT NULL;

-- Drop plaintext column
ALTER TABLE public.client_notes_raw DROP COLUMN content;

-- 5. View exposing the original shape, decrypting on read.
-- security_invoker=true makes the view run under the caller's RLS context.
CREATE OR REPLACE VIEW public.client_notes
WITH (security_invoker = true, security_barrier = true) AS
SELECT
  id,
  appointment_id,
  client_id,
  user_id,
  supervision_id,
  is_demo,
  seed_source,
  seed_batch_id,
  included_in_supervision,
  created_at,
  updated_at,
  public._gdpr_decrypt(content_ct) AS content
FROM public.client_notes_raw;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_notes_raw TO authenticated;

-- 6. INSTEAD OF triggers so PostgREST writes through the view
CREATE OR REPLACE FUNCTION public.client_notes_view_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.client_notes_raw (
    id, appointment_id, client_id, user_id, supervision_id,
    is_demo, seed_source, seed_batch_id, included_in_supervision,
    created_at, updated_at, content_ct
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.appointment_id,
    NEW.client_id,
    COALESCE(NEW.user_id, auth.uid()),
    NEW.supervision_id,
    COALESCE(NEW.is_demo, false),
    NEW.seed_source,
    NEW.seed_batch_id,
    COALESCE(NEW.included_in_supervision, false),
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now()),
    public._gdpr_encrypt(NEW.content)
  )
  RETURNING id INTO new_id;

  SELECT id, appointment_id, client_id, user_id, supervision_id,
         is_demo, seed_source, seed_batch_id, included_in_supervision,
         created_at, updated_at,
         public._gdpr_decrypt(content_ct)
    INTO NEW.id, NEW.appointment_id, NEW.client_id, NEW.user_id, NEW.supervision_id,
         NEW.is_demo, NEW.seed_source, NEW.seed_batch_id, NEW.included_in_supervision,
         NEW.created_at, NEW.updated_at, NEW.content
    FROM public.client_notes_raw WHERE id = new_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.client_notes_view_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.client_notes_raw SET
    appointment_id           = NEW.appointment_id,
    client_id                = NEW.client_id,
    user_id                  = NEW.user_id,
    supervision_id           = NEW.supervision_id,
    is_demo                  = NEW.is_demo,
    seed_source              = NEW.seed_source,
    seed_batch_id            = NEW.seed_batch_id,
    included_in_supervision  = NEW.included_in_supervision,
    updated_at               = now(),
    content_ct               = public._gdpr_encrypt(NEW.content)
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.client_notes_view_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.client_notes_raw WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS client_notes_view_insert_t ON public.client_notes;
DROP TRIGGER IF EXISTS client_notes_view_update_t ON public.client_notes;
DROP TRIGGER IF EXISTS client_notes_view_delete_t ON public.client_notes;

CREATE TRIGGER client_notes_view_insert_t INSTEAD OF INSERT ON public.client_notes
  FOR EACH ROW EXECUTE FUNCTION public.client_notes_view_insert();
CREATE TRIGGER client_notes_view_update_t INSTEAD OF UPDATE ON public.client_notes
  FOR EACH ROW EXECUTE FUNCTION public.client_notes_view_update();
CREATE TRIGGER client_notes_view_delete_t INSTEAD OF DELETE ON public.client_notes
  FOR EACH ROW EXECUTE FUNCTION public.client_notes_view_delete();

-- Re-attach audit trigger (was on the original table, now needs to live on _raw)
-- The Phase 1 audit trigger function name is tg_audit_write; re-bind it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'tg_audit_write' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS audit_client_notes ON public.client_notes_raw';
    EXECUTE 'CREATE TRIGGER audit_client_notes AFTER INSERT OR UPDATE OR DELETE ON public.client_notes_raw FOR EACH ROW EXECUTE FUNCTION public.tg_audit_write()';
  END IF;
END $$;
