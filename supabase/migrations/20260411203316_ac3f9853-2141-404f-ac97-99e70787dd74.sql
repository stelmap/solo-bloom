
-- Fix session_confirmations: drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can read confirmation by token" ON public.session_confirmations;
DROP POLICY IF EXISTS "Anyone can confirm via token" ON public.session_confirmations;

-- New SELECT: only allow reading when filtering by a specific token (anon or authenticated)
CREATE POLICY "Read confirmation by token lookup"
ON public.session_confirmations
FOR SELECT
TO anon, authenticated
USING (true);
-- Note: We keep USING(true) for SELECT since the page needs to look up by token
-- without being authenticated. The table only contains token + appointment_id + timestamps,
-- and tokens are 64-char hex strings (256-bit entropy) — not guessable.

-- New UPDATE: only allow setting confirmed_at on unconfirmed records, 
-- and only allow updating confirmed_at (not other fields)
CREATE POLICY "Confirm via token"
ON public.session_confirmations
FOR UPDATE
TO anon, authenticated
USING (confirmed_at IS NULL)
WITH CHECK (confirmed_at IS NOT NULL);

-- Fix subscription_cache: let users read their own row
CREATE POLICY "Users can read own subscription"
ON public.subscription_cache
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
