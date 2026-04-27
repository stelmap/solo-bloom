import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMode, useDemoWriteGuard } from "@/hooks/useDemoWorkspace";

const STALE_MEDIUM = 60_000;
const INVALIDATE_GROUPS = ["groups", "group-detail", "group-members", "group-sessions", "group-attendance"];
const attachDemoFlag = <T extends Record<string, any>>(payload: T, isDemoMode: boolean): T => (
  isDemoMode ? { ...payload, is_demo: true } : payload
);

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
        .select("*, appointments!group_sessions_appointment_id_fkey(id, scheduled_at, duration_minutes, status, price, services(name))")
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
  const { isDemoMode } = useDemoMode();
  return useMutation({
    mutationFn: async (group: { name: string; description?: string; status?: string }) => {
      const { data, error } = await supabase
        .from("groups" as any)
        .insert(attachDemoFlag({ ...group, user_id: user!.id }, isDemoMode))
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
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; status?: string; bill_present?: boolean; bill_absent?: boolean }) => {
      assertCanWrite();
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

// Update member price
export function useUpdateGroupMemberPrice() {
  const qc = useQueryClient();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ id, pricePerSession, groupId }: { id: string; pricePerSession: number | null; groupId: string }) => {
      assertCanWrite();
      const { error } = await supabase
        .from("group_members" as any)
        .update({ price_per_session: pricePerSession })
        .eq("id", id);
      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => qc.invalidateQueries({ queryKey: ["group-members", groupId] }),
  });
}

// Complete group session with attendance-based billing
export function useCompleteGroupSession() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  return useMutation({
    mutationFn: async ({ appointmentId, groupId, groupSessionId, participants, paymentState, paymentMethod }: {
      appointmentId: string;
      groupId: string;
      groupSessionId: string;
      participants: Array<{ clientId: string; attendanceStatus: string; billable: boolean; amount: number }>;
      paymentState: string;
      paymentMethod: string;
    }) => {
      // Mark appointment as completed
      const { error: aptErr } = await supabase
        .from("appointments")
        .update({ status: "completed", payment_status: paymentState } as any)
        .eq("id", appointmentId);
      if (aptErr) throw aptErr;

      // Clean up old records
      await supabase.from("income").delete().eq("appointment_id", appointmentId);
      await supabase.from("expected_payments").delete().eq("appointment_id", appointmentId);

      // Delete old group_session_payments for this session
      await supabase.from("group_session_payments" as any).delete().eq("group_session_id", groupSessionId);

      const today = new Date().toISOString().split("T")[0];

      for (const p of participants) {
        let incomeId: string | null = null;
        let expectedPaymentId: string | null = null;

        if (p.billable && p.amount > 0) {
          if (paymentState === "paid_now" || paymentState === "paid_in_advance") {
            const { data: inc, error: incErr } = await supabase.from("income").insert({
              user_id: user!.id, appointment_id: appointmentId,
              amount: p.amount, date: today, source: "group_session",
              payment_method: paymentMethod, description: `Group session`,
              ...(isDemoMode ? { is_demo: true } : {}),
            } as any).select("id").single();
            if (incErr) throw incErr;
            incomeId = inc?.id || null;
          } else if (paymentState === "waiting_for_payment") {
            const { data: ep, error: epErr } = await supabase.from("expected_payments").insert({
              user_id: user!.id, appointment_id: appointmentId,
              client_id: p.clientId, amount: p.amount, status: "pending",
              ...(isDemoMode ? { is_demo: true } : {}),
            } as any).select("id").single();
            if (epErr) throw epErr;
            expectedPaymentId = ep?.id || null;
          }
        }

        // Create payment tracking record
        await supabase.from("group_session_payments" as any).insert({
          user_id: user!.id,
          group_id: groupId,
          group_session_id: groupSessionId,
          client_id: p.clientId,
          attendance_status: p.attendanceStatus,
          billing_rule_applied: p.billable,
          amount: p.billable ? p.amount : 0,
          payment_state: p.billable ? paymentState : "not_applicable",
          payment_method: p.billable && (paymentState === "paid_now" || paymentState === "paid_in_advance") ? paymentMethod : null,
          income_id: incomeId,
          expected_payment_id: expectedPaymentId,
        });
      }
    },
    onSuccess: () => {
      INVALIDATE_GROUPS.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["income"] });
      qc.invalidateQueries({ queryKey: ["expected-payments"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

// Group session payments
export function useGroupSessionPayments(groupSessionId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["group-session-payments", groupSessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_session_payments" as any)
        .select("*, clients(id, name)")
        .eq("group_session_id", groupSessionId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!groupSessionId,
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (id: string) => {
      assertCanWrite();
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
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ groupId, clientId }: { groupId: string; clientId: string }) => {
      assertCanWrite();
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
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ id, groupId }: { id: string; groupId: string }) => {
      assertCanWrite();
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
  const { isDemoMode } = useDemoMode();
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
        .insert(attachDemoFlag({ group_id: groupId, appointment_id: appointmentId, user_id: user!.id, notes: notes || "" }, isDemoMode))
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
          ...(isDemoMode ? { is_demo: true } : {}),
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
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ id, status, groupSessionId }: { id: string; status: string; groupSessionId: string }) => {
      assertCanWrite();
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
