import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Clients
export function useClients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (client: { name: string; phone?: string; email?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...client, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; phone?: string; email?: string; notes?: string }) => {
      const { error } = await supabase.from("clients").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
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
      const { data, error } = await supabase
        .from("services")
        .insert({ ...service, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
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
        .select("*, clients(name), services(name)")
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
      client_id: string;
      service_id: string;
      scheduled_at: string;
      duration_minutes: number;
      price: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("appointments")
        .insert({ ...apt, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; notes?: string; scheduled_at?: string; price?: number }) => {
      const { error } = await supabase.from("appointments").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["income"] });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
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
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...expense, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
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
    mutationFn: async (income: { amount: number; date: string; description?: string; source?: string; appointment_id?: string }) => {
      const { data, error } = await supabase
        .from("income")
        .insert({ ...income, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["income"] }),
  });
}

// Profile
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
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

  // Week boundaries (Mon-Sun)
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

  // Days in month
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

      const thisWeekIncome = allIncome
        .filter(i => i.date >= thisMondayStr && i.date <= today)
        .reduce((s, i) => s + Number(i.amount), 0);
      const lastWeekIncome = allIncome
        .filter(i => i.date >= lastMondayStr && i.date <= lastSundayStr)
        .reduce((s, i) => s + Number(i.amount), 0);

      const profile = profileRes.data as any;
      const workingDays = profile?.working_days_per_week ?? 5;
      const sessionsPerDay = profile?.sessions_per_day ?? 6;
      const maxMonthlyCapacity = workingDays * 4 * sessionsPerDay;
      const monthlyAppointments = monthAptRes.data?.length ?? 0;

      return {
        todayIncome,
        monthlyIncome,
        monthlyExpenses,
        netProfit: monthlyIncome - monthlyExpenses,
        clientCount: clientRes.count ?? 0,
        todayAppointments: todayAptRes.data ?? [],
        thisWeekIncome,
        lastWeekIncome,
        monthlyAppointments,
        maxMonthlyCapacity,
        daysPastInMonth,
        daysLeftInMonth,
      };
    },
    enabled: !!user,
  });
}
