import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const INVALIDATE_ALL = ["clients", "services", "appointments", "expenses", "income", "dashboard-stats", "expected-payments"];

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
      // Update appointment
      const { error: aptErr } = await supabase
        .from("appointments")
        .update({ status: "completed", price, payment_status: paymentStatus } as any)
        .eq("id", appointmentId);
      if (aptErr) throw aptErr;

      // Clean up existing records
      await supabase.from("income").delete().eq("appointment_id", appointmentId);
      await supabase.from("expected_payments").delete().eq("appointment_id", appointmentId);

      const today = new Date().toISOString().split("T")[0];

      if (paymentStatus === "paid_now" || paymentStatus === "paid_in_advance") {
        // Create income
        const { error: incErr } = await supabase.from("income").insert({
          user_id: user!.id, appointment_id: appointmentId,
          amount: price, date: today, source: "appointment",
          payment_method: paymentMethod,
        } as any);
        if (incErr) throw incErr;
      } else if (paymentStatus === "waiting_for_payment") {
        // Create expected payment
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
      // Update expected payment
      const { error: epErr } = await supabase
        .from("expected_payments")
        .update({ status: "paid", paid_at: new Date().toISOString(), payment_method: paymentMethod } as any)
        .eq("id", id);
      if (epErr) throw epErr;

      // Update appointment payment_status
      await supabase.from("appointments").update({ payment_status: "paid_now" } as any).eq("id", appointmentId);

      // Create income
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
    mutationFn: async (updates: { full_name?: string; business_name?: string; phone?: string; language?: string; reminder_minutes?: number }) => {
      const { error } = await supabase.from("profiles").update(updates).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
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
      const [incomeRes, expenseRes, clientRes, todayAptRes, monthAptRes, profileRes] = await Promise.all([
        supabase.from("income").select("amount, date"),
        supabase.from("expenses").select("amount, date, is_recurring"),
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
          .select("working_days_per_week, sessions_per_day")
          .eq("user_id", user!.id)
          .single(),
      ]);

      const allIncome = incomeRes.data ?? [];
      const allExpenses = expenseRes.data ?? [];
      const todayIncome = allIncome.filter(i => i.date === today).reduce((s, i) => s + Number(i.amount), 0);
      const monthlyIncome = allIncome.filter(i => i.date >= monthStart).reduce((s, i) => s + Number(i.amount), 0);
      const monthlyExpenses = allExpenses.filter(e => e.date >= monthStart).reduce((s, e) => s + Number(e.amount), 0);
      const thisWeekIncome = allIncome.filter(i => i.date >= thisMondayStr && i.date <= today).reduce((s, i) => s + Number(i.amount), 0);
      const lastWeekIncome = allIncome.filter(i => i.date >= lastMondayStr && i.date <= lastSundayStr).reduce((s, i) => s + Number(i.amount), 0);

      const profile = profileRes.data as any;
      const workingDays = profile?.working_days_per_week ?? 5;
      const sessionsPerDay = profile?.sessions_per_day ?? 6;
      const maxMonthlyCapacity = workingDays * 4 * sessionsPerDay;
      const monthlyAppointments = monthAptRes.data?.length ?? 0;

      return {
        todayIncome, monthlyIncome, monthlyExpenses,
        netProfit: monthlyIncome - monthlyExpenses,
        clientCount: clientRes.count ?? 0,
        todayAppointments: todayAptRes.data ?? [],
        thisWeekIncome, lastWeekIncome,
        monthlyAppointments, maxMonthlyCapacity,
        daysPastInMonth, daysLeftInMonth,
      };
    },
    enabled: !!user,
  });
}
