import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateCapacity } from "@/lib/capacity";
import { track } from "@/lib/analytics";
import { getDemoActionMessage, useDemoMode, useDemoWriteGuard, useFreeStarterMode, FREE_STARTER_CLIENT_LIMIT } from "@/hooks/useDemoWorkspace";

export const FREE_STARTER_LIMIT_ERROR = "FREE_STARTER_CLIENT_LIMIT_REACHED";
export const PLAN_CLIENT_LIMIT_ERROR = "PLAN_CLIENT_LIMIT_REACHED";

const INVALIDATE_APPOINTMENTS = ["appointments", "dashboard-stats", "client-appointments"];
const INVALIDATE_FINANCIAL = ["income", "income-all", "income-sum", "expenses", "expected-payments", "dashboard-stats", "tax-accrual-status"];
const attachDemoFlag = <T extends Record<string, any>>(payload: T, isDemoMode: boolean): T => (
  isDemoMode ? { ...payload, is_demo: true } : payload
);

// Stale times to avoid redundant refetches on navigation
const STALE_SHORT = 30_000;  // 30s for dashboard/frequently changing data
const STALE_MEDIUM = 60_000; // 1min for lists
const STALE_LONG = 300_000;  // 5min for rarely changing config

// Clients
export function useClients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: STALE_MEDIUM,
  });
}

// Active (non-archived) clients — used in dropdowns/pickers where archived
// clients must not be selectable.
export function useActiveClients() {
  const q = useClients();
  return {
    ...q,
    data: ((q.data ?? []) as any[]).filter((c) => c?.status !== "archived"),
  } as typeof q;
}

export function useClient(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  const { atClientLimit, planCode, limit } = useFreeStarterMode();
  return useMutation({
    mutationFn: async (client: { name: string; phone?: string; email?: string; notes?: string; telegram?: string }) => {
      assertCanWrite();
      if (atClientLimit) {
        throw new Error(planCode === "free" ? FREE_STARTER_LIMIT_ERROR : `${PLAN_CLIENT_LIMIT_ERROR}:${limit ?? ""}`);
      }
      const { data, error } = await supabase.from("clients").insert({ ...client, user_id: user!.id } as any).select().single();
      if (error) {
        const msg = typeof error.message === "string" ? error.message : "";
        if (msg.includes("FREE_STARTER_CLIENT_LIMIT_REACHED")) throw new Error(FREE_STARTER_LIMIT_ERROR);
        if (msg.includes("PLAN_CLIENT_LIMIT_REACHED")) throw new Error(PLAN_CLIENT_LIMIT_ERROR);
        throw error;
      }
      return data;
    },
    // Analytics: a new client was created
    onSuccess: () => { track("client_created"); qc.invalidateQueries({ queryKey: ["clients"] }); qc.invalidateQueries({ queryKey: ["free-starter-client-count"] }); },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; phone?: string; email?: string; notes?: string; telegram?: string; notification_preference?: string; confirmation_required?: boolean; pricing_mode?: string; base_price?: number | null }) => {
      assertCanWrite();
      const { error } = await supabase.from("clients").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      track("client_updated");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", vars.id] });
    },
  });
}

// Client Price History
export function useClientPriceHistory(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-price-history", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_price_changes" as any)
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!clientId,
  });
}

export function useCreatePriceChange() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  return useMutation({
    mutationFn: async (change: { client_id: string; appointment_id?: string; old_price?: number; new_price: number; reason?: string; change_type: string }) => {
      if (isDemoMode && change.change_type === "base_price_change") {
        throw new Error(getDemoActionMessage());
      }
      const { data, error } = await supabase
        .from("client_price_changes" as any)
        .insert({ ...change, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["client-price-history", vars.client_id] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (id: string) => {
      assertCanWrite();
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { track("client_deleted"); qc.invalidateQueries({ queryKey: ["clients"] }); },
  });
}

export function useArchiveClient() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ id, reason, comment, cancelFutureSessions }: {
      id: string; reason?: string; comment?: string; cancelFutureSessions?: boolean;
    }) => {
      assertCanWrite();
      const nowIso = new Date().toISOString();
      const { data: prev } = await supabase.from("clients").select("status").eq("id", id).single();
      const { error } = await supabase
        .from("clients")
        .update({
          status: "archived",
          archived_at: nowIso,
          archived_by: user!.id,
          archive_reason: reason ?? null,
          archive_comment: comment ?? null,
        } as any)
        .eq("id", id);
      if (error) throw error;

      if (cancelFutureSessions) {
        await supabase
          .from("appointments")
          .update({ status: "cancelled", cancellation_reason: "client_archived" } as any)
          .eq("client_id", id)
          .gte("scheduled_at", nowIso)
          .in("status", ["scheduled", "confirmed"]);
      }

      await supabase.from("client_status_audit" as any).insert({
        user_id: user!.id,
        client_id: id,
        old_status: (prev as any)?.status ?? "active",
        new_status: "archived",
        archive_reason: reason ?? null,
        archive_comment: comment ?? null,
      } as any);
    },
    onSuccess: (_, vars) => {
      track("client_archived");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", vars.id] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["client-status-audit", vars.id] });
    },
  });
}

export function useUnarchiveClient() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (id: string) => {
      assertCanWrite();
      const { error } = await supabase
        .from("clients")
        .update({
          status: "active",
          unarchived_at: new Date().toISOString(),
        } as any)
        .eq("id", id);
      if (error) throw error;
      await supabase.from("client_status_audit" as any).insert({
        user_id: user!.id,
        client_id: id,
        old_status: "archived",
        new_status: "active",
      } as any);
    },
    onSuccess: (_, id) => {
      track("client_unarchived");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["client-status-audit", id] });
    },
  });
}

export function useClientFutureAppointments(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-future-appointments", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status")
        .eq("client_id", clientId!)
        .gte("scheduled_at", new Date().toISOString())
        .in("status", ["scheduled", "confirmed"]);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!clientId,
  });
}

// Client Notes
export function useClientNotes(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-notes", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!clientId,
  });
}

export function useCreateClientNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (note: { client_id: string; content: string; appointment_id?: string }) => {
      assertCanWrite();
      const { data, error } = await supabase.from("client_notes").insert({ ...note, user_id: user!.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["client-notes", vars.client_id] }),
  });
}

export function useDeleteClientNote() {
  const qc = useQueryClient();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      assertCanWrite();
      const { error } = await supabase.from("client_notes").delete().eq("id", id);
      if (error) throw error;
      return clientId;
    },
    onSuccess: (clientId) => qc.invalidateQueries({ queryKey: ["client-notes", clientId] }),
  });
}

