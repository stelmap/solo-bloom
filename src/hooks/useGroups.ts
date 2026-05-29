import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMode, useDemoWriteGuard } from "@/hooks/useDemoWorkspace";
import { track } from "@/lib/analytics";

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
    onSuccess: () => { track("group_created"); qc.invalidateQueries({ queryKey: ["groups"] }); },
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
      track("group_updated");
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

// Complete group session with attendance-based billing.
//
// Per-participant flow (mirrors useCompleteAppointment so financial records,
// prepaid balances and dashboards stay consistent across solo + group sessions):
//   1. Wipe any prior income / allocations / expected_payments / payment-tracking
//      rows for this group session so re-completion never duplicates records.
//   2. For each billable participant (amount > 0):
//        a. Consume their prepaid balance against this session via the same RPC
//           individual sessions use (creates from_prepayment allocations).
//        b. For the remaining gap, depending on `paymentState`:
//             - paid_now / paid_in_advance: insert an income row with client_id
//               + an income_session_allocations row covering the gap.
//             - waiting_for_payment: insert an expected_payments row for the gap.
//        c. Persist a group_session_payments tracking row.
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
      // 1) Mark appointment as completed.
      const { data: aptRow, error: aptErr } = await supabase
        .from("appointments")
        .update({ status: "completed", payment_status: paymentState } as any)
        .eq("id", appointmentId)
        .select("scheduled_at")
        .single();
      if (aptErr) throw aptErr;

      const sessionDate = (aptRow as any)?.scheduled_at
        ? new Date((aptRow as any).scheduled_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const today = new Date().toISOString().split("T")[0];
      const payDate = paymentState === "paid_in_advance" ? today : sessionDate;

      // 2) Wipe prior records for this appointment so re-completion is idempotent.
      await supabase.from("income_session_allocations").delete().eq("appointment_id", appointmentId);
      await supabase.from("income").delete().eq("appointment_id", appointmentId);
      await supabase.from("expected_payments").delete().eq("appointment_id", appointmentId);
      await supabase.from("group_session_payments" as any).delete().eq("group_session_id", groupSessionId);

      // 3) Process each participant individually.
      for (const p of participants) {
        let incomeId: string | null = null;
        let expectedPaymentId: string | null = null;
        let resolvedState = p.billable ? paymentState : "not_applicable";

        if (p.billable && p.amount > 0 && p.clientId) {
          const amount = Number(p.amount);

          // a) Consume client's prepaid balance against THIS appointment first.
          //    The RPC inserts income_session_allocations rows with
          //    from_prepayment = true and returns the consumed amount.
          let consumed = 0;
          try {
            const { data: consumedRpc, error: consumeErr } = await (supabase as any).rpc(
              "consume_client_credit_for_appointment",
              { p_appointment_id: appointmentId, p_client_id: p.clientId, p_max_amount: amount },
            );
            if (consumeErr) throw consumeErr;
            consumed = Number(consumedRpc ?? 0);
          } catch {
            consumed = 0;
          }

          const stillOwed = Math.max(amount - consumed, 0);
          const fullyCoveredByPrepayment = stillOwed <= 0.001;

          if (fullyCoveredByPrepayment) {
            resolvedState = "paid_from_prepayment";
          } else if (paymentState === "paid_now" || paymentState === "paid_in_advance") {
            // b1) Cash/card received now for the remaining gap → income + allocation.
            const { data: inc, error: incErr } = await supabase.from("income").insert({
              user_id: user!.id,
              appointment_id: appointmentId,
              client_id: p.clientId,
              amount: stillOwed,
              date: payDate,
              session_date: sessionDate,
              source: "group_session",
              payment_method: paymentMethod,
              description: "Group session",
              ...(isDemoMode ? { is_demo: true } : {}),
            } as any).select("id").single();
            if (incErr) throw incErr;
            incomeId = (inc as any)?.id || null;

            if (incomeId) {
              await (supabase as any).from("income_session_allocations").insert({
                user_id: user!.id,
                income_id: incomeId,
                appointment_id: appointmentId,
                allocated_amount: stillOwed,
                from_prepayment: false,
              } as any);
            }
            resolvedState = consumed > 0.001 ? "partially_paid_from_prepayment" : paymentState;
          } else {
            // b2) Waiting for payment → pending expected payment for the gap.
            const { data: ep, error: epErr } = await supabase.from("expected_payments").insert({
              user_id: user!.id,
              appointment_id: appointmentId,
              client_id: p.clientId,
              amount: stillOwed,
              status: "pending",
              ...(isDemoMode ? { is_demo: true } : {}),
            } as any).select("id").single();
            if (epErr) throw epErr;
            expectedPaymentId = (ep as any)?.id || null;
            resolvedState = consumed > 0.001 ? "partially_paid_from_prepayment" : "waiting_for_payment";
          }
        }

        // c) Persist tracking row for the group session UI.
        await supabase.from("group_session_payments" as any).insert({
          user_id: user!.id,
          group_id: groupId,
          group_session_id: groupSessionId,
          client_id: p.clientId,
          attendance_status: p.attendanceStatus,
          billing_rule_applied: p.billable,
          amount: p.billable ? p.amount : 0,
          payment_state: resolvedState,
          payment_method:
            p.billable && (resolvedState === "paid_now" || resolvedState === "paid_in_advance" || resolvedState === "partially_paid_from_prepayment")
              ? paymentMethod
              : null,
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
      qc.invalidateQueries({ queryKey: ["client-credit-balance"] });
      qc.invalidateQueries({ queryKey: ["client-debt"] });
      qc.invalidateQueries({ queryKey: ["client-allocations"] });
      qc.invalidateQueries({ queryKey: ["appointment-allocations"] });
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
      track("group_deleted");
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
