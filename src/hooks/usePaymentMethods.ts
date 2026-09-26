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
  is_default: boolean;
  show_on_invoice: boolean;
  deleted_at: string | null;
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
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PaymentMethod[];
    },
  });

  // Realtime invalidation when changed elsewhere
  useEffect(() => {
    if (!user) return;
    // Topic MUST end with ":<user_id>" so realtime.messages RLS allows the
    // subscription (see migration: users can only listen on their own topics).
    const ch = supabase.channel(`pm-${Math.random().toString(36).slice(2)}:${user.id}`);
    ch.on("postgres_changes" as any, { event: "*", schema: "public", table: "payment_methods", filter: `user_id=eq.${user.id}` }, () => {
      qc.invalidateQueries({ queryKey: ["payment_methods", user.id] });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  return query;
}

export function useActivePaymentMethods() {
  const q = usePaymentMethods();
  return { ...q, data: (q.data ?? []).filter(m => m.is_active) };
}

/** Code of the default active method (falls back to first active, then "cash"). */
export function useDefaultPaymentMethodCode(): string {
  const { data } = useActivePaymentMethods();
  return data.find(m => m.is_default)?.code ?? data[0]?.code ?? "cash";
}

export function useSetDefaultPaymentMethod() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error: e1 } = await (supabase as any).from("payment_methods").update({ is_default: false }).eq("user_id", user!.id).eq("is_default", true);
      if (e1) throw e1;
      const { error } = await (supabase as any).from("payment_methods").update({ is_default: true, is_active: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_methods", user?.id] }),
  });
}

export function useUpdatePaymentMethodFlags() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; show_on_invoice?: boolean; is_active?: boolean; name?: string }) => {
      const { error } = await (supabase as any).from("payment_methods").update(patch).eq("id", id);
      if (error) throw error;
      // Keep a valid default among active methods.
      await (supabase as any).rpc("ensure_default_payment_methods", { p_user_id: user!.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_methods", user?.id] }),
  });
}

/** Number of income records that reference this method code. */
export async function paymentMethodUsageCount(code: string): Promise<number> {
  const { count } = await (supabase as any).from("income").select("id", { count: "exact", head: true }).eq("payment_method", code);
  return count ?? 0;
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
      const { error } = await (supabase as any).from("payment_methods").update(is_active ? { is_active } : { is_active, is_default: false }).eq("id", id);
      if (error) throw error;
      await (supabase as any).rpc("ensure_default_payment_methods", { p_user_id: user!.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_methods", user?.id] }),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      // Methods referenced by past payments are soft-deleted so history keeps them.
      const { data: pm } = await (supabase as any).from("payment_methods").select("code").eq("id", id).maybeSingle();
      if (!pm) throw new Error("Not found");
      const used = await paymentMethodUsageCount(pm.code);
      const { error } = used > 0
        ? await (supabase as any).from("payment_methods").update({ deleted_at: new Date().toISOString(), is_active: false, is_default: false }).eq("id", id)
        : await (supabase as any).from("payment_methods").delete().eq("id", id);
      if (error) throw error;
      await (supabase as any).rpc("ensure_default_payment_methods", { p_user_id: user!.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_methods", user?.id] }),
  });
}
