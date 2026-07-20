// Shared helpers for agreement functions
export async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomHex(bytes: number): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function randomDigits(len: number): string {
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  let out = "";
  for (const x of b) out += (x % 10).toString();
  return out;
}

// deno-lint-ignore no-explicit-any
export async function loadInvitationByToken(supabase: any, rawToken: string) {
  const tokenHash = await sha256Hex(rawToken);
  const { data } = await supabase
    .from("agreement_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  return data;
}

export function invitationErrorCode(inv: { revoked_at?: string | null; expires_at: string; accepted_at?: string | null } | null): string | null {
  if (!inv) return "not_found";
  if (inv.revoked_at) return "revoked";
  if (inv.accepted_at) return "already_accepted";
  if (new Date(inv.expires_at).getTime() < Date.now()) return "expired";
  return null;
}

// deno-lint-ignore no-explicit-any
export async function validateSessionToken(supabase: any, rawSessionToken: string, invitationId: string) {
  if (!rawSessionToken) return { ok: false, code: "session_required" as const };
  const sessionHash = await sha256Hex(rawSessionToken);
  const { data } = await supabase
    .from("agreement_verified_sessions")
    .select("*")
    .eq("session_token_hash", sessionHash)
    .eq("invitation_id", invitationId)
    .maybeSingle();
  if (!data) return { ok: false, code: "session_invalid" as const };
  if (new Date(data.expires_at).getTime() < Date.now()) return { ok: false, code: "session_expired" as const };
  return { ok: true, session: data };
}
