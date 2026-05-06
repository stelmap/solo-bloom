import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";

export interface PaymentMethod {
  id: string;
  user_id: string;
  code: string;
  name: string;
  is_built_in: boolean;
  is_active: boolean;
  sort_order: number;
}

const BUILTIN_LABEL_KEYS: Record<string, string> = {
  cash: "method.cashLabel",
  card: "method.cardLabel",
  bank_transfer: "method.bankTransferLabel",
  paypal: "method.paypalLabel",
  check: "method.checkLabel",
};

export function localizedMethodName(m: Pick<PaymentMethod, "code" | "name" | "is_built_in">, t: (k: any) => string): string {
  if (m.is_built_in && BUILTIN_LABEL_KEYS[m.code]) {
    const lbl = t(BUILTIN_LABEL_KEYS[m.code]);
    if (lbl && !lbl.startsWith("method.")) return lbl;
  }
  return m.name;
}

export function usePaymentMethods() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["payment_methods", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Ensure defaults exist
      await (supabase as any).rpc("ensure_default_payment_methods", { p_user_id: user!.id });
      const { data, error } = await (supabase as any)
        .from("payment_methods")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PaymentMethod[];
    },
  });

  // Realtime invalidation when changed elsewhere
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`pm-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_methods", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["payment_methods", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  return query;
}

export function useActivePaymentMethods() {
  const q = usePaymentMethods();
  return { ...q, data: (q.data ?? []).filter(m => m.is_active) };
}

export function useUpsertPaymentMethod() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id?: string; code?: string; name: string; is_active?: boolean; sort_order?: number }) => {
      if (input.id) {
        const { error } = await (supabase as any)
          .from("payment_methods")
          .update({ name: input.name, is_active: input.is_active, sort_order: input.sort_order })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const code = (input.code ?? `custom_${Date.now()}`).toLowerCase().replace(/[^a-z0-9_]/g, "_");
        const { error } = await (supabase as any)
          .from("payment_methods")
          .insert({
            user_id: user!.id,
            code,
            name: input.name,
            is_built_in: false,
            is_active: input.is_active ?? true,
            sort_order: input.sort_order ?? 100,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_methods", user?.id] }),
  });
}

export function useTogglePaymentMethod() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("payment_methods").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_methods", user?.id] }),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      // Check usage in income (custom methods only) before deletion
      const { data: pm } = await (supabase as any).from("payment_methods").select("code, is_built_in").eq("id", id).maybeSingle();
      if (!pm) throw new Error("Not found");
      if (pm.is_built_in) throw new Error("Built-in payment methods cannot be deleted");
      const { count } = await (supabase as any)
        .from("income")
        .select("id", { count: "exact", head: true })
        .eq("payment_method", pm.code);
      if ((count ?? 0) > 0) throw new Error("Cannot delete: payment method has been used");
      const { error } = await (supabase as any).from("payment_methods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_methods", user?.id] }),
  });
}
