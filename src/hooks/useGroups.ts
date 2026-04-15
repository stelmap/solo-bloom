import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STALE_MEDIUM = 60_000;
const INVALIDATE_GROUPS = ["groups", "group-detail", "group-members", "group-sessions", "group-attendance"];

// Groups list
export function useGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["groups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
    staleTime: STALE_MEDIUM,
  });
}

// Single group
export function useGroup(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["group-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user && !!id,
  });
}

// Group members with client info
export function useGroupMembers(groupId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members" as any)
        .select("*, clients(id, name, phone, email)")
        .eq("group_id", groupId!)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!groupId,
    staleTime: STALE_MEDIUM,
  });
}

// Group sessions with appointment info
export function useGroupSessions(groupId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["group-sessions", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_sessions" as any)
        .select("*, appointments(id, scheduled_at, duration_minutes, status, price, services(name))")
        .eq("group_id", groupId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!groupId,
    staleTime: STALE_MEDIUM,
  });
}

// Attendance for a specific group session
export function useGroupAttendance(groupSessionId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["group-attendance", groupSessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_attendance" as any)
        .select("*, clients(id, name)")
        .eq("group_session_id", groupSessionId!)
        .order("created_at");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!groupSessionId,
  });
}

// All attendance records for a group (for analytics)
export function useGroupAllAttendance(groupId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["group-all-attendance", groupId],
    queryFn: async () => {
      // Get all group session IDs for this group
      const { data: sessions, error: sessErr } = await supabase
        .from("group_sessions" as any)
        .select("id")
        .eq("group_id", groupId!);
      if (sessErr) throw sessErr;
      if (!sessions || sessions.length === 0) return [];
      
      const sessionIds = sessions.map((s: any) => s.id);
      const { data, error } = await supabase
        .from("group_attendance" as any)
        .select("*, clients(id, name)")
        .in("group_session_id", sessionIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!groupId,
    staleTime: STALE_MEDIUM,
  });
}

// Mutations
export function useCreateGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (group: { name: string; description?: string; status?: string }) => {
      const { data, error } = await supabase
        .from("groups" as any)
        .insert({ ...group, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; status?: string }) => {
      const { error } = await supabase
        .from("groups" as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["group-detail", vars.id] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Check if group has sessions — if so, soft-delete by setting status to inactive
      const { data: sessions } = await supabase
        .from("group_sessions" as any)
        .select("id")
        .eq("group_id", id)
        .limit(1);
      
      if (sessions && sessions.length > 0) {
        throw new Error("GROUP_HAS_SESSIONS");
      }

      // No sessions — safe to hard delete members then the group
      await supabase.from("group_members" as any).delete().eq("group_id", id);
      const { error } = await supabase.from("groups" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      INVALIDATE_GROUPS.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useAddGroupMember() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ groupId, clientId }: { groupId: string; clientId: string }) => {
      const { data, error } = await supabase
        .from("group_members" as any)
        .insert({ group_id: groupId, client_id: clientId, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["group-members", vars.groupId] }),
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, groupId }: { id: string; groupId: string }) => {
      const { error } = await supabase
        .from("group_members" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => qc.invalidateQueries({ queryKey: ["group-members", groupId] }),
  });
}

export function useCreateGroupSession() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ groupId, appointmentId, notes, memberClientIds }: {
      groupId: string;
      appointmentId: string;
      notes?: string;
      memberClientIds: string[];
    }) => {
      // Create the group session
      const { data: gs, error: gsErr } = await supabase
        .from("group_sessions" as any)
        .insert({ group_id: groupId, appointment_id: appointmentId, user_id: user!.id, notes: notes || "" })
        .select()
        .single();
      if (gsErr) throw gsErr;

      // Link appointment to group session
      await supabase
        .from("appointments")
        .update({ group_session_id: (gs as any).id } as any)
        .eq("id", appointmentId);

      // Initialize attendance for all current members
      if (memberClientIds.length > 0) {
        const attendanceRows = memberClientIds.map(clientId => ({
          group_session_id: (gs as any).id,
          client_id: clientId,
          user_id: user!.id,
          status: "attended",
        }));
        const { error: attErr } = await supabase
          .from("group_attendance" as any)
          .insert(attendanceRows);
        if (attErr) throw attErr;
      }

      return gs;
    },
    onSuccess: (_, vars) => {
      INVALIDATE_GROUPS.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, groupSessionId }: { id: string; status: string; groupSessionId: string }) => {
      const { error } = await supabase
        .from("group_attendance" as any)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      return groupSessionId;
    },
    onSuccess: (groupSessionId) => {
      qc.invalidateQueries({ queryKey: ["group-attendance", groupSessionId] });
      qc.invalidateQueries({ queryKey: ["group-all-attendance"] });
    },
  });
}
