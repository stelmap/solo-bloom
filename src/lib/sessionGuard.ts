import { supabase } from "@/integrations/supabase/client";

export class SessionExpiredError extends Error {
  constructor() {
    super("SESSION_EXPIRED");
    this.name = "SessionExpiredError";
  }
}

/**
 * Returns the user id of a *live* session, refreshing the token when it is
 * about to expire. Returns null when there is no usable session — callers that
 * only read optional data can silently skip their request.
 */
export async function getActiveSessionUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  let session = data.session;
  if (!session?.access_token) return null;
  if (session.expires_at && session.expires_at * 1000 <= Date.now() + 30_000) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error || !refreshed.session?.access_token) return null;
    session = refreshed.session;
  }
  return session.user?.id ?? null;
}

/**
 * Same as above, but for writes: when the session is gone we sign the user out
 * (so the app redirects to the login screen) and throw instead of letting the
 * database reject the row with an opaque row-level-security error.
 */
export async function requireActiveSession(): Promise<string> {
  const userId = await getActiveSessionUserId();
  if (!userId) {
    await supabase.auth.signOut();
    throw new SessionExpiredError();
  }
  return userId;
}

/** Admin check that never throws when the session quietly expired. */
export async function checkIsAdmin(): Promise<boolean> {
  const userId = await getActiveSessionUserId();
  if (!userId) return false;
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) return false;
  return data === true;
}
