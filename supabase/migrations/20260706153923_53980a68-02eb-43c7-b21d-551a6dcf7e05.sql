
-- 1) Remove overly permissive realtime.messages policies. Only the
--    topic-scoped policies (keyed on auth.uid()) remain.
DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages;

-- 2) Remove the broad SELECT policy on practice-avatars so clients
--    can no longer enumerate files. Public URLs still work because
--    the bucket remains public.
DROP POLICY IF EXISTS "Practice avatars are publicly readable" ON storage.objects;

-- 3) Revoke direct EXECUTE on GDPR crypto helpers from end users.
--    The client_notes view triggers run as SECURITY DEFINER and
--    continue to work; only the oracle path is closed.
REVOKE EXECUTE ON FUNCTION public._gdpr_encrypt(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._gdpr_encrypt(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public._gdpr_encrypt(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public._gdpr_decrypt(bytea) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._gdpr_decrypt(bytea) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public._gdpr_decrypt(bytea) FROM anon;
