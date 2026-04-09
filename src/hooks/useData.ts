import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateCapacity } from "@/lib/capacity";

const INVALIDATE_ALL = ["clients", "services", "appointments", "expenses", "income", "dashboard-stats", "expected-payments", "working-schedule", "days-off", "recurring-rules", "tax-settings"];

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
  return useMutation({
    mutationFn: async (client: { name: string; phone?: string; email?: string; notes?: string; telegram?: string }) => {
      const { data, error } = await supabase.from("clients").insert({ ...client, user_id: user!.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; phone?: string; email?: string; notes?: string; telegram?: string }) => {
      const { error } = await supabase.from("clients").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", vars.id] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
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
  return useMutation({
    mutationFn: async (note: { client_id: string; content: string; appointment_id?: string }) => {
      const { data, error } = await supabase.from("client_notes").insert({ ...note, user_id: user!.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["client-notes", vars.client_id] }),
  });
}

export function useDeleteClientNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
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
  return useMutation({
    mutationFn: async ({ file, clientId, appointmentId }: { file: File; clientId: string; appointmentId?: string }) => {
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
  return useMutation({
    mutationFn: async ({ id, filePath, clientId }: { id: string; filePath: string; clientId: string }) => {
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
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (service: { name: string; duration_minutes: number; price: number }) => {
      const { data, error } = await supabase.from("services").insert({ ...service, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; duration_minutes?: number; price?: number }) => {
      const { error } = await supabase.from("services").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
}

// Appointments
export function useAppointments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["appointments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, clients(name), services(name, price)")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (apt: {
      client_id: string; service_id: string; scheduled_at: string;
      duration_minutes: number; price: number; notes?: string;
    }) => {
      const { data, error } = await supabase.from("appointments").insert({ ...apt, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { INVALIDATE_ALL.forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string; status?: string; notes?: string; scheduled_at?: string;
      price?: number; client_id?: string; service_id?: string; duration_minutes?: number;
      payment_status?: string;
    }) => {
      const { error } = await supabase.from("appointments").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { INVALIDATE_ALL.forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
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
    onSuccess: () => { INVALIDATE_ALL.forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

// Complete appointment with payment status
export function useCompleteAppointment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ appointmentId, clientId, price, paymentMethod, paymentStatus }: {
      appointmentId: string; clientId: string; price: number; paymentMethod: string; paymentStatus: string;
    }) => {
      const { error: aptErr } = await supabase
        .from("appointments")
        .update({ status: "completed", price, payment_status: paymentStatus } as any)
        .eq("id", appointmentId);
      if (aptErr) throw aptErr;

      await supabase.from("income").delete().eq("appointment_id", appointmentId);
      await supabase.from("expected_payments").delete().eq("appointment_id", appointmentId);

      const today = new Date().toISOString().split("T")[0];

      if (paymentStatus === "paid_now" || paymentStatus === "paid_in_advance") {
        const { error: incErr } = await supabase.from("income").insert({
          user_id: user!.id, appointment_id: appointmentId,
          amount: price, date: today, source: "appointment",
          payment_method: paymentMethod,
        } as any);
        if (incErr) throw incErr;
      } else if (paymentStatus === "waiting_for_payment") {
        const { error: epErr } = await supabase.from("expected_payments").insert({
          user_id: user!.id, appointment_id: appointmentId,
          client_id: clientId, amount: price, status: "pending",
        } as any);
        if (epErr) throw epErr;
      }
    },
    onSuccess: () => { INVALIDATE_ALL.forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

// Cancel/no-show
export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "cancelled" | "no-show" }) => {
      await supabase.from("income").delete().eq("appointment_id", id);
      await supabase.from("expected_payments").delete().eq("appointment_id", id);
      const { error } = await supabase.from("appointments").update({ status, payment_status: "not_applicable" } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { INVALIDATE_ALL.forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
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
        .select("*, clients(name), appointments(scheduled_at, services(name))")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useMarkExpectedPaymentPaid() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, appointmentId, amount, paymentMethod }: {
      id: string; appointmentId: string; amount: number; paymentMethod: string;
    }) => {
      const { error: epErr } = await supabase
        .from("expected_payments")
        .update({ status: "paid", paid_at: new Date().toISOString(), payment_method: paymentMethod } as any)
        .eq("id", id);
      if (epErr) throw epErr;

      await supabase.from("appointments").update({ payment_status: "paid_now" } as any).eq("id", appointmentId);

      const today = new Date().toISOString().split("T")[0];
      const { error: incErr } = await supabase.from("income").insert({
        user_id: user!.id, appointment_id: appointmentId,
        amount, date: today, source: "appointment",
        payment_method: paymentMethod,
      } as any);
      if (incErr) throw incErr;
    },
    onSuccess: () => { INVALIDATE_ALL.forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

// Expenses
export function useExpenses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (expense: { category: string; amount: number; date: string; description?: string; is_recurring?: boolean }) => {
      const { data, error } = await supabase.from("expenses").insert({ ...expense, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { ["expenses", "dashboard-stats"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; category?: string; amount?: number; date?: string; description?: string; is_recurring?: boolean }) => {
      const { error } = await supabase.from("expenses").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { ["expenses", "dashboard-stats"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { ["expenses", "dashboard-stats"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

// Income
export function useIncome() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["income", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("income")
        .select("*, appointments(clients(name), services(name))")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateIncome() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (income: { amount: number; date: string; description?: string; source?: string; appointment_id?: string; payment_method?: string }) => {
      const { data, error } = await supabase.from("income").insert({ ...income, user_id: user!.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { ["income", "dashboard-stats"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("income").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { ["income", "dashboard-stats"].forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
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
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (updates: { full_name?: string; business_name?: string; phone?: string; language?: string; reminder_minutes?: number; work_hours_start?: string; work_hours_end?: string; time_format?: string; default_duration?: number }) => {
      const { error } = await supabase.from("profiles").update(updates as any).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
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
  });
}

export function useUpsertWorkingSchedule() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
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
  });
}

export function useCreateDayOff() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (dayOff: {
      date: string; type: string; label?: string;
      custom_start_time?: string; custom_end_time?: string; is_non_working?: boolean;
    }) => {
      const { data, error } = await supabase.from("days_off")
        .insert({ ...dayOff, user_id: user!.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["days-off"] }),
  });
}

export function useDeleteDayOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("days_off").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["days-off"] }),
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
  });
}

export function useUpsertBreakevenGoals() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (goals: Array<{ goal_number: number; label: string; description: string; fixed_expenses: number; desired_income: number; buffer: number }>) => {
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
        is_active: boolean; calculate_on: string;
      }>;
    },
    enabled: !!user,
  });
}

export function useCreateTaxSetting() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (tax: {
      tax_name: string; tax_type: string; tax_rate?: number;
      fixed_amount?: number; frequency?: string; calculate_on?: string;
    }) => {
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
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string; tax_name?: string; tax_type?: string; tax_rate?: number;
      fixed_amount?: number; frequency?: string; is_active?: boolean; calculate_on?: string;
    }) => {
      const { error } = await supabase.from("tax_settings").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-settings"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
  });
}

export function useDeleteTaxSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tax_settings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-settings"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
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
  });
}

export function useCreateRecurringRule() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (rule: {
      client_id: string; service_id: string; time: string; duration_minutes: number;
      price: number; notes?: string; recurrence_type: string; interval_weeks: number;
      days_of_week: number[]; start_date: string; end_date?: string;
    }) => {
      const { data: ruleData, error: ruleErr } = await supabase.from("recurring_rules")
        .insert({ ...rule, user_id: user!.id } as any).select().single();
      if (ruleErr) throw ruleErr;

      const appointments = generateRecurringAppointments(ruleData as any, user!.id);
      if (appointments.length > 0) {
        const { error: aptErr } = await supabase.from("appointments").insert(appointments as any);
        if (aptErr) throw aptErr;
      }
      return { rule: ruleData, count: appointments.length };
    },
    onSuccess: () => { INVALIDATE_ALL.forEach(k => qc.invalidateQueries({ queryKey: [k] })); qc.invalidateQueries({ queryKey: ["recurring-rules"] }); },
  });
}

export function useEditRecurringAppointments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ruleId, scope, appointmentId, updates }: {
      ruleId: string; scope: "this" | "following" | "all"; appointmentId: string;
      updates: { client_id?: string; service_id?: string; duration_minutes?: number; price?: number; notes?: string; scheduled_at?: string };
    }) => {
      if (scope === "this") {
        const { error } = await supabase.from("appointments").update(updates as any).eq("id", appointmentId);
        if (error) throw error;
      } else if (scope === "following") {
        const { data: apt } = await supabase.from("appointments").select("scheduled_at").eq("id", appointmentId).single();
        if (apt) {
          const { data: futureApts } = await supabase.from("appointments").select("id")
            .eq("recurring_rule_id", ruleId).gte("scheduled_at", apt.scheduled_at)
            .neq("status", "completed");
          for (const a of futureApts || []) {
            await supabase.from("appointments").update(updates as any).eq("id", a.id);
          }
        }
      } else if (scope === "all") {
        const { data: allApts } = await supabase.from("appointments").select("id, status")
          .eq("recurring_rule_id", ruleId);
        for (const a of allApts || []) {
          if (a.status === "scheduled" || a.status === "confirmed") {
            await supabase.from("appointments").update(updates as any).eq("id", a.id);
          }
        }
      }
    },
    onSuccess: () => { INVALIDATE_ALL.forEach(k => qc.invalidateQueries({ queryKey: [k] })); },
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
    onSuccess: () => { INVALIDATE_ALL.forEach(k => qc.invalidateQueries({ queryKey: [k] })); qc.invalidateQueries({ queryKey: ["recurring-rules"] }); },
  });
}

