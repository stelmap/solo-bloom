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
const INVALIDATE_FINANCIAL = ["income", "expenses", "expected-payments", "dashboard-stats", "tax-accrual-status"];
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
export function useClientAppointments(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-appointments", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, services(name, price)")
        .eq("client_id", clientId!)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data;
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
    mutationFn: async ({ id, status, clientId, price, cancellationReason }: { id: string; status: "cancelled" | "no-show"; clientId?: string; price?: number; cancellationReason?: string }) => {
      await supabase.from("income").delete().eq("appointment_id", id);
      await supabase.from("expected_payments").delete().eq("appointment_id", id);

      // No-show and cancelled sessions are NOT payable by default.
      // (Future "Charge no-show" setting can override this.)
      const { error } = await supabase.from("appointments").update({
        status, payment_status: "not_applicable",
        ...(cancellationReason ? { cancellation_reason: cancellationReason } : {}),
      } as any).eq("id", id);
      if (error) throw error;
      // Suppress unused-var warnings for now-unused params
      void clientId; void price; void user; void isDemoMode;
    },
    onSuccess: (_d, vars) => { track("session_canceled", { status: vars.status }); [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
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
    onSuccess: () => { [...INVALIDATE_APPOINTMENTS, ...INVALIDATE_FINANCIAL].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

// Expected Payments
export function useExpectedPayments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["expected-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expected_payments")
        .select("*, clients(name), appointments(scheduled_at, status, services(name))")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
    mutationFn: async ({ id, appointmentId, amount, paymentMethod, paymentDate }: {
      id: string; appointmentId: string; amount: number; paymentMethod: string; paymentDate?: string;
    }) => {
      const today = new Date().toISOString().split("T")[0];
      const payDate = paymentDate || today;

      // Get session date from appointment
      const { data: aptData } = await supabase
        .from("appointments")
        .select("scheduled_at")
        .eq("id", appointmentId)
        .single();
      const sessionDate = aptData?.scheduled_at
        ? new Date(aptData.scheduled_at).toISOString().split("T")[0]
        : payDate;

      const { error: epErr } = await supabase
        .from("expected_payments")
        .update({ status: "paid", paid_at: new Date(payDate + "T12:00:00").toISOString(), payment_method: paymentMethod } as any)
        .eq("id", id);
      if (epErr) throw epErr;

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
        .select("amount, category, is_recurring, payment_status, instance_status")
        .eq("is_template", false);
      q = applyExpenseFilters(q, filters);
      const { data, error } = await q.range(0, 9999);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      let total = 0, tax = 0, recurring = 0, unpaid = 0;
      for (const e of rows) {
        const amt = Number(e.amount) || 0;
        total += amt;
        if (e.category === "Tax") tax += amt;
        if (e.is_recurring) recurring += amt;
        if (e.payment_status === "unpaid") unpaid += amt;
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
      ["expenses", "dashboard-stats", "tax-accrual-status"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
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
    onSuccess: () => { track("expense_updated"); ["expenses", "dashboard-stats", "tax-accrual-status"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
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
    onSuccess: () => { track("expense_updated", { scope: "series" }); ["expenses", "dashboard-stats", "tax-accrual-status"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
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
    onSuccess: () => { track("expense_deleted"); ["expenses", "dashboard-stats", "tax-accrual-status"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
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
    onSuccess: (_d, vars) => { track("income_created", { source: vars.source }); ["income", "dashboard-stats", "client-income", "tax-accrual-status"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
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
    onSuccess: () => { track("income_deleted"); ["income", "dashboard-stats", "tax-accrual-status"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
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
    mutationFn: async (updates: { full_name?: string; business_name?: string; phone?: string; language?: string; reminder_minutes?: number; work_hours_start?: string; work_hours_end?: string; time_format?: string; default_duration?: number; currency?: string; business_id?: string; business_address?: string; vat_mode?: string; vat_rate?: number; onboarding_completed?: boolean; income_recognition_method?: string }) => {
      const { error } = await supabase.from("profiles").update(updates as any).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      track("profile_updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
      // If recognition method changed, recompute analytics that group income by date
      if (vars.income_recognition_method !== undefined) {
        ["dashboard-stats", "income", "client-income", "tax-accrual-status"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
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
      // Delete ALL existing generated entries for this tax (regardless of payment status)
      // to prevent duplicates accumulating across syncs.
      await supabase.from("expenses").delete()
        .eq("tax_setting_id", taxSettingId);
      
      // Insert new entries
      if (entries.length > 0) {
        const rows = entries.map(e => ({
          user_id: user!.id,
          category: "Tax",
          amount: e.amount,
          date: e.date,
          description: e.description,
          is_recurring: true,
          tax_setting_id: taxSettingId,
          payment_status: "unpaid",
        }));
        const { error } = await supabase.from("expenses").insert(rows as any);
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
          .select("amount, date, category, tax_setting_id");
        const monthExpense = new Map<string, number>();
        const quarterExpense = new Map<string, number>();
        for (const r of (expenseRows ?? []) as any[]) {
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
      const { data: expenseRows } = await supabase.from("expenses").select("amount, date, category, tax_setting_id");
      const monthExpense = new Map<string, number>();
      const quarterExpense = new Map<string, number>();
      for (const r of (expenseRows ?? []) as any[]) {
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
    onSuccess: () => { ["expenses", "dashboard-stats", "tax-accrual-status"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
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
    }) => {
      const { data: ruleData, error: ruleErr } = await supabase.from("recurring_rules")
        .insert({ ...rule, user_id: user!.id } as any).select().single();
      if (ruleErr) throw ruleErr;

      const appointments = generateRecurringAppointments(ruleData as any, user!.id)
        .map((apt) => attachDemoFlag(apt, isDemoMode));
      if (appointments.length > 0) {
        const { error: aptErr } = await supabase.from("appointments").insert(appointments as any);
        if (aptErr) throw aptErr;
      }
      return { rule: ruleData, count: appointments.length };
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
    mutationFn: async ({ ruleId, scope, appointmentId }: { ruleId: string; scope: "this" | "following" | "all"; appointmentId?: string }) => {
      if (scope === "all") {
        const { data: apts } = await supabase.from("appointments").select("id").eq("recurring_rule_id", ruleId);
        for (const apt of apts || []) {
          await supabase.from("income").delete().eq("appointment_id", apt.id);
          await supabase.from("expected_payments").delete().eq("appointment_id", apt.id);
        }
        await supabase.from("appointments").delete().eq("recurring_rule_id", ruleId);
        await supabase.from("recurring_rules").delete().eq("id", ruleId);
      } else if (scope === "this" && appointmentId) {
        await supabase.from("income").delete().eq("appointment_id", appointmentId);
        await supabase.from("expected_payments").delete().eq("appointment_id", appointmentId);
        await supabase.from("appointments").delete().eq("id", appointmentId);
      } else if (scope === "following" && appointmentId) {
        const { data: apt } = await supabase.from("appointments").select("scheduled_at").eq("id", appointmentId).single();
        if (apt) {
          const { data: futureApts } = await supabase.from("appointments").select("id")
            .eq("recurring_rule_id", ruleId).gte("scheduled_at", apt.scheduled_at);
          for (const a of futureApts || []) {
            await supabase.from("income").delete().eq("appointment_id", a.id);
            await supabase.from("expected_payments").delete().eq("appointment_id", a.id);
          }
          await supabase.from("appointments").delete()
            .eq("recurring_rule_id", ruleId).gte("scheduled_at", apt.scheduled_at);
        }
      }
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
        // Outstanding balance: completed payable sessions not fully paid
        supabase.from("appointments")
          .select("id, price, client_id")
          .eq("status", "completed")
          .gt("price", 0)
          .in("payment_status", ["unpaid", "waiting_for_payment", "partially_paid"]),
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
      ]);

      const dateOf = (row: any) => row[recognitionField];
      const monthIncome = incomeRes.data ?? [];
      const allExpenses = expenseRes.data ?? [];
      const todayIncome = monthIncome.filter((i: any) => dateOf(i) === today).reduce((s: number, i: any) => s + Number(i.amount), 0);
      const monthlyIncome = monthIncome.reduce((s: number, i: any) => s + Number(i.amount), 0);
      // Sum all non-template expense rows in this month (planned + paid; excludes cancelled).
      const monthlyExpenses = allExpenses
        .filter((e: any) => e.instance_status !== "cancelled")
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
      const outstandingApts = (outstandingAptRes.data ?? []) as Array<{ id: string; price: number; client_id: string }>;
      let outstandingBalance = 0;
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
          outstandingBalance += Math.max(Number(apt.price) - paid, 0);
        }
      }

      // ===== Monthly metrics =====
      const monthApts = (monthAptRes.data ?? []) as Array<{ client_id: string; status: string; scheduled_at: string }>;
      const activeClientsThisMonth = new Set(monthApts.map((a) => a.client_id)).size;

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

      // ===== Unpaid sessions count (all-time payable, unpaid) =====
      const unpaidSessionsCount = outstandingApts.length;

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
      const [allClientsHealthRes, completedAptsCountRes, allAptsCountRes, cancelledAptsCountRes, allExpensesRes, allClientSessionsRes] = await Promise.all([
        supabase.from("clients").select("id, status, archive_reason"),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
        supabase.from("expenses").select("amount").eq("is_template", false).neq("instance_status", "cancelled"),
        supabase.from("appointments").select("client_id, scheduled_at").neq("status", "cancelled"),
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
      const perClientDates = new Map<string, { min: number; max: number }>();
      for (const a of (allClientSessionsRes.data ?? []) as Array<{ client_id: string; scheduled_at: string }>) {
        const t = new Date(a.scheduled_at).getTime();
        const cur = perClientDates.get(a.client_id);
        if (!cur) perClientDates.set(a.client_id, { min: t, max: t });
        else { if (t < cur.min) cur.min = t; if (t > cur.max) cur.max = t; }
      }
      let durSum = 0, durCount = 0;
      const MS_MONTH = 1000 * 60 * 60 * 24 * 30.4375;
      for (const v of perClientDates.values()) {
        const months = (v.max - v.min) / MS_MONTH;
        if (months > 0) { durSum += months; durCount++; }
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
      const { data, error } = await (supabase as any)
        .from("client_credits")
        .select("amount")
        .eq("client_id", clientId!);
      if (error) throw error;
      const balance = (data ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
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
      ["income", "client-income", "client-allocations", "appointment-allocations",
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
      ["income", "client-income", "client-allocations", "appointment-allocations",
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

