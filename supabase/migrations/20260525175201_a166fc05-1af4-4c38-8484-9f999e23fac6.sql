
GRANT EXECUTE ON FUNCTION public._gdpr_encrypt(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public._gdpr_decrypt(bytea) TO authenticated;
-- _gdpr_key() stays revoked