// Client Attachments
export function useClientAttachments(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-attachments", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_attachments")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!clientId,
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ file, clientId, appointmentId }: { file: File; clientId: string; appointmentId?: string }) => {
      assertCanWrite();
      const filePath = `${user!.id}/${clientId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("client-attachments").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase.from("client_attachments").insert({
        user_id: user!.id,
        client_id: clientId,
        appointment_id: appointmentId || null,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type.startsWith("image/") ? "image" : "file",
        file_size: file.size,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["client-attachments", vars.clientId] }),
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ id, filePath, clientId }: { id: string; filePath: string; clientId: string }) => {
      assertCanWrite();
      await supabase.storage.from("client-attachments").remove([filePath]);
      const { error } = await supabase.from("client_attachments").delete().eq("id", id);
      if (error) throw error;
      return clientId;
    },
    onSuccess: (clientId) => qc.invalidateQueries({ queryKey: ["client-attachments", clientId] }),
  });
}

// Client Appointments (session history)
// Returns both:
//   1. Solo appointments where the client is the appointment.client_id.
//   2. Group sessions where the client attended as a participant — joined via
//      group_attendance. The participant's own amount + payment_state from
//      group_session_payments override the group-level price/status so the
//      client card shows correct per-participant debt / credit.
export function useClientAppointments(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-appointments", clientId],
    queryFn: async () => {
      const [{ data: solo, error: soloErr }, { data: groupAtt, error: gaErr }] = await Promise.all([
        supabase
          .from("appointments")
          .select("*, services(name, price)")
          .eq("client_id", clientId!)
          .order("scheduled_at", { ascending: false }),
        (supabase as any)
          .from("group_attendance")
          .select("id, status, group_session_id, group_sessions:group_session_id(id, group_id, appointment_id, groups:group_id(name), appointments:appointment_id(id, scheduled_at, duration_minutes, status, price, payment_status, service_id, services(name, price)))")
          .eq("client_id", clientId!),
      ]);
      if (soloErr) throw soloErr;
      if (gaErr) throw gaErr;

      const soloRows = ((solo ?? []) as any[]).filter((r) => !r.group_session_id);
      const soloAptIds = new Set(soloRows.map((r) => r.id));

      // Fetch this client's per-session payment rows in one shot.
      const gsIds = ((groupAtt ?? []) as any[])
        .map((a) => a.group_session_id)
        .filter(Boolean);
      let paymentByGs: Record<string, any> = {};
      if (gsIds.length > 0) {
        const { data: payRows } = await (supabase as any)
          .from("group_session_payments")
          .select("group_session_id, amount, payment_state, payment_method")
          .eq("client_id", clientId!)
          .in("group_session_id", gsIds);
        for (const p of (payRows ?? []) as any[]) {
          paymentByGs[p.group_session_id] = p;
        }
      }

      const groupRows: any[] = [];
      for (const att of (groupAtt ?? []) as any[]) {
        const gs = att.group_sessions;
        const apt = gs?.appointments;
        if (!apt || soloAptIds.has(apt.id)) continue;
        const myPayment = paymentByGs[gs.id] ?? null;
        groupRows.push({
          ...apt,
          services: apt.services,
          price: myPayment ? Number(myPayment.amount || 0) : apt.price,
          payment_status: myPayment?.payment_state ?? apt.payment_status,
          is_group_participant: true,
          group_name: gs?.groups?.name ?? null,
          group_session_id: gs?.id ?? null,
          attendance_status: att.status,
        });
      }

      const merged = [...soloRows, ...groupRows].sort((a, b) => {
        const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
        const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
        return tb - ta;
      });
      return merged;
    },
    enabled: !!user && !!clientId,
  });
}

// Services
export function useServices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["services", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: STALE_LONG,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (service: { name: string; duration_minutes: number; price: number }) => {
      assertCanWrite();
      const { data, error } = await supabase.from("services").insert({ ...service, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    // Analytics: a new service was created
    onSuccess: () => { track("service_created"); qc.invalidateQueries({ queryKey: ["services"] }); },
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; duration_minutes?: number; price?: number }) => {
      assertCanWrite();
      const { error } = await supabase.from("services").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { track("service_updated"); qc.invalidateQueries({ queryKey: ["services"] }); },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (id: string) => {
      assertCanWrite();
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { track("service_deleted"); qc.invalidateQueries({ queryKey: ["services"] }); },
  });
}

// Appointments
export function useAppointments(range?: { from?: string; to?: string }) {
  const { user } = useAuth();
  const from = range?.from;
  const to = range?.to;
  return useQuery({
    queryKey: ["appointments", user?.id, from ?? null, to ?? null],
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("*, clients(name), services(name, price), group_sessions!appointments_group_session_id_fkey(id, group_id, groups(name))")
        .order("scheduled_at", { ascending: true });
      if (from) q = q.gte("scheduled_at", from);
      if (to) q = q.lte("scheduled_at", to);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: STALE_SHORT,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  return useMutation({
    mutationFn: async (apt: {
      client_id: string; service_id: string; scheduled_at: string;
      duration_minutes: number; price: number; notes?: string;
    }) => {
      const { data, error } = await supabase.from("appointments").insert(attachDemoFlag({ ...apt, user_id: user!.id }, isDemoMode)).select().single();
      if (error) throw error;
      return data;
    },
    // Analytics: a session/appointment was scheduled
    onSuccess: () => { track("session_created"); [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string; status?: string; notes?: string; scheduled_at?: string;
      price?: number; client_id?: string; service_id?: string; duration_minutes?: number;
      payment_status?: string; price_override_reason?: string;
    }) => {
      const { error } = await supabase.from("appointments").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { track("session_updated"); [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("income").delete().eq("appointment_id", id);
      await supabase.from("expected_payments").delete().eq("appointment_id", id);
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { track("session_deleted"); [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

// Complete appointment with payment status.
// Supports partial payment (amountPaid < price), full payment, and overpayment.
// Allocation order: oldest expected_payments (debts) -> current session -> prepayment.
export function useCompleteAppointment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  return useMutation({
    mutationFn: async ({ appointmentId, clientId, price, paymentMethod, paymentStatus, paymentDate, amountPaid }: {
      appointmentId: string; clientId: string; price: number; paymentMethod: string; paymentStatus: string; paymentDate?: string;
      // Total cash received now. May be < price (partial), = price, or > price (prepayment).
      amountPaid?: number;
    }) => {
      const { data: aptData } = await supabase
        .from("appointments")
        .select("scheduled_at")
        .eq("id", appointmentId)
        .single();
      const sessionDate = aptData?.scheduled_at
        ? new Date(aptData.scheduled_at).toISOString().split("T")[0]
        : undefined;

      // "already_paid" — the session was pre-allocated to existing income
      // (prepayment for this specific session). Just mark it completed and
      // recalc payment_status from the existing allocations. Do NOT wipe.
      if (paymentStatus === "already_paid") {
        const { error: aptErr } = await supabase
          .from("appointments")
          .update({ status: "completed", price: Number(price) } as any)
          .eq("id", appointmentId);
        if (aptErr) throw aptErr;
        await (supabase as any).rpc("recalc_appointment_payment_status", { p_appointment_id: appointmentId });
        return;
      }

      // Clean up any prior records for THIS appointment.
      await supabase.from("income_session_allocations").delete().eq("appointment_id", appointmentId);
      await supabase.from("income").delete().eq("appointment_id", appointmentId);
      await supabase.from("expected_payments").delete().eq("appointment_id", appointmentId);


      const today = new Date().toISOString().split("T")[0];
      const payDate = paymentDate || today;
      const priceNum = Number(price);

      // Case A: "waiting for payment" — first try to consume any existing
      // prepayment credits the client has. Only the remaining gap becomes a debt.
      if (paymentStatus === "waiting_for_payment") {
        await supabase
          .from("appointments")
          .update({ status: "completed", price: priceNum, payment_status: "waiting_for_payment" } as any)
          .eq("id", appointmentId);

        let consumed = 0;
        if (clientId && priceNum > 0) {
          const { data: consumedRpc, error: consumeErr } = await (supabase as any).rpc(
            "consume_client_credit_for_appointment",
            { p_appointment_id: appointmentId, p_client_id: clientId, p_max_amount: priceNum },
          );
          if (consumeErr) throw consumeErr;
          consumed = Number(consumedRpc ?? 0);
        }

        const stillOwed = Math.max(priceNum - consumed, 0);
        if (stillOwed > 0.001) {
          const { error: epErr } = await supabase.from("expected_payments").insert({
            user_id: user!.id, appointment_id: appointmentId,
            client_id: clientId, amount: stillOwed, status: "pending",
            ...(isDemoMode ? { is_demo: true } : {}),
          } as any);
          if (epErr) throw epErr;
        }

        // Final status recalc (consume RPC already runs it, but rerun in case stillOwed changed nothing on row).
        await (supabase as any).rpc("recalc_appointment_payment_status", { p_appointment_id: appointmentId });
        return;
      }


      // Case B: paid_now / paid_in_advance — partial / full / overpayment.
      const received = Math.max(Number(amountPaid ?? priceNum), 0);

      await supabase
        .from("appointments")
        .update({ status: "completed", price: priceNum } as any)
        .eq("id", appointmentId);

      let leftover = received;
      let incomeId: string | null = null;

      if (received > 0) {
        const { data: incRow, error: incErr } = await supabase.from("income").insert({
          user_id: user!.id, appointment_id: appointmentId,
          client_id: clientId,
          amount: received, date: payDate, session_date: sessionDate ?? payDate, source: "appointment",
          payment_method: paymentMethod,
          ...(isDemoMode ? { is_demo: true } : {}),
        } as any).select("id").single();
        if (incErr) throw incErr;
        incomeId = (incRow as any)?.id ?? null;

        // 1) Close oldest debts of this client first (FIFO).
        if (clientId && incomeId) {
          const { data: leftoverRpc, error: debtErr } = await (supabase as any).rpc("apply_payment_to_client_debts", {
            p_user_id: user!.id,
            p_client_id: clientId,
            p_income_id: incomeId,
            p_amount: received,
          });
          if (debtErr) throw debtErr;
          leftover = Number(leftoverRpc ?? 0);
        }

        // 2) Apply leftover to current session.
        if (leftover > 0 && incomeId) {
          const allocateToCurrent = Math.min(leftover, priceNum);
          if (allocateToCurrent > 0) {
            await (supabase as any).from("income_session_allocations").insert({
              user_id: user!.id,
              income_id: incomeId,
              appointment_id: appointmentId,
              allocated_amount: allocateToCurrent,
              from_prepayment: false,
            } as any);
            leftover -= allocateToCurrent;
          }
        }

        // 3) Anything still left -> prepayment credit.
        if (leftover > 0.001 && clientId && incomeId) {
          await (supabase as any).from("client_credits").insert({
            user_id: user!.id,
            client_id: clientId,
            income_id: incomeId,
            amount: leftover,
            description: "Prepayment from session overpayment",
          } as any);
        }
      }

      // 4) If current session not fully covered by allocations, create an expected_payment for the gap.
      const { data: thisAllocs } = await (supabase as any)
        .from("income_session_allocations")
        .select("allocated_amount")
        .eq("appointment_id", appointmentId);
      const allocatedToThis = (thisAllocs ?? []).reduce((s: number, r: any) => s + Number(r.allocated_amount || 0), 0);
      const stillOwed = Math.max(priceNum - allocatedToThis, 0);
      if (stillOwed > 0.001) {
        await supabase.from("expected_payments").insert({
          user_id: user!.id, appointment_id: appointmentId,
          client_id: clientId, amount: stillOwed, status: "pending",
          ...(isDemoMode ? { is_demo: true } : {}),
        } as any);
      }

      // 5) Recalc payment_status for this appointment from allocations.
      await (supabase as any).rpc("recalc_appointment_payment_status", { p_appointment_id: appointmentId });
    },
    onSuccess: (_d, vars) => {
      track("session_completed", { payment_status: vars.paymentStatus });
      [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      qc.invalidateQueries({ queryKey: ["client-credit-balance"] });
      qc.invalidateQueries({ queryKey: ["client-debt"] });
      qc.invalidateQueries({ queryKey: ["expected-payments"] });
    },
  });
}

// Complete an appointment by consuming the client's prepayment balance (FIFO).
// Does NOT create new income — only allocates existing prepayment to this session.
export function useCompleteFromPrepayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, clientId, price }: { appointmentId: string; clientId: string; price: number }) => {
      const { error: aptErr } = await supabase
        .from("appointments")
        .update({ status: "completed", price, payment_status: "paid_from_prepayment" } as any)
        .eq("id", appointmentId);
      if (aptErr) throw aptErr;

      await supabase.from("income").delete().eq("appointment_id", appointmentId).eq("source", "appointment");
      await supabase.from("expected_payments").delete().eq("appointment_id", appointmentId);

      const { data, error } = await (supabase as any).rpc("consume_client_credit_for_appointment", {
        p_appointment_id: appointmentId,
        p_client_id: clientId,
        p_max_amount: Number(price),
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: () => {
      track("session_completed", { payment_status: "paid_from_prepayment" });
      [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      ["client-credit-balance", "client-allocations", "appointment-allocations", "payment-audit"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

// Reopen a finalized appointment back to scheduled, clearing income/expected/allocations
export function useReopenAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await supabase.from("income_session_allocations").delete().eq("appointment_id", id);
      await supabase.from("income").delete().eq("appointment_id", id);
      await supabase.from("expected_payments").delete().eq("appointment_id", id);
      const { error } = await supabase.from("appointments").update({
        status: "scheduled",
        payment_status: "not_applicable",
        cancellation_reason: null,
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { track("session_reopened"); [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

// Cancel/no-show
export function useCancelAppointment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  return useMutation({
    mutationFn: async ({
      id, status, clientId, price, cancellationReason, chargeFee = false,
    }: {
      id: string;
      status: "cancelled" | "no-show";
      clientId?: string;
      price?: number;
      cancellationReason?: string;
      /**
       * Whether the therapist explicitly chose to bill this cancelled / no-show
       * session. When false (default) the session becomes "not_applicable" and
       * is wiped from income/expected_payments. When true the session is
       * billable: payment_status = waiting_for_payment, plus an
       * expected_payment row is created for the full price.
       */
       chargeFee?: boolean;
    }) => {
      // Always clear any pre-existing income/expected so we start clean.
      await supabase.from("income").delete().eq("appointment_id", id);
      await supabase.from("expected_payments").delete().eq("appointment_id", id);

      const nextPaymentStatus = chargeFee ? "waiting_for_payment" : "not_applicable";
      const { error } = await supabase.from("appointments").update({
        status, payment_status: nextPaymentStatus,
        ...(cancellationReason ? { cancellation_reason: cancellationReason } : {}),
      } as any).eq("id", id);
      if (error) throw error;

      if (chargeFee && clientId && price && Number(price) > 0) {
        await supabase.from("expected_payments").insert({
          user_id: user!.id, appointment_id: id,
          client_id: clientId, amount: Number(price), status: "pending",
          ...(isDemoMode ? { is_demo: true } : {}),
        } as any);
      }

      // Group session attendance: if cancelled and not billable, mark N/A so it
      // is excluded from attendance stats. If billable we still mark N/A (the
      // attendance itself isn't tracked once cancelled).
      if (status === "cancelled") {
        const { data: gs } = await supabase
          .from("group_sessions" as any)
          .select("id")
          .eq("appointment_id", id)
          .maybeSingle();
        if ((gs as any)?.id) {
          await supabase.from("group_attendance" as any)
            .update({ status: "n_a" })
            .eq("group_session_id", (gs as any).id);
        }
      }
      void isDemoMode;
    },
    onSuccess: (_d, vars) => {
      track("session_canceled", { status: vars.status, charge_fee: !!vars.chargeFee });
      [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      qc.invalidateQueries({ queryKey: ["group-attendance"] });
      qc.invalidateQueries({ queryKey: ["group-all-attendance"] });
      qc.invalidateQueries({ queryKey: ["client-debt"] });
      qc.invalidateQueries({ queryKey: ["expected-payments"] });
    },
  });
}


// Bulk cancel appointments for day-off + send cancellation emails
export function useBulkCancelForDayOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentIds, reason }: { appointmentIds: string[]; reason: string }) => {
      for (const id of appointmentIds) {
        // Fetch appointment details for the cancellation email
        const { data: apt } = await supabase
          .from("appointments")
          .select("scheduled_at, clients(name, email, notification_preference), services(name)")
          .eq("id", id)
          .single();

        await supabase.from("income").delete().eq("appointment_id", id);
        await supabase.from("expected_payments").delete().eq("appointment_id", id);
        const { error } = await supabase.from("appointments").update({
          status: "cancelled",
          payment_status: "not_applicable",
          cancellation_reason: reason,
        } as any).eq("id", id);
        if (error) throw error;

        // If this appointment is a group session, mark all participant
        // attendance as N/A so the cancelled session is excluded from stats.
        const { data: gs } = await supabase
          .from("group_sessions" as any)
          .select("id")
          .eq("appointment_id", id)
          .maybeSingle();
        if ((gs as any)?.id) {
          await supabase.from("group_attendance" as any)
            .update({ status: "n_a" })
            .eq("group_session_id", (gs as any).id);
        }

        // Send cancellation email if client wants email notifications
        const client = (apt as any)?.clients;
        if (client?.email && ['email_only', 'email_and_telegram'].includes(client.notification_preference)) {
          const scheduledDate = new Date(apt!.scheduled_at);
          const { data: { user } } = await supabase.auth.getUser();
          let userLang = 'en';
          if (user) {
            const { data: prof } = await supabase.from('profiles').select('language').eq('user_id', user.id).maybeSingle();
            userLang = (prof as any)?.language || 'en';
          }
          const localeMap: Record<string, string> = { en: 'en-US', fr: 'fr-FR', pl: 'pl-PL', uk: 'uk-UA' };
          const emailLocale = localeMap[userLang] || 'en-US';
          supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "session-cancellation",
              recipientEmail: client.email,
              idempotencyKey: `session-cancel-${id}`,
              templateData: {
                clientName: client.name,
                sessionDate: scheduledDate.toLocaleDateString(emailLocale, {
                  weekday: "long", year: "numeric", month: "long", day: "numeric",
                }),
                sessionTime: scheduledDate.toLocaleTimeString(emailLocale, {
                  hour: "2-digit", minute: "2-digit",
                }),
                cancellationReason: reason,
                language: userLang,
              },
            },
          }).catch(err => console.error("Failed to send cancellation email", err));
        }
      }
    },
    onSuccess: () => {
      [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      qc.invalidateQueries({ queryKey: ["group-attendance"] });
      qc.invalidateQueries({ queryKey: ["group-all-attendance"] });
    },
  });
}

// Expected Payments
/**
 * Returns sessions that owe money. Derived directly from `appointments`
 * (the source of truth) joined with confirmed income allocations, so the
 * count and list always match Dashboard's "Unpaid sessions" metric and
 * the calendar's payment-status badges. Shape stays compatible with the
 * legacy `expected_payments` consumers (IncomePage pending tab).
 */
export function useExpectedPayments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["expected-payments", user?.id],
    queryFn: async () => {
      // ── 1. Identify appointments that belong to a group session so we can
      //       exclude them from the individual-debt query (group debts are
      //       tracked per participant in group_session_payments).
      const { data: groupAppts } = await supabase
        .from("group_sessions")
        .select("appointment_id");
      const groupAppointmentIds = new Set(
        ((groupAppts ?? []) as any[]).map((g) => g.appointment_id).filter(Boolean),
      );

      // ── 2. Individual unpaid / partially paid sessions.
      //    Includes cancelled / no-show sessions that the therapist explicitly
      //    chose to bill (payment_status = waiting_for_payment).
      const { data: apts, error } = await supabase
        .from("appointments")
        .select("id, price, client_id, scheduled_at, status, payment_status, services(name), clients(name)")
        .in("status", ["completed", "cancelled", "no-show"])
        .gt("price", 0)
        .in("payment_status", ["unpaid", "waiting_for_payment", "partially_paid", "partially_paid_from_prepayment"])
        .order("scheduled_at", { ascending: false });

      if (error) throw error;
      const indivList = ((apts ?? []) as any[]).filter(
        (a) => !groupAppointmentIds.has(a.id),
      );

      // Subtract any income allocations to get the true outstanding balance
      // (handles partial payments correctly).
      let paidByApt = new Map<string, number>();
      if (indivList.length > 0) {
        const ids = indivList.map((a) => a.id);
        const { data: allocs } = await supabase
          .from("income_session_allocations")
          .select("appointment_id, allocated_amount")
          .in("appointment_id", ids);
        for (const a of (allocs ?? []) as any[]) {
          paidByApt.set(
            a.appointment_id,
            (paidByApt.get(a.appointment_id) ?? 0) + Number(a.allocated_amount || 0),
          );
        }
      }

      const individualRows = indivList
        .map((a) => {
          const outstanding = Math.max(Number(a.price) - (paidByApt.get(a.id) ?? 0), 0);
          return {
            id: a.id,
            kind: "individual" as const,
            appointment_id: a.id,
            group_session_payment_id: null as string | null,
            client_id: a.client_id,
            amount: outstanding,
            status: "pending" as const,
            clients: a.clients,
            appointments: {
              scheduled_at: a.scheduled_at,
              status: a.status,
              services: a.services,
            },
          };
        })
        .filter((r) => r.amount > 0);

      // ── 3. Per-participant group session debts. One row per unpaid
      //       participant so debt count matches Payment Audit. Includes
      //       partially_paid_from_prepayment so participants whose prepaid
      //       balance only covered part of the price still appear here for
      //       the remaining gap.
      const { data: gPays } = await supabase
        .from("group_session_payments")
        .select(
          "id, amount, client_id, group_session_id, payment_state, expected_payment_id, clients(name), group_sessions(appointment_id, groups(name), appointments!group_sessions_appointment_id_fkey(scheduled_at, status))",
        )
        .in("payment_state", ["waiting_for_payment", "partially_paid_from_prepayment"])
        .gt("amount", 0);

      // For partial-from-prepayment rows the true outstanding amount is the
      // linked expected_payments row (price − prepaid). Fetch those once and
      // use them when present.
      const epIds = ((gPays ?? []) as any[])
        .map((p) => p.expected_payment_id)
        .filter(Boolean);
      const epAmountById = new Map<string, number>();
      if (epIds.length > 0) {
        const { data: epRows } = await supabase
          .from("expected_payments")
          .select("id, amount, status")
          .in("id", epIds);
        for (const r of (epRows ?? []) as any[]) {
          if (r.status === "pending") epAmountById.set(r.id, Number(r.amount));
        }
      }

      const groupRows = ((gPays ?? []) as any[])
        .map((p) => {
          const apt = p.group_sessions?.appointments;
          const outstanding = p.expected_payment_id && epAmountById.has(p.expected_payment_id)
            ? epAmountById.get(p.expected_payment_id)!
            : Number(p.amount);
          return {
            id: `gsp:${p.id}`,
            kind: "group" as const,
            appointment_id: p.group_sessions?.appointment_id ?? null,
            group_session_payment_id: p.id as string,
            client_id: p.client_id,
            amount: outstanding,
            status: "pending" as const,
            clients: p.clients,
            appointments: {
              scheduled_at: apt?.scheduled_at ?? null,
              status: apt?.status ?? "completed",
              services: { name: p.group_sessions?.groups?.name ?? "Group session" },
            },
          };
        })
        .filter((r) => r.amount > 0);

      const merged = [...individualRows, ...groupRows];
      merged.sort((a, b) => {
        const ad = a.appointments?.scheduled_at ?? "";
        const bd = b.appointments?.scheduled_at ?? "";
        return ad < bd ? 1 : ad > bd ? -1 : 0;
      });
      return merged;
    },
    enabled: !!user,
    staleTime: STALE_MEDIUM,
  });
}

export function useMarkExpectedPaymentPaid() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  return useMutation({
    mutationFn: async ({ id, appointmentId, amount, paymentMethod, paymentDate, kind, groupSessionPaymentId }: {
      id: string;
      appointmentId: string | null;
      amount: number;
      paymentMethod: string;
      paymentDate?: string;
      kind?: "individual" | "group";
      groupSessionPaymentId?: string | null;
    }) => {
      const today = new Date().toISOString().split("T")[0];
      const payDate = paymentDate || today;

      // ── Group session participant debt ─────────────────────────────────
      if (kind === "group" && groupSessionPaymentId) {
        // Fetch the payment row so we know the linked appointment / amount.
        const { data: gsp, error: gspErr } = await supabase
          .from("group_session_payments")
          .select("id, amount, client_id, expected_payment_id, group_sessions(appointment_id, appointments!group_sessions_appointment_id_fkey(scheduled_at))")

          .eq("id", groupSessionPaymentId)
          .single();
        if (gspErr) throw gspErr;
        const linkedAppointmentId = (gsp as any)?.group_sessions?.appointment_id ?? appointmentId;
        const sessionDate = (gsp as any)?.group_sessions?.appointments?.scheduled_at
          ? new Date((gsp as any).group_sessions.appointments.scheduled_at).toISOString().split("T")[0]
          : payDate;

        // Insert income for this participant.
        const { data: inc, error: incErr } = await supabase.from("income").insert({
          user_id: user!.id,
          appointment_id: linkedAppointmentId,
          client_id: (gsp as any)?.client_id ?? null,
          amount,
          date: payDate,
          session_date: sessionDate,
          source: "group_session",
          payment_method: paymentMethod,
          ...(isDemoMode ? { is_demo: true } : {}),
        } as any).select("id").single();
        if (incErr) throw incErr;

        // Update the participant payment row.
        const { error: updErr } = await supabase
          .from("group_session_payments")
          .update({
            payment_state: "paid_now",
            payment_method: paymentMethod,
            income_id: inc?.id ?? null,
          } as any)
          .eq("id", groupSessionPaymentId);
        if (updErr) throw updErr;

        // Resolve any linked expected_payments row.
        if ((gsp as any)?.expected_payment_id) {
          await supabase
            .from("expected_payments")
            .update({ status: "paid", paid_at: new Date().toISOString(), payment_method: paymentMethod } as any)
            .eq("id", (gsp as any).expected_payment_id);
        }
        return;
      }

      // ── Individual session debt (existing flow) ────────────────────────
      if (!appointmentId) throw new Error("appointmentId is required for individual debts");

      const { data: aptData } = await supabase
        .from("appointments")
        .select("scheduled_at")
        .eq("id", appointmentId)
        .single();
      const sessionDate = aptData?.scheduled_at
        ? new Date(aptData.scheduled_at).toISOString().split("T")[0]
        : payDate;

      // Clean up any legacy expected_payments rows for this appointment so the
      // pending list and dashboard counts (now both derived from appointments)
      // stay in sync. Missing rows are fine — the table is no longer the
      // source of truth.
      await supabase
        .from("expected_payments")
        .delete()
        .eq("appointment_id", appointmentId);

      await supabase.from("appointments").update({ payment_status: "paid_now" } as any).eq("id", appointmentId);

      const { error: incErr } = await supabase.from("income").insert({
        user_id: user!.id, appointment_id: appointmentId,
        amount, date: payDate, session_date: sessionDate, source: "appointment",
        payment_method: paymentMethod,
        ...(isDemoMode ? { is_demo: true } : {}),
      } as any);
      if (incErr) throw incErr;
    },
    onSuccess: (_d, vars) => { track("payment_marked_paid", { payment_method: vars.paymentMethod }); [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}


// Expenses
const EXPENSES_PAGE_SIZE = 50;

import {
  generateMonthlyOccurrences,
  generateYearlyOccurrences,
  isLastDayOfItsMonth,
} from "@/lib/recurringExpenses";

export interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: string; // "all" or undefined disables
  status?: "all" | "planned" | "paid" | "cancelled";
}

function applyExpenseFilters(query: any, filters?: ExpenseFilters) {
  if (!filters) return query;
  if (filters.dateFrom) query = query.gte("date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("date", filters.dateTo);
  if (filters.category && filters.category !== "all") query = query.eq("category", filters.category);
  if (filters.status && filters.status !== "all") query = query.eq("instance_status", filters.status);
  return query;
}

export function useExpenses(page = 0, filters?: ExpenseFilters) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["expenses", user?.id, page, filters?.dateFrom ?? null, filters?.dateTo ?? null, filters?.category ?? null, filters?.status ?? null],
    queryFn: async () => {
      const from = page * EXPENSES_PAGE_SIZE;
      const to = from + EXPENSES_PAGE_SIZE - 1;
      // Hide templates from the list view; users interact with instances.
      let q = supabase
        .from("expenses")
        .select("*", { count: "exact" })
        .eq("is_template", false);
      q = applyExpenseFilters(q, filters);
      const { data, error, count } = await q
        .order("date", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return { data: data ?? [], totalCount: count ?? 0, pageSize: EXPENSES_PAGE_SIZE };
    },
    enabled: !!user,
    staleTime: STALE_MEDIUM,
  });
}

/**
 * Server-side aggregates for the expenses list, applied with the same filters as
 * `useExpenses` but across ALL matching rows (not just the current page).
 */
export function useExpenseAggregates(filters?: ExpenseFilters) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["expenses-aggregates", user?.id, filters?.dateFrom ?? null, filters?.dateTo ?? null, filters?.category ?? null, filters?.status ?? null],
    queryFn: async () => {
      let q = supabase
        .from("expenses")
        .select("amount, category, is_recurring, payment_status, instance_status, date")
        .eq("is_template", false);
      q = applyExpenseFilters(q, filters);
      const { data, error } = await q.range(0, 9999);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const todayStr = new Date().toISOString().slice(0, 10);
      let total = 0, tax = 0, recurring = 0, unpaid = 0;
      for (const e of rows) {
        // Cancelled expenses are excluded from ALL financial aggregations.
        if (e.instance_status === "cancelled") continue;
        const amt = Number(e.amount) || 0;
        total += amt;
        if (e.category === "Tax") tax += amt;
        if (e.is_recurring) recurring += amt;
        // Unpaid only counts expenses that are actually due (date <= today).
        // Future-dated planned/unpaid expenses are forecasted, not unpaid.
        const dueOrPast = !e.date || e.date <= todayStr;
        if (e.payment_status === "unpaid" && e.instance_status !== "paid" && dueOrPast) {
          unpaid += amt;
        }
      }
      return { total, tax, recurring, unpaid, exTax: total - tax };
    },
    enabled: !!user,
    staleTime: STALE_MEDIUM,
  });
}

/** Distinct categories across all of the user's expenses (used to populate the category filter). */
export function useExpenseCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["expense-categories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("category")
        .eq("is_template", false)
        .range(0, 9999);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of (data ?? []) as any[]) if (r.category) set.add(r.category);
      return Array.from(set);
    },
    enabled: !!user,
    staleTime: STALE_MEDIUM,
  });
}

type RecurrenceKind = "one_time" | "monthly" | "yearly";

export function useCreateExpense() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  return useMutation({
    mutationFn: async (expense: {
      category: string;
      amount: number;
      date: string;
      description?: string;
      recurrence?: RecurrenceKind;
      // Legacy field name still accepted from older callers
      is_recurring?: boolean;
      recurring_start_date?: string | null;
      instance_status?: "planned" | "paid" | "cancelled";
      paid_date?: string | null;
    }) => {
      const recurrence: RecurrenceKind = expense.recurrence
        ?? (expense.is_recurring ? "monthly" : "one_time");

      // One-time expense: single row, no template.
      if (recurrence === "one_time") {
        const status = expense.instance_status || "planned";
        const row: any = attachDemoFlag({
          user_id: user!.id,
          category: expense.category,
          amount: expense.amount,
          date: expense.date,
          description: expense.description ?? null,
          is_recurring: false,
          is_template: false,
          instance_status: status,
          paid_date: status === "paid" ? (expense.paid_date || expense.date) : null,
          payment_status: status === "paid" ? "paid" : "unpaid",
        }, isDemoMode);
        const { data, error } = await supabase.from("expenses").insert(row).select().single();
        if (error) throw error;
        return data;
      }

      const startDate = expense.recurring_start_date || expense.date;
      if (!startDate) throw new Error("Recurring start date is required");
      const isLastDay = recurrence === "monthly" && isLastDayOfItsMonth(startDate);
      const groupId = crypto.randomUUID();

      // 1. Insert template row
      const tpl: any = attachDemoFlag({
        user_id: user!.id,
        category: expense.category,
        amount: expense.amount,
        date: startDate,
        description: expense.description ?? null,
        is_recurring: true,
        is_template: true,
        recurrence_type: recurrence,
        is_last_day_of_month: isLastDay,
        recurring_start_date: startDate,
        recurring_group_id: groupId,
        instance_status: "planned",
        payment_status: "unpaid",
      }, isDemoMode);
      const { data: template, error: tplErr } = await supabase
        .from("expenses").insert(tpl).select().single();
      if (tplErr) throw tplErr;

      // 2. Insert N instance rows (12 monthly, 5 yearly)
      const dates = recurrence === "monthly"
        ? generateMonthlyOccurrences(startDate, isLastDay, 12)
        : generateYearlyOccurrences(startDate, 5);
      const instanceRows = dates.map(d => attachDemoFlag({
        user_id: user!.id,
        category: expense.category,
        amount: expense.amount,
        date: d,
        description: expense.description ?? null,
        is_recurring: false,
        is_template: false,
        template_id: (template as any).id,
        recurring_group_id: groupId,
        instance_status: "planned",
        payment_status: "unpaid",
      }, isDemoMode));
      const { error: instErr } = await supabase.from("expenses").insert(instanceRows);
      if (instErr) throw instErr;

      return template;
    },
    onSuccess: (_d, vars) => {
      track("expense_created", { is_recurring: !!vars.is_recurring || vars.recurrence !== "one_time" });
      [...INVALIDATE_FINANCIAL, "expenses-aggregates", "expense-categories"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export type ExpenseEditScope = "single" | "future" | "series";

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scope = "single", ...updates }: {
      id: string;
      scope?: ExpenseEditScope;
      category?: string;
      amount?: number;
      date?: string;
      description?: string;
      instance_status?: "planned" | "paid" | "cancelled";
      paid_date?: string | null;
    }) => {
      // Look up the row to know if it's an instance and find its template.
      const { data: target, error: lookupErr } = await supabase
        .from("expenses").select("*").eq("id", id).single();
      if (lookupErr) throw lookupErr;
      const t: any = target;

      // Don't let user change `date` via edits; series structure handles dates.
      const { date: _ignoredDate, ...patch } = updates as any;

      if (scope === "single" || !t.template_id) {
        const { error } = await supabase.from("expenses").update(patch).eq("id", id);
        if (error) throw error;
        return;
      }

      const templateId = t.template_id;
      if (scope === "future") {
        // Update this instance + all future instances (skip already-paid ones).
        const { error } = await supabase.from("expenses").update(patch)
          .eq("template_id", templateId)
          .gte("date", t.date)
          .neq("instance_status", "paid");
        if (error) throw error;
        return;
      }
      // series: update template + all instances except already-paid ones
      const { error: tplErr } = await supabase.from("expenses").update(patch).eq("id", templateId);
      if (tplErr) throw tplErr;
      const { error: instErr } = await supabase.from("expenses").update(patch)
        .eq("template_id", templateId)
        .neq("instance_status", "paid");
      if (instErr) throw instErr;
    },
    onSuccess: () => { track("expense_updated"); [...INVALIDATE_FINANCIAL, "expenses-aggregates", "expense-categories"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

// Back-compat shim: old call sites passed `recurring_group_id` to update the whole series.
export function useUpdateExpenseSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recurring_group_id, ...updates }: { recurring_group_id: string; category?: string; amount?: number; description?: string }) => {
      const { error } = await (supabase.from("expenses") as any)
        .update(updates)
        .eq("recurring_group_id", recurring_group_id)
        .neq("instance_status", "paid");
      if (error) throw error;
    },
    onSuccess: () => { track("expense_updated", { scope: "series" }); [...INVALIDATE_FINANCIAL, "expenses-aggregates", "expense-categories"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | { id: string; scope?: ExpenseEditScope; deletePaid?: boolean }) => {
      const id = typeof input === "string" ? input : input.id;
      const scope: ExpenseEditScope = typeof input === "string" ? "single" : (input.scope || "single");
      const deletePaid = typeof input === "string" ? false : !!input.deletePaid;

      const { data: target, error: lookupErr } = await supabase
        .from("expenses").select("*").eq("id", id).single();
      if (lookupErr) throw lookupErr;
      const t: any = target;

      if (scope === "single" || !t.template_id) {
        const { error } = await supabase.from("expenses").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      const templateId = t.template_id;
      if (scope === "future") {
        let q: any = supabase.from("expenses").delete()
          .eq("template_id", templateId)
          .gte("date", t.date);
        if (!deletePaid) q = q.neq("instance_status", "paid");
        const { error } = await q;
        if (error) throw error;
        return;
      }
      // series: delete instances then template
      let q: any = supabase.from("expenses").delete().eq("template_id", templateId);
      if (!deletePaid) q = q.neq("instance_status", "paid");
      const { error: instErr } = await q;
      if (instErr) throw instErr;
      const { error: tplErr } = await supabase.from("expenses").delete().eq("id", templateId);
      if (tplErr) throw tplErr;
    },
    onSuccess: () => { track("expense_deleted"); [...INVALIDATE_FINANCIAL, "expenses-aggregates", "expense-categories"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

// Income
const INCOME_PAGE_SIZE = 50;

export function useIncome(page = 0, dateFrom?: string, dateTo?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["income", user?.id, page, dateFrom ?? null, dateTo ?? null],
    queryFn: async () => {
      const from = page * INCOME_PAGE_SIZE;
      const to = from + INCOME_PAGE_SIZE - 1;
      let q = supabase
        .from("income")
        .select("*, appointments(clients(name), services(name))", { count: "exact" })
        .order("date", { ascending: false });
      if (dateFrom) q = q.gte("date", dateFrom);
      if (dateTo) q = q.lte("date", dateTo);
      const { data, error, count } = await q.range(from, to);
      if (error) throw error;
      return { data: data ?? [], totalCount: count ?? 0, pageSize: INCOME_PAGE_SIZE };
    },
    enabled: !!user,
    staleTime: STALE_MEDIUM,
  });
}

// Fetch all income rows (no pagination) — used by aggregate views like the
// Financial Overview where totals must include every record, not just page 0.
export function useAllIncome(dateFrom?: string, dateTo?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["income-all", user?.id, dateFrom ?? null, dateTo ?? null],
    queryFn: async () => {
      let q = supabase
        .from("income")
        .select("*, appointments(scheduled_at, clients(name), services(name))")
        .order("date", { ascending: false })
        .range(0, 9999);
      if (dateFrom) q = q.gte("date", dateFrom);
      if (dateTo) q = q.lte("date", dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: STALE_MEDIUM,
  });
}

export function useIncomeSum(dateFrom?: string, dateTo?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["income-sum", user?.id, dateFrom ?? null, dateTo ?? null],
    queryFn: async () => {
      let q = supabase.from("income").select("amount");
      if (dateFrom) q = q.gte("date", dateFrom);
      if (dateTo) q = q.lte("date", dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
    },
    enabled: !!user,
    staleTime: STALE_MEDIUM,
  });
}

export function useCreateIncome() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (income: { amount: number; date: string; description?: string; source?: string; appointment_id?: string; payment_method?: string; client_id?: string | null }) => {
      assertCanWrite();
      const { data, error } = await supabase.from("income").insert({ ...income, user_id: user!.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    // Analytics: a new income entry was created
    onSuccess: (_d, vars) => { track("income_created", { source: vars.source }); ["income", "income-all", "income-sum", "dashboard-stats", "client-income", "tax-accrual-status"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

// Client Income (for paid/prepaid session calculation)
export function useClientIncome(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-income", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("income")
        .select("*")
        .eq("client_id", clientId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!clientId,
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (id: string) => {
      assertCanWrite();
      const { error } = await supabase.from("income").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { track("income_deleted"); ["income", "income-all", "income-sum", "dashboard-stats", "tax-accrual-status"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

// Profile
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: STALE_LONG,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    // Personal/account settings (language, currency, profile info, working preferences)
    // must always be editable regardless of subscription/demo state.
    mutationFn: async (updates: { full_name?: string; business_name?: string; phone?: string; language?: string; reminder_minutes?: number; work_hours_start?: string; work_hours_end?: string; time_format?: string; default_duration?: number; currency?: string; business_id?: string; tax_id_type?: string; business_country?: string; business_address?: string; vat_mode?: string; vat_rate?: number; onboarding_completed?: boolean; income_recognition_method?: string; avatar_url?: string | null; show_practice_profile_on_booking?: boolean; public_email?: string | null }) => {
      const { error } = await supabase.from("profiles").update(updates as any).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      track("profile_updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
      // If recognition method changed, recompute analytics that group income by date
      if (vars.income_recognition_method !== undefined) {
        ["dashboard-stats", "income", "income-all", "income-sum", "client-income", "tax-accrual-status"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      }
    },
  });
}

// Working Schedule (per-weekday)
export function useWorkingSchedule() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["working-schedule", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("working_schedule").select("*").order("day_of_week");
      if (error) throw error;
      return data as Array<{
        id: string; user_id: string; day_of_week: number;
        is_working: boolean; start_time: string; end_time: string;
      }>;
    },
    enabled: !!user,
    staleTime: STALE_LONG,
  });
}

export function useUpsertWorkingSchedule() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    // Working schedule is a personal preference — always editable.
    mutationFn: async (days: Array<{ day_of_week: number; is_working: boolean; start_time: string; end_time: string }>) => {
      await supabase.from("working_schedule").delete().eq("user_id", user!.id);
      if (days.length > 0) {
        const { error } = await supabase.from("working_schedule").insert(
          days.map(d => ({ ...d, user_id: user!.id })) as any
        );
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["working-schedule"] }),
  });
}

// Days Off
export function useDaysOff() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["days-off", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("days_off").select("*").order("date");
      if (error) throw error;
      return data as Array<{
        id: string; user_id: string; date: string; type: string;
        label: string | null; custom_start_time: string | null;
        custom_end_time: string | null; is_non_working: boolean;
      }>;
    },
    enabled: !!user,
    staleTime: STALE_LONG,
  });
}

export function useCreateDayOff() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (dayOff: {
      date: string; type: string; label?: string;
      custom_start_time?: string; custom_end_time?: string; is_non_working?: boolean;
    }) => {
      assertCanWrite();
      const { data, error } = await supabase.from("days_off")
        .insert({ ...dayOff, user_id: user!.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["days-off"] });
      await qc.refetchQueries({ queryKey: ["days-off"], type: "active" });
    },
  });
}

export function useDeleteDayOff() {
  const qc = useQueryClient();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (id: string) => {
      assertCanWrite();
      const { error } = await supabase.from("days_off").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["days-off"] });
      await qc.refetchQueries({ queryKey: ["days-off"], type: "active" });
    },
  });
}

// Breakeven Goals
export function useBreakevenGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["breakeven-goals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("breakeven_goals").select("*").order("goal_number");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: STALE_LONG,
  });
}

export function useUpsertBreakevenGoals() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (goals: Array<{ goal_number: number; label: string; description: string; fixed_expenses: number; desired_income: number; buffer: number; goal_type?: string }>) => {
      assertCanWrite();
      await supabase.from("breakeven_goals").delete().eq("user_id", user!.id);
      if (goals.length > 0) {
        const { error } = await supabase.from("breakeven_goals").insert(
          goals.map(g => ({ ...g, user_id: user!.id })) as any
        );
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["breakeven-goals"] }),
  });
}

// Tax Settings
export function useTaxSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tax-settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tax_settings").select("*").order("created_at");
      if (error) throw error;
      return data as Array<{
        id: string; user_id: string; tax_name: string; tax_type: string;
        tax_rate: number; fixed_amount: number; frequency: string;
        is_active: boolean; calculate_on: string; start_calculation_date: string;
      }>;
    },
    enabled: !!user,
    staleTime: STALE_LONG,
  });
}

export function useCreateTaxSetting() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (tax: {
      tax_name: string; tax_type: string; tax_rate?: number;
      fixed_amount?: number; frequency?: string; calculate_on?: string;
      start_calculation_date?: string;
    }) => {
      assertCanWrite();
      const { data, error } = await supabase.from("tax_settings")
        .insert({ ...tax, user_id: user!.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-settings"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
  });
}

export function useUpdateTaxSetting() {
  const qc = useQueryClient();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string; tax_name?: string; tax_type?: string; tax_rate?: number;
      fixed_amount?: number; frequency?: string; is_active?: boolean; calculate_on?: string;
      start_calculation_date?: string;
    }) => {
      assertCanWrite();
      const { error } = await supabase.from("tax_settings").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-settings"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); qc.invalidateQueries({ queryKey: ["expenses"] }); },
  });
}

export function useDeleteTaxSetting() {
  const qc = useQueryClient();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (id: string) => {
      assertCanWrite();
      const { error } = await supabase.from("tax_settings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-settings"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); qc.invalidateQueries({ queryKey: ["expenses"] }); },
  });
}

// Generate tax expense entries from a tax rule
export function useGenerateTaxExpenses() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ taxSettingId, entries }: {

      taxSettingId: string;
      entries: Array<{ date: string; amount: number; description: string }>;
    }) => {
      assertCanWrite();

      // Fetch existing auto-generated rows so we can preserve user-edited
      // payment_status / paid_date instead of wiping them on every sync.
      const { data: existing } = await supabase
        .from("expenses")
        .select("id, date, amount, description, payment_status, paid_date")
        .eq("tax_setting_id", taxSettingId);
      const existingByDate = new Map<string, any>();
      for (const row of (existing ?? []) as any[]) {
        existingByDate.set(row.date, row);
      }

      const newDates = new Set(entries.map(e => e.date));
      const toInsert: any[] = [];
      const toUpdate: Array<{ id: string; amount: number; description: string }> = [];

      for (const e of entries) {
        const match = existingByDate.get(e.date);
        if (match) {
          // Only push update if amount/description actually changed — keep
          // user-edited payment_status & paid_date untouched.
          if (Number(match.amount) !== Number(e.amount) || (match.description ?? "") !== e.description) {
            toUpdate.push({ id: match.id, amount: e.amount, description: e.description });
          }
        } else {
          toInsert.push({
            user_id: user!.id,
            category: "Tax",
            amount: e.amount,
            date: e.date,
            description: e.description,
            is_recurring: true,
            tax_setting_id: taxSettingId,
            payment_status: "unpaid",
          });
        }
      }

      // Delete rows whose period no longer exists in the new schedule.
      const staleIds = ((existing ?? []) as any[])
        .filter(r => !newDates.has(r.date))
        .map(r => r.id);
      if (staleIds.length > 0) {
        await supabase.from("expenses").delete().in("id", staleIds);
      }

      for (const u of toUpdate) {
        await supabase.from("expenses")
          .update({ amount: u.amount, description: u.description } as any)
          .eq("id", u.id);
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from("expenses").insert(toInsert as any);
        if (error) throw error;
      }
      return entries.length;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["tax-accrual-status"] });
    },
  });
}

/**
 * Auto-sync tax accrual expenses for all active tax rules.
 *
 * Pulls confirmed income (and existing non-tax expenses for profit/expense-based
 * rules), groups them by month / quarter, and replaces the auto-generated
 * tax expense rows for each rule. Triggered on app load via AppLayout.
 */
export function useTaxAccrualSync() {
  const { user } = useAuth();
  const { data: taxSettings = [] } = useTaxSettings();
  const generate = useGenerateTaxExpenses();
  const lastSyncSig = useRef<string>("");
  const inFlight = useRef(false);

  useEffect(() => {
    if (!user) return;
    const active = (taxSettings as any[]).filter(t => t.is_active);
    if (active.length === 0) return;
    const sig = `${user.id}|${JSON.stringify(active.map(t => [t.id, t.tax_rate, t.fixed_amount, t.tax_type, t.frequency, t.calculate_on, t.start_calculation_date]))}`;
    if (lastSyncSig.current === sig || inFlight.current) return;
    lastSyncSig.current = sig;
    inFlight.current = true;
    let cancelled = false;

    (async () => {
      try {
        // Confirmed income grouped by month + quarter
        const { data: incomeRows } = await supabase
          .from("income")
          .select("amount, date, status")
          .eq("status", "confirmed");
        const monthIncome = new Map<string, number>();
        const quarterIncome = new Map<string, number>();
        for (const r of (incomeRows ?? []) as any[]) {
          const d = new Date(r.date + "T12:00:00");
          const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const qKey = `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
          monthIncome.set(mKey, (monthIncome.get(mKey) || 0) + Number(r.amount));
          quarterIncome.set(qKey, (quarterIncome.get(qKey) || 0) + Number(r.amount));
        }

        // Non-tax expenses for profit / expense-based calculations
        const { data: expenseRows } = await supabase
          .from("expenses")
          .select("amount, date, category, tax_setting_id, instance_status, is_template");
        const monthExpense = new Map<string, number>();
        const quarterExpense = new Map<string, number>();
        for (const r of (expenseRows ?? []) as any[]) {
          if (r.is_template) continue;
          if (r.instance_status === "cancelled") continue;
          if (r.category === "Tax" || r.tax_setting_id) continue;
          const d = new Date(r.date + "T12:00:00");
          const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const qKey = `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
          monthExpense.set(mKey, (monthExpense.get(mKey) || 0) + Number(r.amount));
          quarterExpense.set(qKey, (quarterExpense.get(qKey) || 0) + Number(r.amount));
        }

        const { generateTaxExpensePeriods } = await import("@/lib/taxExpenseGenerator");
        const today = new Date();
        const horizon = new Date(today.getFullYear(), today.getMonth() + 1, 1);

        for (const tax of active) {
          if (cancelled) return;
          const incomeMap = tax.frequency === "quarterly" ? quarterIncome : monthIncome;
          const expenseMap = tax.frequency === "quarterly" ? quarterExpense : monthExpense;
          const periods = generateTaxExpensePeriods(tax as any, horizon, incomeMap, expenseMap);
          // Skip rules where nothing accrued yet (e.g. configured today, no completed period)
          await generate.mutateAsync({
            taxSettingId: tax.id,
            entries: periods.map(p => ({ date: p.date, amount: p.amount, description: p.description })),
          });
        }
      } catch (err) {
        // Non-fatal: surface to console but do not crash the app
        console.warn("Tax accrual sync failed", err);
      } finally {
        inFlight.current = false;
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, JSON.stringify((taxSettings as any[]).map(t => [t.id, t.is_active, t.tax_rate, t.fixed_amount, t.tax_type, t.frequency, t.calculate_on, t.start_calculation_date]))]);
}

/**
 * Compute, per active tax rule, whether the stored auto-generated expense
 * rows still match what the current income/expense data would produce.
 * Used to surface a "Needs update" indicator next to percentage taxes.
 */
export function useTaxAccrualStatus() {
  const { user } = useAuth();
  const { data: taxSettings = [] } = useTaxSettings();
  return useQuery({
    queryKey: ["tax-accrual-status", user?.id, (taxSettings as any[]).map(t => t.id).join(",")],
    enabled: !!user && (taxSettings as any[]).length > 0,
    staleTime: 15_000,
    queryFn: async () => {
      const { data: incomeRows } = await supabase.from("income").select("amount, date, status").eq("status", "confirmed");
      const monthIncome = new Map<string, number>();
      const quarterIncome = new Map<string, number>();
      for (const r of (incomeRows ?? []) as any[]) {
        const d = new Date(r.date + "T12:00:00");
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const qKey = `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
        monthIncome.set(mKey, (monthIncome.get(mKey) || 0) + Number(r.amount));
        quarterIncome.set(qKey, (quarterIncome.get(qKey) || 0) + Number(r.amount));
      }
      const { data: expenseRows } = await supabase.from("expenses").select("amount, date, category, tax_setting_id, instance_status, is_template");
      const monthExpense = new Map<string, number>();
      const quarterExpense = new Map<string, number>();
      for (const r of (expenseRows ?? []) as any[]) {
        if (r.is_template) continue;
        if (r.instance_status === "cancelled") continue;
        if (r.category === "Tax" || r.tax_setting_id) continue;
        const d = new Date(r.date + "T12:00:00");
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const qKey = `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
        monthExpense.set(mKey, (monthExpense.get(mKey) || 0) + Number(r.amount));
        quarterExpense.set(qKey, (quarterExpense.get(qKey) || 0) + Number(r.amount));
      }
      const { generateTaxExpensePeriods } = await import("@/lib/taxExpenseGenerator");
      const today = new Date();
      const horizon = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const result: Record<string, { needsUpdate: boolean; expected: Array<{ date: string; amount: number; description: string }> }> = {};
      for (const tax of taxSettings as any[]) {
        if (!tax.is_active) {
          result[tax.id] = { needsUpdate: false, expected: [] };
          continue;
        }
        const incomeMap = tax.frequency === "quarterly" ? quarterIncome : monthIncome;
        const expenseMap = tax.frequency === "quarterly" ? quarterExpense : monthExpense;
        const periods = generateTaxExpensePeriods(tax as any, horizon, incomeMap, expenseMap);
        const expected = periods.map(p => ({ date: p.date, amount: p.amount, description: p.description }));
        const stored = (expenseRows ?? []).filter((r: any) => r.tax_setting_id === tax.id) as any[];
        // Build a per-entry signature (date + rounded amount) so we detect
        // ANY mismatch — added/removed periods or amount changes — not just totals.
        const sigOf = (rows: Array<{ date: string; amount: number }>) =>
          rows
            .map(r => `${r.date}:${Math.round(Number(r.amount) * 100)}`)
            .sort()
            .join("|");
        const expectedSig = sigOf(expected);
        const storedSig = sigOf(stored.map((r: any) => ({ date: r.date, amount: Number(r.amount) })));
        const needsUpdate = tax.tax_type === "percentage" && expectedSig !== storedSig;
        result[tax.id] = { needsUpdate, expected };
      }
      return result;
    },
  });
}





export function useUpdateExpensePaymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payment_status }: { id: string; payment_status: string }) => {
      const isPaid = payment_status === "paid";
      const patch: any = {
        payment_status,
        instance_status: isPaid ? "paid" : "planned",
        paid_date: isPaid ? new Date().toISOString().slice(0, 10) : null,
      };
      const { error } = await supabase.from("expenses").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      [...INVALIDATE_FINANCIAL, "expenses-aggregates", "expense-categories"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

// Recurring Rules
export function useRecurringRules() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recurring-rules", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("recurring_rules").select("*, clients(name), services(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: STALE_LONG,
  });
}

export function useCreateRecurringRule() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  return useMutation({
    mutationFn: async (rule: {
      client_id: string; service_id: string; time: string; duration_minutes: number;
      price: number; notes?: string; recurrence_type: string; interval_weeks: number;
      days_of_week: number[]; start_date: string; end_date?: string;
      // When the caller already created the first occurrence (for instant UI
      // feedback), pass its id here. We link it to the new rule and skip that
      // slot from the generated batch to avoid duplicate appointments.
      firstAppointmentId?: string;
    }) => {
      const { firstAppointmentId, ...ruleInput } = rule;
      const { data: ruleData, error: ruleErr } = await supabase.from("recurring_rules")
        .insert({ ...ruleInput, user_id: user!.id } as any).select().single();
      if (ruleErr) throw ruleErr;

      let skipMs: number | null = null;
      if (firstAppointmentId) {
        const { data: firstApt } = await supabase
          .from("appointments")
          .select("scheduled_at")
          .eq("id", firstAppointmentId)
          .maybeSingle();
        const at = (firstApt as any)?.scheduled_at as string | undefined;
        skipMs = at ? new Date(at).getTime() : null;
        await supabase
          .from("appointments")
          .update({ recurring_rule_id: (ruleData as any).id } as any)
          .eq("id", firstAppointmentId);
      }

      const appointments = generateRecurringAppointments(ruleData as any, user!.id)
        .filter((apt) => skipMs === null || new Date(apt.scheduled_at).getTime() !== skipMs)
        .map((apt) => attachDemoFlag(apt, isDemoMode));
      if (appointments.length > 0) {
        const { error: aptErr } = await supabase.from("appointments").insert(appointments as any);
        if (aptErr) throw aptErr;
      }
      return { rule: ruleData, count: appointments.length + (firstAppointmentId ? 1 : 0) };
    },
    onSuccess: () => { [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL, "recurring-rules"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

export function useEditRecurringAppointments() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  return useMutation({
    mutationFn: async ({ ruleId, scope, appointmentId, updates, deltaMs, recurrenceUpdates }: {
      ruleId: string; scope: "this" | "following" | "all"; appointmentId: string;
      updates: { client_id?: string; service_id?: string; duration_minutes?: number; price?: number; notes?: string };
      deltaMs?: number;
      recurrenceUpdates?: { days_of_week?: number[]; interval_weeks?: number };
    }) => {
      const fieldUpdates: Record<string, any> = {};
      if (updates.client_id !== undefined) fieldUpdates.client_id = updates.client_id;
      if (updates.service_id !== undefined) fieldUpdates.service_id = updates.service_id;
      if (updates.duration_minutes !== undefined) fieldUpdates.duration_minutes = updates.duration_minutes;
      if (updates.price !== undefined) fieldUpdates.price = updates.price;
      if (updates.notes !== undefined) fieldUpdates.notes = updates.notes;

      if (scope === "this") {
        const thisUpdates: Record<string, any> = { ...fieldUpdates };
        if (deltaMs) {
          const oldScheduled = new Date((await supabase.from("appointments").select("scheduled_at").eq("id", appointmentId).single()).data!.scheduled_at);
          thisUpdates.scheduled_at = new Date(oldScheduled.getTime() + deltaMs).toISOString();
        }
        const { error } = await supabase.from("appointments").update(thisUpdates as any).eq("id", appointmentId);
        if (error) throw error;
      } else if (recurrenceUpdates && (recurrenceUpdates.days_of_week || recurrenceUpdates.interval_weeks)) {
        // Recurrence pattern changed — update the rule and regenerate future appointments
        const ruleUpdates: Record<string, any> = {};
        if (recurrenceUpdates.days_of_week) ruleUpdates.days_of_week = recurrenceUpdates.days_of_week;
        if (recurrenceUpdates.interval_weeks) ruleUpdates.interval_weeks = recurrenceUpdates.interval_weeks;
        // Also update field-level changes on the rule
        if (updates.client_id) ruleUpdates.client_id = updates.client_id;
        if (updates.service_id) ruleUpdates.service_id = updates.service_id;
        if (updates.duration_minutes) ruleUpdates.duration_minutes = updates.duration_minutes;
        if (updates.price !== undefined) ruleUpdates.price = updates.price;
        if (updates.notes !== undefined) ruleUpdates.notes = updates.notes;

        const { error: ruleErr } = await supabase.from("recurring_rules").update(ruleUpdates as any).eq("id", ruleId);
        if (ruleErr) throw ruleErr;

        // Get updated rule
        const { data: updatedRule } = await supabase.from("recurring_rules").select("*").eq("id", ruleId).single();
        if (!updatedRule) throw new Error("Rule not found");

        // Determine cutoff: for "following", use current appointment's scheduled_at; for "all", use rule start
        const activeStatuses = ["scheduled", "confirmed", "reminder_sent"];
        let cutoffDate: string;
        if (scope === "following") {
          const { data: apt } = await supabase.from("appointments").select("scheduled_at").eq("id", appointmentId).single();
          cutoffDate = apt!.scheduled_at;
        } else {
          cutoffDate = new Date(0).toISOString(); // all
        }

        // Delete future active appointments
        const { data: toDelete } = await supabase.from("appointments").select("id, status, scheduled_at")
          .eq("recurring_rule_id", ruleId).gte("scheduled_at", cutoffDate);
        for (const a of toDelete || []) {
          if (!activeStatuses.includes(a.status)) continue;
          await supabase.from("income").delete().eq("appointment_id", a.id);
          await supabase.from("expected_payments").delete().eq("appointment_id", a.id);
          await supabase.from("appointments").delete().eq("id", a.id);
        }

        // Regenerate from cutoff
        const ruleForGen = { ...updatedRule };
        if (scope === "following") {
          const cutoff = new Date(cutoffDate);
          const y = cutoff.getUTCFullYear(), m = cutoff.getUTCMonth() + 1, d = cutoff.getUTCDate();
          ruleForGen.start_date = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        }
        const newApts = generateRecurringAppointments(ruleForGen, user!.id)
          .map((apt) => attachDemoFlag(apt, isDemoMode));
        if (newApts.length > 0) {
          const { error: insErr } = await supabase.from("appointments").insert(newApts as any);
          if (insErr) throw insErr;
        }
      } else if (scope === "following") {
        const { data: apt } = await supabase.from("appointments").select("scheduled_at").eq("id", appointmentId).single();
        if (apt) {
          const { data: futureApts } = await supabase.from("appointments").select("id, scheduled_at, status")
            .eq("recurring_rule_id", ruleId).gte("scheduled_at", apt.scheduled_at);
          const activeStatuses = ["scheduled", "confirmed", "reminder_sent"];
          for (const a of futureApts || []) {
            if (!activeStatuses.includes(a.status)) continue;
            const perAptUpdates: Record<string, any> = { ...fieldUpdates };
            if (deltaMs) {
              perAptUpdates.scheduled_at = new Date(new Date(a.scheduled_at).getTime() + deltaMs).toISOString();
            }
            await supabase.from("appointments").update(perAptUpdates as any).eq("id", a.id);
          }
        }
      } else if (scope === "all") {
        const { data: allApts } = await supabase.from("appointments").select("id, status, scheduled_at")
          .eq("recurring_rule_id", ruleId);
        const activeStatuses = ["scheduled", "confirmed", "reminder_sent"];
        for (const a of allApts || []) {
          if (!activeStatuses.includes(a.status)) continue;
          const perAptUpdates: Record<string, any> = { ...fieldUpdates };
          if (deltaMs) {
            perAptUpdates.scheduled_at = new Date(new Date(a.scheduled_at).getTime() + deltaMs).toISOString();
          }
          await supabase.from("appointments").update(perAptUpdates as any).eq("id", a.id);
        }
      }
    },
    onSuccess: () => { [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL, "recurring-rules"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

export function useDeleteRecurringAppointments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ruleId, scope, appointmentId }: { ruleId: string; scope: "this" | "following" | "all"; appointmentId?: string }): Promise<{ deleted: number; protected: number }> => {
      if (!ruleId) { const e: any = new Error("missing_rule_id"); e.code = "missing_rule_id"; throw e; }
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) { const e: any = new Error("not_authenticated"); e.code = "not_authenticated"; throw e; }

      // Build candidate query, always scoped by user + rule.
      let q = supabase.from("appointments")
        .select("id, scheduled_at, status, payment_status")
        .eq("user_id", userId)
        .eq("recurring_rule_id", ruleId);

      if (scope === "this") {
        if (!appointmentId) { const e: any = new Error("missing_appointment_id"); e.code = "missing_appointment_id"; throw e; }
        q = q.eq("id", appointmentId);
      } else if (scope === "following") {
        if (!appointmentId) { const e: any = new Error("missing_appointment_id"); e.code = "missing_appointment_id"; throw e; }
        const { data: cur, error: curErr } = await supabase
          .from("appointments").select("scheduled_at").eq("id", appointmentId).maybeSingle();
        if (curErr) throw curErr;
        if (!cur) { const e: any = new Error("appointment_not_found"); e.code = "appointment_not_found"; throw e; }
        q = q.gte("scheduled_at", cur.scheduled_at);
      }

      const { data: targets, error: tErr } = await q;
      if (tErr) throw tErr;
      const list = (targets || []) as any[];
      if (list.length === 0) { const e: any = new Error("no_appointments"); e.code = "no_appointments"; throw e; }

      const PROTECTED_PAYMENT = new Set([
        "paid_now", "paid_in_advance", "paid_from_prepayment",
        "partially_paid", "partially_paid_from_prepayment",
      ]);
      const isProtectedRow = (a: any) =>
        a.status === "completed" || PROTECTED_PAYMENT.has(a.payment_status);

      // Treat appointments with linked invoices as protected (historical record).
      const ids = list.map((a) => a.id);
      const { data: invs } = await supabase.from("invoices").select("appointment_id").in("appointment_id", ids);
      const invoicedIds = new Set((invs || []).map((i: any) => i.appointment_id));

      const safeIds: string[] = [];
      let protectedCount = 0;
      for (const a of list) {
        if (isProtectedRow(a) || invoicedIds.has(a.id)) protectedCount += 1;
        else safeIds.push(a.id);
      }

      if (scope === "this" && safeIds.length === 0) {
        const e: any = new Error("appointment_protected"); e.code = "appointment_protected"; throw e;
      }
      if (scope === "all" && protectedCount > 0) {
        const e: any = new Error("series_has_protected"); e.code = "series_has_protected"; throw e;
      }
      if (scope === "following" && safeIds.length === 0) {
        const e: any = new Error("all_following_protected"); e.code = "all_following_protected"; throw e;
      }

      if (safeIds.length > 0) {
        await supabase.from("income_session_allocations").delete().eq("user_id", userId).in("appointment_id", safeIds);
        await supabase.from("income").delete().eq("user_id", userId).in("appointment_id", safeIds);
        await supabase.from("expected_payments").delete().eq("user_id", userId).in("appointment_id", safeIds);
        const { error: dErr } = await supabase.from("appointments").delete().eq("user_id", userId).in("id", safeIds);
        if (dErr) throw dErr;
      }

      if (scope === "all" && protectedCount === 0) {
        await supabase.from("recurring_rules").delete().eq("id", ruleId).eq("user_id", userId);
      }

      return { deleted: safeIds.length, protected: protectedCount };
    },
    onSuccess: () => { [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL, "recurring-rules"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

function generateRecurringAppointments(rule: any, userId: string, maxWeeks = 12) {
  const appointments: any[] = [];
  // Parse start_date as UTC to avoid timezone shifts
  const [sy, sm, sd] = (rule.start_date as string).split("-").map(Number);
  const startDate = new Date(Date.UTC(sy, sm - 1, sd));
  const endDate = rule.end_date
    ? (() => { const [ey, em, ed] = (rule.end_date as string).split("-").map(Number); return new Date(Date.UTC(ey, em - 1, ed)); })()
    : null;
  const maxDate = endDate || new Date(Date.UTC(sy, 11, 31)); // default: end of current year
  const daysOfWeek: number[] = rule.days_of_week || [1];

  let currentWeekStart = new Date(startDate);
  const dayOfWeek = currentWeekStart.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + mondayOffset);

  const [h, m] = (rule.time || "09:00").split(":").map(Number);

  while (currentWeekStart <= maxDate) {
    for (const dow of daysOfWeek) {
      const aptDate = new Date(currentWeekStart);
      aptDate.setUTCDate(aptDate.getUTCDate() + (dow - 1));
      if (aptDate < startDate || aptDate > maxDate) continue;

      aptDate.setUTCHours(h, m, 0, 0);

      appointments.push({
        user_id: userId,
        client_id: rule.client_id,
        service_id: rule.service_id,
        scheduled_at: aptDate.toISOString(),
        duration_minutes: rule.duration_minutes,
        price: rule.price,
        notes: rule.notes || null,
        recurring_rule_id: rule.id,
      });
    }
    currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + (rule.interval_weeks || 1) * 7);
  }
  return appointments;
}

// Dashboard stats
export function useDashboardStats() {
  const { user } = useAuth();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const monthStart = today.substring(0, 7) + "-01";

  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - mondayOffset);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);

  const thisMondayStr = thisMonday.toISOString().split("T")[0];
  const lastMondayStr = lastMonday.toISOString().split("T")[0];
  const lastSundayStr = lastSunday.toISOString().split("T")[0];

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPastInMonth = now.getDate();
  const daysLeftInMonth = daysInMonth - daysPastInMonth;
  const monthEndStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  return useQuery({
    queryKey: ["dashboard-stats", user?.id, today],
    queryFn: async () => {
      // Fetch user's income recognition method
      const { data: profileSetting } = await supabase
        .from("profiles")
        .select("income_recognition_method")
        .eq("user_id", user!.id)
        .single();
      const recognitionField = (profileSetting as any)?.income_recognition_method === "session_date"
        ? "session_date"
        : "date";

      const [
        incomeRes, lastWeekIncomeRes, expenseRes, clientRes,
        todayAptRes, monthAptRes, profileRes, scheduleRes, daysOffRes,
        outstandingAptRes, monthClientsRes, archivedThisMonthRes, allClientsRes,
        activeClientsRes, futureAptsRes,
      ] = await Promise.all([
        supabase.from("income").select(`amount, ${recognitionField}`).gte(recognitionField, monthStart),
        supabase.from("income").select(`amount, ${recognitionField}`).gte(recognitionField, lastMondayStr).lte(recognitionField, lastSundayStr),
        // Instances are real rows now — just fetch this month's non-template rows.
        supabase.from("expenses").select("amount, date, instance_status").eq("is_template", false).gte("date", monthStart).lte("date", monthEndStr),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("appointments")
          .select("*, clients(name), services(name)")
          .gte("scheduled_at", today + "T00:00:00")
          .lt("scheduled_at", today + "T23:59:59")
          .order("scheduled_at"),
        supabase.from("appointments")
          .select("id, client_id, status, scheduled_at")
          .gte("scheduled_at", monthStart + "T00:00:00")
          .lte("scheduled_at", monthEndStr + "T23:59:59"),
        supabase.from("profiles")
          .select("working_days_per_week, sessions_per_day, default_duration")
          .eq("user_id", user!.id)
          .single(),
        supabase.from("working_schedule")
          .select("day_of_week, is_working, start_time, end_time"),
        supabase.from("days_off")
          .select("date, is_non_working, custom_start_time, custom_end_time")
          .gte("date", monthStart)
          .lte("date", today.substring(0, 7) + "-31"),
        // Outstanding balance: any payable session not fully paid. Mirrors
        // `useExpectedPayments` exactly so dashboard "Total debt" matches
        // Finance → Pending payments. Includes cancelled/no-show sessions
        // the therapist explicitly chose to bill (waiting_for_payment).
        // Group-session appointments are filtered out below and replaced by
        // per-participant rows from group_session_payments.
        supabase.from("appointments")
          .select("id, price, client_id, status, payment_status")
          .in("status", ["completed", "cancelled", "no-show"])
          .gt("price", 0)
          .in("payment_status", ["unpaid", "waiting_for_payment", "partially_paid", "partially_paid_from_prepayment"]),

        // For "new clients this month": first scheduled session per client
        supabase.from("appointments")
          .select("client_id, scheduled_at")
          .neq("status", "cancelled")
          .order("scheduled_at", { ascending: true }),
        // Archived this month
        supabase.from("clients")
          .select("id, archive_reason, archived_at")
          .eq("status", "archived")
          .gte("archived_at", monthStart + "T00:00:00")
          .lte("archived_at", monthEndStr + "T23:59:59"),
        // Fallback for new clients: created this month
        supabase.from("clients").select("id, created_at"),
        // Active clients for "without next session" metric
        supabase.from("clients").select("id").eq("status", "active"),
        // Future non-cancelled appointments for "without next session" metric
        supabase.from("appointments").select("client_id, status").gt("scheduled_at", new Date().toISOString()),
      ]);

      const dateOf = (row: any) => row[recognitionField];
      const monthIncome = incomeRes.data ?? [];
      const allExpenses = expenseRes.data ?? [];
      const todayIncome = monthIncome.filter((i: any) => dateOf(i) === today).reduce((s: number, i: any) => s + Number(i.amount), 0);
      const monthlyIncome = monthIncome.reduce((s: number, i: any) => s + Number(i.amount), 0);
      // Sum non-template expense rows in this month that are already real as of today:
      // paid up to today, or unpaid/planned with due date today or earlier.
      // Excludes cancelled and future-dated planned/unpaid (those are forecast, not actual).
      const monthlyExpenses = allExpenses
        .filter((e: any) => {
          if (e.instance_status === "cancelled") return false;
          if (e.instance_status === "paid") return !e.date || e.date <= today;
          return !e.date || e.date <= today;
        })
        .reduce((s: number, e: any) => s + Number(e.amount), 0);
      const thisWeekIncome = monthIncome.filter((i: any) => dateOf(i) >= thisMondayStr && dateOf(i) <= today).reduce((s: number, i: any) => s + Number(i.amount), 0);
      const lastWeekIncome = (lastWeekIncomeRes.data ?? []).reduce((s, i) => s + Number(i.amount), 0);

      const profile = profileRes.data as any;
      const schedule = (scheduleRes.data ?? []) as Array<{ day_of_week: number; is_working: boolean; start_time: string; end_time: string }>;
      const daysOff = (daysOffRes.data ?? []) as Array<{ date: string; is_non_working: boolean; custom_start_time: string | null; custom_end_time: string | null }>;

      const defaultDuration = profile?.default_duration ?? 60;
      const fallbackWorkDays = profile?.working_days_per_week ?? 5;
      const fallbackSessionsPerDay = profile?.sessions_per_day ?? 6;

      // Realistic capacity calculation
      const capacity = calculateCapacity(
        schedule, daysOff, defaultDuration, now,
        fallbackWorkDays, fallbackSessionsPerDay,
      );

      const monthlyAppointments = monthAptRes.data?.length ?? 0;

      // Weekly capacity with real data
      const weekAptRes = await supabase.from("appointments").select("id, scheduled_at, status")
        .gte("scheduled_at", thisMondayStr + "T00:00:00")
        .lt("scheduled_at", new Date(thisMonday.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] + "T00:00:00");
      const weekAppointments = (weekAptRes.data ?? []).filter(a => a.status !== "cancelled");
      const bookedSlots = weekAppointments.length;
      const freeSlots = Math.max(capacity.weeklyCapacity - bookedSlots, 0);

      // ===== Outstanding balance calculation =====
      // Source-of-truth alignment with useExpectedPayments:
      //   • individual sessions: appointment.price − confirmed allocations
      //   • group sessions: per-participant rows in group_session_payments
      // Group-session appointments are excluded from the individual pass so
      // they aren't double-counted.
      const { data: groupApptRows } = await supabase
        .from("group_sessions")
        .select("appointment_id");
      const groupAppointmentIds = new Set(
        ((groupApptRows ?? []) as any[]).map((g) => g.appointment_id).filter(Boolean),
      );

      const outstandingApts = ((outstandingAptRes.data ?? []) as Array<{ id: string; price: number; client_id: string }>)
        .filter((a) => !groupAppointmentIds.has(a.id));
      let outstandingBalance = 0;
      let unpaidSessionsCount = 0;
      if (outstandingApts.length > 0) {
        const aptIds = outstandingApts.map((a) => a.id);
        const { data: allocs } = await supabase
          .from("income_session_allocations")
          .select("appointment_id, allocated_amount")
          .in("appointment_id", aptIds);
        const allocByApt = new Map<string, number>();
        for (const a of allocs ?? []) {
          allocByApt.set(a.appointment_id, (allocByApt.get(a.appointment_id) ?? 0) + Number(a.allocated_amount || 0));
        }
        for (const apt of outstandingApts) {
          const paid = allocByApt.get(apt.id) ?? 0;
          const remaining = Math.max(Number(apt.price) - paid, 0);
          if (remaining > 0) {
            outstandingBalance += remaining;
            unpaidSessionsCount += 1;
          }
        }
      }

      // Per-participant group session debts. Mirror useExpectedPayments:
      // include partial-from-prepayment rows and use the linked
      // expected_payments amount when available so the dashboard total
      // reflects the true outstanding gap.
      const { data: gPays } = await supabase
        .from("group_session_payments")
        .select("amount, payment_state, expected_payment_id")
        .in("payment_state", ["waiting_for_payment", "partially_paid_from_prepayment"])
        .gt("amount", 0);
      const gEpIds = ((gPays ?? []) as any[]).map((p) => p.expected_payment_id).filter(Boolean);
      const gEpAmount = new Map<string, number>();
      if (gEpIds.length > 0) {
        const { data: epRows } = await supabase
          .from("expected_payments")
          .select("id, amount, status")
          .in("id", gEpIds);
        for (const r of (epRows ?? []) as any[]) {
          if (r.status === "pending") gEpAmount.set(r.id, Number(r.amount));
        }
      }
      for (const p of (gPays ?? []) as Array<{ amount: number; expected_payment_id: string | null }>) {
        const amt = p.expected_payment_id && gEpAmount.has(p.expected_payment_id)
          ? gEpAmount.get(p.expected_payment_id)!
          : Number(p.amount);
        if (amt > 0) {
          outstandingBalance += amt;
          unpaidSessionsCount += 1;
        }
      }

      // ===== Monthly metrics =====
      const monthApts = (monthAptRes.data ?? []) as Array<{ client_id: string; status: string; scheduled_at: string }>;
      // Match ClientsPage filter (activeThisMonth): exclude cancelled sessions
      const activeClientsThisMonth = new Set(
        monthApts.filter((a) => a.status !== "cancelled").map((a) => a.client_id)
      ).size;

      // New clients: first session date in current month
      const allApts = (monthClientsRes.data ?? []) as Array<{ client_id: string; scheduled_at: string }>;
      const firstSessionByClient = new Map<string, string>();
      for (const a of allApts) {
        if (!firstSessionByClient.has(a.client_id)) {
          firstSessionByClient.set(a.client_id, a.scheduled_at);
        }
      }
      const monthStartTs = new Date(monthStart + "T00:00:00").getTime();
      const monthEndTs = new Date(monthEndStr + "T23:59:59").getTime();
      let newClientsThisMonth = 0;
      const clientsWithSession = new Set<string>();
      for (const [cid, firstAt] of firstSessionByClient) {
        clientsWithSession.add(cid);
        const t = new Date(firstAt).getTime();
        if (t >= monthStartTs && t <= monthEndTs) newClientsThisMonth++;
      }
      // Fallback: clients with no sessions but created this month
      for (const c of (allClientsRes.data ?? []) as Array<{ id: string; created_at: string }>) {
        if (clientsWithSession.has(c.id)) continue;
        const t = new Date(c.created_at).getTime();
        if (t >= monthStartTs && t <= monthEndTs) newClientsThisMonth++;
      }

      const cancelledSessionsThisMonth = monthApts.filter((a) => a.status === "cancelled").length;

      const COMPLETED_REASONS = new Set(["completed", "therapy_completed", "training_completed", "service_completed"]);
      const DROPPED_REASONS = new Set(["client_paused", "client_stopped", "other"]);
      let completedTherapyThisMonth = 0;
      let droppedTherapyThisMonth = 0;
      for (const c of (archivedThisMonthRes.data ?? []) as Array<{ archive_reason: string | null }>) {
        const r = c.archive_reason ?? "other";
        if (COMPLETED_REASONS.has(r)) completedTherapyThisMonth++;
        else if (DROPPED_REASONS.has(r)) droppedTherapyThisMonth++;
        else droppedTherapyThisMonth++;
      }

      // ===== Lost income from cancellations this month =====
      const cancelledMonthRes = await supabase
        .from("appointments")
        .select("price")
        .eq("status", "cancelled")
        .gte("scheduled_at", monthStart + "T00:00:00")
        .lte("scheduled_at", monthEndStr + "T23:59:59");
      const lostIncomeThisMonth = (cancelledMonthRes.data ?? [])
        .reduce((s: number, a: any) => s + Number(a.price ?? 0), 0);

      // (unpaidSessionsCount computed above alongside outstandingBalance)

      // ===== Previous month for trend comparisons =====
      const prevMonthStartD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEndD = new Date(now.getFullYear(), now.getMonth(), 0);
      const prevMonthStart = prevMonthStartD.toISOString().split("T")[0];
      const prevMonthEnd = prevMonthEndD.toISOString().split("T")[0];
      const [prevMonthAptsRes, prevArchivedRes] = await Promise.all([
        supabase.from("appointments")
          .select("client_id, status, scheduled_at")
          .gte("scheduled_at", prevMonthStart + "T00:00:00")
          .lte("scheduled_at", prevMonthEnd + "T23:59:59"),
        supabase.from("clients")
          .select("archive_reason, archived_at")
          .eq("status", "archived")
          .gte("archived_at", prevMonthStart + "T00:00:00")
          .lte("archived_at", prevMonthEnd + "T23:59:59"),
      ]);
      const prevMonthApts = (prevMonthAptsRes.data ?? []) as Array<{ client_id: string; status: string; scheduled_at: string }>;
      const prevActiveClients = new Set(prevMonthApts.map(a => a.client_id)).size;
      const prevCancelled = prevMonthApts.filter(a => a.status === "cancelled").length;
      const prevMonthStartTs = prevMonthStartD.getTime();
      const prevMonthEndTs = new Date(prevMonthEnd + "T23:59:59").getTime();
      let prevNewClients = 0;
      for (const [, firstAt] of firstSessionByClient) {
        const t = new Date(firstAt).getTime();
        if (t >= prevMonthStartTs && t <= prevMonthEndTs) prevNewClients++;
      }
      let prevCompletedTherapy = 0, prevDroppedTherapy = 0;
      for (const c of (prevArchivedRes.data ?? []) as Array<{ archive_reason: string | null }>) {
        const r = c.archive_reason ?? "other";
        if (COMPLETED_REASONS.has(r)) prevCompletedTherapy++;
        else prevDroppedTherapy++;
      }

      // ===== Practice Health (all-time) =====
      const nowIso = new Date().toISOString();
      const [allClientsHealthRes, completedAptsCountRes, allAptsCountRes, cancelledAptsCountRes, allExpensesRes, allClientSessionsRes] = await Promise.all([
        supabase.from("clients").select("id, status, archive_reason"),
        // Conducted sessions: only realized (past) sessions with status=completed.
        // Future-dated "completed" rows are excluded so the count matches the
        // green completed sessions visible in Calendar.
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "completed").lte("scheduled_at", nowIso),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
        supabase.from("expenses").select("amount").eq("is_template", false).neq("instance_status", "cancelled"),
        supabase.from("appointments").select("client_id, scheduled_at, status").neq("status", "cancelled"),
      ]);
      const allClientsData = (allClientsHealthRes.data ?? []) as Array<{ id: string; status: string; archive_reason: string | null }>;
      const totalClients = allClientsData.length;
      const activeClientsTotal = allClientsData.filter(c => c.status === "active").length;
      const completedClientsTotal = allClientsData.filter(c => c.status === "archived" && COMPLETED_REASONS.has(c.archive_reason ?? "")).length;
      const conductedSessions = completedAptsCountRes.count ?? 0;
      const totalSessionsAll = allAptsCountRes.count ?? 0;
      const cancelledSessionsAll = cancelledAptsCountRes.count ?? 0;
      const completionRate = totalClients > 0 ? Math.round((completedClientsTotal / totalClients) * 100) : 0;
      const cancellationRate = totalSessionsAll > 0 ? Math.round((cancelledSessionsAll / totalSessionsAll) * 100) : 0;
      const allExpensesSum = (allExpensesRes.data ?? []).reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
      const sessionCost = conductedSessions > 0 ? allExpensesSum / conductedSessions : 0;
      // Avg therapy duration: only count realized (past, non-cancelled) sessions.
      // Future scheduled sessions must not inflate the duration.
      const nowTs = Date.now();
      const perClientDates = new Map<string, { min: number; max: number }>();
      for (const a of (allClientSessionsRes.data ?? []) as Array<{ client_id: string; scheduled_at: string; status: string }>) {
        const t = new Date(a.scheduled_at).getTime();
        if (!Number.isFinite(t) || t > nowTs) continue; // skip future sessions
        const cur = perClientDates.get(a.client_id);
        if (!cur) perClientDates.set(a.client_id, { min: t, max: t });
        else { if (t < cur.min) cur.min = t; if (t > cur.max) cur.max = t; }
      }
      let durSum = 0, durCount = 0;
      const MS_MONTH = 1000 * 60 * 60 * 24 * 30.4375;
      for (const v of perClientDates.values()) {
        const months = (v.max - v.min) / MS_MONTH;
        if (months >= 0) { durSum += months; durCount++; }
      }
      const avgTherapyMonths = durCount > 0 ? durSum / durCount : 0;


      // ===== Today debt =====
      const todayAptsTyped = (todayAptRes.data ?? []) as Array<{ id: string; price: number; payment_status: string; status: string }>;
      const PAID_SET = new Set(["paid_now", "paid_in_advance", "paid_from_prepayment"]);
      const todayUnpaidApts = todayAptsTyped.filter(a => a.status !== "cancelled" && !PAID_SET.has(a.payment_status));
      let todayDebt = 0;
      if (todayUnpaidApts.length) {
        const ids = todayUnpaidApts.map(a => a.id);
        const { data: tAllocs } = await supabase
          .from("income_session_allocations")
          .select("appointment_id, allocated_amount")
          .in("appointment_id", ids);
        const byApt = new Map<string, number>();
        for (const a of tAllocs ?? []) {
          byApt.set(a.appointment_id, (byApt.get(a.appointment_id) ?? 0) + Number(a.allocated_amount || 0));
        }
      for (const apt of todayUnpaidApts) {
          todayDebt += Math.max(Number(apt.price) - (byApt.get(apt.id) ?? 0), 0);
        }
      }

      // ===== Clients without next scheduled session =====
      const activeClientIds = new Set((activeClientsRes.data ?? []).map((c: any) => c.id));
      const clientsWithFutureApt = new Set(
        (futureAptsRes.data ?? [])
          .filter((a: any) => a.status !== "cancelled")
          .map((a: any) => a.client_id)
      );

      let clientsWithoutNextSession = 0;
      for (const cid of activeClientIds) {
        if (!clientsWithFutureApt.has(cid)) clientsWithoutNextSession++;
      }

      return {
        todayIncome, monthlyIncome, monthlyExpenses,
        netProfit: monthlyIncome - monthlyExpenses,
        clientCount: clientRes.count ?? 0,
        todayAppointments: todayAptRes.data ?? [],
        thisWeekIncome, lastWeekIncome,
        monthlyAppointments,
        maxMonthlyCapacity: capacity.totalMonthlyCapacity,
        remainingMonthlyCapacity: capacity.maxMonthlyCapacity,
        daysPastInMonth, daysLeftInMonth,
        weeklySlots: capacity.weeklyCapacity,
        bookedSlots, freeSlots,
        schedule,
        totalWorkingDays: capacity.totalWorkingDays,
        remainingWorkingDays: capacity.remainingWorkingDays,
        outstandingBalance,
        activeClientsThisMonth,
        newClientsThisMonth,
        completedTherapyThisMonth,
        droppedTherapyThisMonth,
        cancelledSessionsThisMonth,
        lostIncomeThisMonth,
        unpaidSessionsCount,
        todayDebt,
        clientsWithoutNextSession,
        prevActiveClients,
        prevNewClients,
        prevCompletedTherapy,
        prevDroppedTherapy,
        prevCancelled,
        totalClients,
        activeClientsTotal,
        completedClientsTotal,
        avgTherapyMonths,
        completionRate,
        cancellationRate,
        conductedSessions,
        sessionCost,
      };
    },
    enabled: !!user,
  });
}

// ===== Payment correction (manual edit of payment status from Calendar) =====
export interface PaymentCorrectionInput {
  appointmentId: string;
  clientId: string;
  amount: number;
  newPaymentStatus: "paid" | "unpaid";
  newPaymentDate?: string | null;
  newPaymentMethod?: string | null;
  correctionComment?: string;
}

export function useCorrectPayment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (input: PaymentCorrectionInput) => {
      assertCanWrite();
      const {
        appointmentId, clientId, amount,
        newPaymentStatus, newPaymentDate, newPaymentMethod, correctionComment,
      } = input;

      // Snapshot previous state from appointment + existing income/expected_payment
      const { data: aptData, error: aptFetchErr } = await supabase
        .from("appointments")
        .select("payment_status, scheduled_at")
        .eq("id", appointmentId)
        .single();
      if (aptFetchErr) throw aptFetchErr;

      const previousPaymentStatus: string | null = (aptData as any)?.payment_status ?? null;
      const sessionDate = aptData?.scheduled_at
        ? new Date(aptData.scheduled_at).toISOString().split("T")[0]
        : undefined;

      const { data: existingIncome } = await supabase
        .from("income")
        .select("id, date, payment_method")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false })
        .limit(1);
      const previousIncome = existingIncome?.[0];

      const { data: existingExpected } = await supabase
        .from("expected_payments")
        .select("id, payment_method, paid_at")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false })
        .limit(1);
      const previousExpected = existingExpected?.[0];

      const previousPaymentDate: string | null =
        (previousIncome?.date as string | undefined) ??
        (previousExpected?.paid_at ? new Date(previousExpected.paid_at).toISOString().split("T")[0] : null) ??
        null;
      const previousPaymentMethod: string | null =
        (previousIncome?.payment_method as string | undefined) ??
        (previousExpected?.payment_method as string | undefined) ??
        null;

      // Always wipe existing income / expected payments for this appointment to prevent duplicates
      await supabase.from("income").delete().eq("appointment_id", appointmentId);
      await supabase.from("expected_payments").delete().eq("appointment_id", appointmentId);

      const newAppointmentPaymentStatus = newPaymentStatus === "paid" ? "paid_now" : "unpaid";

      const { error: aptUpdErr } = await supabase
        .from("appointments")
        .update({ payment_status: newAppointmentPaymentStatus } as any)
        .eq("id", appointmentId);
      if (aptUpdErr) throw aptUpdErr;

      let storedNewPaymentDate: string | null = null;
      let storedNewPaymentMethod: string | null = null;

      if (newPaymentStatus === "paid") {
        const today = new Date().toISOString().split("T")[0];
        const payDate = newPaymentDate || today;
        const method = newPaymentMethod || "cash";
        storedNewPaymentDate = payDate;
        storedNewPaymentMethod = method;
        const { error: incErr } = await supabase.from("income").insert({
          user_id: user!.id,
          appointment_id: appointmentId,
          client_id: clientId,
          amount,
          date: payDate,
          session_date: sessionDate ?? payDate,
          source: "appointment",
          payment_method: method,
          ...(isDemoMode ? { is_demo: true } : {}),
        } as any);
        if (incErr) throw incErr;
      }

      // Audit history record
      const { error: histErr } = await supabase.from("payment_corrections" as any).insert({
        user_id: user!.id,
        appointment_id: appointmentId,
        previous_payment_status: previousPaymentStatus,
        new_payment_status: newAppointmentPaymentStatus,
        previous_payment_date: previousPaymentDate,
        new_payment_date: storedNewPaymentDate,
        previous_payment_method: previousPaymentMethod,
        new_payment_method: storedNewPaymentMethod,
        correction_comment: correctionComment || null,
      });
      if (histErr) throw histErr;
    },
    onSuccess: () => {

      [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL, "client-income"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
    },
  });
}

export function usePaymentCorrections(appointmentId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payment-corrections", appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_corrections" as any)
        .select("*")
        .eq("appointment_id", appointmentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!appointmentId,
  });
}

// ===== Income confirmations with linked sessions =====
export interface IncomeConfirmationAllocation {
  appointment_id: string;
  allocated_amount: number;
}

export interface SaveIncomeConfirmationInput {
  income_id?: string; // existing => update
  client_id: string;
  amount: number;
  date: string;
  payment_method: string;
  status: "confirmed" | "draft" | "cancelled";
  comment?: string;
  allocations: IncomeConfirmationAllocation[];
  prepayment_amount?: number; // remainder stored as client credit
}

async function recalcAppointments(appointmentIds: string[]) {
  const unique = Array.from(new Set(appointmentIds.filter(Boolean)));
  for (const id of unique) {
    await (supabase as any).rpc("recalc_appointment_payment_status", { p_appointment_id: id });
  }
}

export function useClientAllocations(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-allocations", clientId],
    queryFn: async () => {
      // Get allocations for sessions belonging to this client
      const { data, error } = await (supabase as any)
        .from("income_session_allocations")
        .select("*, income:income_id(id, status, date, payment_method, amount, comment, client_id), appointment:appointment_id(id, scheduled_at, price, status, payment_status, service:service_id(name))")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!user && !!clientId,
  });
}

export function useAppointmentAllocations(appointmentId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["appointment-allocations", appointmentId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("income_session_allocations")
        .select("*, income:income_id(id, status, date, payment_method, amount, comment, client_id)")
        .eq("appointment_id", appointmentId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!user && !!appointmentId,
  });
}

export function useClientCreditBalance(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-credit-balance", clientId],
    queryFn: async () => {
      // Available prepaid balance, matching the Client Card definition:
      //   confirmed income received from the client
      //   MINUS total price of completed payable sessions.
      // This is the surplus the client has paid beyond what they owe for
      // completed work, i.e. money available to consume against upcoming
      // (or just-finished) sessions. Legacy `client_credits` rows are
      // additive for backwards compatibility with old data.
      const [{ data: incomes, error: incErr }, { data: appts, error: aptErr }, { data: legacy, error: legacyErr }, { data: groupPays, error: groupErr }] = await Promise.all([
        (supabase as any)
          .from("income")
          .select("amount, status")
          .eq("client_id", clientId!),
        (supabase as any)
          .from("appointments")
          .select("price, status, payment_status")
          .eq("client_id", clientId!),
        (supabase as any)
          .from("client_credits")
          .select("amount")
          .eq("client_id", clientId!),
        (supabase as any)
          .from("group_session_payments")
          .select("amount, payment_state")
          .eq("client_id", clientId!)
          .eq("billing_rule_applied", true),
      ]);
      if (incErr) throw incErr;
      if (aptErr) throw aptErr;
      if (legacyErr) throw legacyErr;
      if (groupErr) throw groupErr;

      const totalIncome = (incomes ?? [])
        .filter((i: any) => (i.status ?? "confirmed") === "confirmed")
        .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
      const totalPayableCompleted = (appts ?? [])
        .filter((a: any) =>
          a.status === "completed" &&
          Number(a.price || 0) > 0 &&
          a.payment_status !== "not_applicable"
        )
        .reduce((s: number, a: any) => s + Number(a.price || 0), 0);
      const totalPayableGroup = (groupPays ?? [])
        .filter((p: any) =>
          Number(p.amount || 0) > 0 &&
          p.payment_state !== "not_applicable"
        )
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const legacyCredit = (legacy ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

      const balance = Math.max(0, totalIncome - totalPayableCompleted - totalPayableGroup) + legacyCredit;
      return balance as number;
    },
    enabled: !!user && !!clientId,
  });
}

export function useSaveIncomeConfirmation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (input: SaveIncomeConfirmationInput) => {
      assertCanWrite();
      const allocSum = input.allocations.reduce((s, a) => s + Number(a.allocated_amount || 0), 0);
      // Validate: allocated <= amount
      if (allocSum > Number(input.amount) + 0.001) {
        throw new Error("Allocated amount exceeds payment amount");
      }
      const remainder = Math.max(Number(input.amount) - allocSum, 0);

      let incomeId = input.income_id;
      let previousAllocations: any[] = [];
      let previousAptIds: string[] = [];

      if (incomeId) {
        // Snapshot previous
        const { data: prevInc } = await (supabase as any)
          .from("income").select("*").eq("id", incomeId).single();
        const { data: prevAlloc } = await (supabase as any)
          .from("income_session_allocations").select("*").eq("income_id", incomeId);
        previousAllocations = prevAlloc ?? [];
        previousAptIds = previousAllocations.map((a: any) => a.appointment_id);

        // Audit
        await (supabase as any).from("income_audit").insert({
          user_id: user!.id, income_id: incomeId, action: "update",
          snapshot: { previous: prevInc, previous_allocations: previousAllocations },
        } as any);

        // Update income row
        const { error: updErr } = await (supabase as any).from("income").update({
          client_id: input.client_id,
          amount: input.amount,
          date: input.date,
          payment_method: input.payment_method,
          status: input.status,
          comment: input.comment ?? null,
        }).eq("id", incomeId);
        if (updErr) throw updErr;

        // Wipe existing allocations & credits tied to this income
        await (supabase as any).from("income_session_allocations").delete().eq("income_id", incomeId);
        await (supabase as any).from("client_credits").delete().eq("income_id", incomeId);
      } else {
        // Insert new income
        const { data: newInc, error: insErr } = await (supabase as any).from("income").insert({
          user_id: user!.id,
          client_id: input.client_id,
          amount: input.amount,
          date: input.date,
          payment_method: input.payment_method,
          status: input.status,
          comment: input.comment ?? null,
          source: "manual",
          ...(isDemoMode ? { is_demo: true } : {}),
        } as any).select().single();
        if (insErr) throw insErr;
        incomeId = newInc.id;
        await (supabase as any).from("income_audit").insert({
          user_id: user!.id, income_id: incomeId, action: "create",
          snapshot: { created: newInc },
        } as any);
      }

      // Insert allocations
      const allocRows = input.allocations
        .filter((a) => Number(a.allocated_amount) > 0 && a.appointment_id)
        .map((a) => ({
          user_id: user!.id,
          income_id: incomeId,
          appointment_id: a.appointment_id,
          allocated_amount: Number(a.allocated_amount),
        }));
      if (allocRows.length > 0) {
        // Guard against duplicate (income_id, appointment_id) pairs within the payload
        const seen = new Set<string>();
        for (const r of allocRows) {
          const key = `${r.income_id}:${r.appointment_id}`;
          if (seen.has(key)) {
            throw new Error("This session is already linked to this payment confirmation.");
          }
          seen.add(key);
        }
        const { error: allocErr } = await (supabase as any)
          .from("income_session_allocations").insert(allocRows);
        if (allocErr) {
          if ((allocErr as any).code === "23505") {
            throw new Error("This session is already linked to this payment confirmation.");
          }
          throw allocErr;
        }
      }

      // Store remainder as client credit (only if confirmed)
      if (remainder > 0 && input.status === "confirmed") {
        await (supabase as any).from("client_credits").insert({
          user_id: user!.id,
          client_id: input.client_id,
          income_id: incomeId,
          amount: remainder,
          description: "Prepayment / overpayment from income confirmation",
        } as any);
      }

      // Recalc affected appointments
      const allAptIds = [
        ...previousAptIds,
        ...allocRows.map((r: any) => r.appointment_id),
      ];
      await recalcAppointments(allAptIds);

      return incomeId;
    },
    onSuccess: () => {
      ["income", "income-all", "income-sum", "client-income", "client-allocations", "appointment-allocations",
       "client-credit-balance", "appointments", "client-appointments",
       "dashboard-stats", "expected-payments", "payment-audit"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useDeleteIncomeConfirmation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (incomeId: string) => {
      assertCanWrite();
      const { data: prevInc } = await (supabase as any)
        .from("income").select("*").eq("id", incomeId).single();
      const { data: prevAlloc } = await (supabase as any)
        .from("income_session_allocations").select("*").eq("income_id", incomeId);
      const aptIds = (prevAlloc ?? []).map((a: any) => a.appointment_id);

      await (supabase as any).from("income_audit").insert({
        user_id: user!.id, income_id: incomeId, action: "delete",
        snapshot: { deleted: prevInc, deleted_allocations: prevAlloc },
      } as any);

      await (supabase as any).from("client_credits").delete().eq("income_id", incomeId);
      await (supabase as any).from("income_session_allocations").delete().eq("income_id", incomeId);
      const { error } = await (supabase as any).from("income").delete().eq("id", incomeId);
      if (error) throw error;

      await recalcAppointments(aptIds);
    },
    onSuccess: () => {
      ["income", "income-all", "income-sum", "client-income", "client-allocations", "appointment-allocations",
       "client-credit-balance", "appointments", "client-appointments",
       "dashboard-stats", "expected-payments", "payment-audit"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

// Total outstanding debt of a client + per-session breakdown.
export function useClientDebt(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-debt", clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("expected_payments")
        .select("id, amount, appointment_id, created_at, appointment:appointment_id(id, scheduled_at, price, service:service_id(name))")
        .eq("client_id", clientId!)
        .eq("user_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
      return { total, items: rows };
    },
    enabled: !!user && !!clientId,
  });
}

