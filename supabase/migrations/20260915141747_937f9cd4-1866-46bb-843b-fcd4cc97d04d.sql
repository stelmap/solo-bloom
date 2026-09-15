-- Row-scoped decryption helper: returns plaintext only for the caller's own note
CREATE OR REPLACE FUNCTION public.client_notes_decrypt_own(p_note_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public._gdpr_decrypt(n.content_ct)
  FROM public.client_notes_raw n
  WHERE n.id = p_note_id
    AND (n.user_id = auth.uid() OR auth.role() = 'service_role');
$$;

REVOKE ALL ON FUNCTION public.client_notes_decrypt_own(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_notes_decrypt_own(uuid) TO authenticated, service_role;

-- Rebuild the notes view so it no longer needs direct access to the raw decrypt helper
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
  public.client_notes_decrypt_own(id) AS content
FROM public.client_notes_raw;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_notes TO authenticated;
GRANT ALL ON public.client_notes TO service_role;

-- Re-close the raw crypto helpers to API roles
REVOKE ALL ON FUNCTION public._gdpr_decrypt(bytea) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._gdpr_encrypt(text) FROM PUBLIC, anon, authenticated;