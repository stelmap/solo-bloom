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

      // Resolve actual payment_method and payment_date from the latest confirmed
      // income row linked to this appointment. The invoice generation date must
      // never be used as the payment date.
      let paymentMethod: string | undefined = invoice.payment_method;
      let paymentDate: string | undefined = invoice.payment_date;
      if (invoice.appointment_id) {
        const { data: inc } = await supabase
          .from("income")
          .select("payment_method, date, status")
          .eq("appointment_id", invoice.appointment_id)
          .eq("status", "confirmed")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (inc) {
          if (!paymentMethod) paymentMethod = (inc as any).payment_method || undefined;
          if (!paymentDate) paymentDate = (inc as any).date || undefined;
        }
      }

      const { data, error } = await supabase
        .from("invoices" as any)
        .insert({
          ...invoice,
          payment_method: paymentMethod,
          payment_date: paymentDate ?? null,
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

export function useDeleteInvoice() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      assertCanWrite();
      if (!user?.id) throw new Error("not_authenticated");
      const { error } = await supabase
        .from("invoices" as any)
        .delete()
        .eq("id", invoiceId)
        .eq("user_id", user.id);
      if (error) throw error;
      return invoiceId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
