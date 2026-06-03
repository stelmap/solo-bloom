import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoWriteGuard } from "@/hooks/useDemoWorkspace";

export function useInvoices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["invoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
}

export function useInvoicesByAppointment(appointmentId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["invoices", "appointment", appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices" as any)
        .select("*")
        .eq("appointment_id", appointmentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!appointmentId,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (invoice: Record<string, any>) => {
      assertCanWrite();

      // Stable per appointment: reuse existing invoice if one already exists.
      if (invoice.appointment_id) {
        const { data: existing } = await supabase
          .from("invoices" as any)
          .select("*")
          .eq("appointment_id", invoice.appointment_id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (existing) return existing as any;
      }

      const sessionDate = invoice.session_date || new Date().toISOString().split("T")[0];
      const { data: numData, error: numError } = await supabase
        .rpc("generate_invoice_number" as any, { p_user_id: user!.id, p_session_date: sessionDate });
      if (numError) throw numError;

      const { data, error } = await supabase
        .from("invoices" as any)
        .insert({
          ...invoice,
          user_id: user!.id,
          invoice_number: numData,
        })
        .select()
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
