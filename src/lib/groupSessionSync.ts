import { supabase } from "@/integrations/supabase/client";

/** Reuse the unique appointment link on retries; never overwrite saved attendance. */
export async function ensureGroupSession({ groupId, appointmentId, userId, notes = "", memberClientIds, isDemoMode = false }: {
  groupId: string; appointmentId: string; userId: string; notes?: string; memberClientIds: string[]; isDemoMode?: boolean;
}) {
  const { data: existing, error: lookupError } = await supabase.from("group_sessions").select("*").eq("appointment_id", appointmentId).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing && existing.group_id !== groupId) throw new Error("Meeting already belongs to another group");
  let session = existing;
  if (!session) {
    const { data, error } = await supabase.from("group_sessions").upsert({ group_id: groupId, appointment_id: appointmentId, user_id: userId, notes, ...(isDemoMode ? { is_demo: true } : {}) }, { onConflict: "appointment_id", ignoreDuplicates: true }).select().maybeSingle();
    if (error) throw error;
    session = data;
    if (!session) {
      const { data: retry, error: retryError } = await supabase.from("group_sessions").select("*").eq("appointment_id", appointmentId).single();
      if (retryError) throw retryError;
      session = retry;
    }
  }
  if (!session || session.group_id !== groupId) throw new Error("Invalid group meeting link");
  const { error: linkError } = await supabase.from("appointments").update({ group_session_id: session.id }).eq("id", appointmentId);
  if (linkError) throw linkError;
  if (memberClientIds.length) {
    const { data: attendance, error: attendanceError } = await supabase.from("group_attendance").select("client_id").eq("group_session_id", session.id);
    if (attendanceError) throw attendanceError;
    const present = new Set((attendance ?? []).map(r => r.client_id));
    const missing = [...new Set(memberClientIds)].filter(id => !present.has(id));
    if (missing.length) {
      const { error } = await supabase.from("group_attendance").upsert(missing.map(client_id => ({ group_session_id: session.id, client_id, user_id: userId, status: "attended", ...(isDemoMode ? { is_demo: true } : {}) })), { onConflict: "group_session_id,client_id", ignoreDuplicates: true });
      if (error) throw error;
    }
  }
  return session;
}

/** Prefer the canonical forward link for legacy rows with a missing reverse link. */
export function withCanonicalGroup<T extends { group_session_id?: string | null; group_sessions?: unknown; canonical_group_sessions?: { id: string } | Array<{ id: string }> | null }>(appointment: T): Omit<T, "canonical_group_sessions"> {
  const { canonical_group_sessions, ...row } = appointment;
  const group = Array.isArray(canonical_group_sessions) ? canonical_group_sessions[0] : canonical_group_sessions;
  return group ? { ...row, group_session_id: group.id, group_sessions: group } : row;
}