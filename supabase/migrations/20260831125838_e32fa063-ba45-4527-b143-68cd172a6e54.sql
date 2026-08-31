CREATE OR REPLACE FUNCTION public.get_auth_email_language(_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT p.language
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE lower(u.email) = lower(_email)
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_auth_email_language(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_email_language(text) TO service_role;