function generateRecurringAppointments(rule: any, userId: string, maxWeeks = 12) {
  const appointments: any[] = [];
  const startDate = new Date(rule.start_date);
  const endDate = rule.end_date ? new Date(rule.end_date) : null;
  const maxDate = endDate || new Date(startDate.getTime() + maxWeeks * 7 * 24 * 60 * 60 * 1000);
  const daysOfWeek: number[] = rule.days_of_week || [1];

  let currentWeekStart = new Date(startDate);
  const dayOfWeek = currentWeekStart.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  currentWeekStart.setDate(currentWeekStart.getDate() + mondayOffset);

  while (currentWeekStart <= maxDate) {
    for (const dow of daysOfWeek) {
      const aptDate = new Date(currentWeekStart);
      aptDate.setDate(aptDate.getDate() + (dow - 1));
      if (aptDate < startDate || aptDate > maxDate) continue;

      const [h, m] = (rule.time || "09:00").split(":").map(Number);
      aptDate.setHours(h, m, 0, 0);

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
    currentWeekStart.setDate(currentWeekStart.getDate() + (rule.interval_weeks || 1) * 7);
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

  return useQuery({
    queryKey: ["dashboard-stats", user?.id, today],
    queryFn: async () => {
      const [incomeRes, lastWeekIncomeRes, expenseRes, clientRes, todayAptRes, monthAptRes, profileRes, scheduleRes, daysOffRes] = await Promise.all([
        // Only fetch income from the start of the current month (covers monthly + today)
        supabase.from("income").select("amount, date").gte("date", monthStart),
        // Fetch last week's income separately (may be in previous month)
        supabase.from("income").select("amount, date").gte("date", lastMondayStr).lte("date", lastSundayStr),
        supabase.from("expenses").select("amount, date, is_recurring").gte("date", monthStart),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("appointments")
          .select("*, clients(name), services(name)")
          .gte("scheduled_at", today + "T00:00:00")
          .lt("scheduled_at", today + "T23:59:59")
          .order("scheduled_at"),
        supabase.from("appointments")
          .select("id")
          .gte("scheduled_at", monthStart + "T00:00:00"),
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
      ]);

      const monthIncome = incomeRes.data ?? [];
      const allExpenses = expenseRes.data ?? [];
      const todayIncome = monthIncome.filter(i => i.date === today).reduce((s, i) => s + Number(i.amount), 0);
      const monthlyIncome = monthIncome.reduce((s, i) => s + Number(i.amount), 0);
      const monthlyExpenses = allExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const thisWeekIncome = monthIncome.filter(i => i.date >= thisMondayStr && i.date <= today).reduce((s, i) => s + Number(i.amount), 0);
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
      };
    },
    enabled: !!user,
  });
}
