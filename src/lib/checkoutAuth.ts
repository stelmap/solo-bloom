import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a valid access token for the current session, refreshing it when it
 * is about to expire. Returns null when the user has no usable session.
 *
 * Edge functions such as `create-checkout` authenticate the caller from the
 * Authorization header. When no token is passed explicitly, supabase-js sends
 * the anon publishable key, which has no `sub` claim and is rejected with
 * "You must be signed in".
 */
export async function getFreshAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  let session = data.session;
  if (!session?.access_token) return null;

  if (session.expires_at && session.expires_at * 1000 <= Date.now() + 30_000) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error || !refreshed.session?.access_token) return null;
    session = refreshed.session;
  }

  return session.access_token;
}
