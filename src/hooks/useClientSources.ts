import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Campaign, ClientSource, SourceClient, SourceExpense, SourceIncome } from "@/lib/clientSources";

const db = supabase as any;

export function useClientSources() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-sources", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("client_sources").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as ClientSource[];
    },
  });
}

export function useCampaigns() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["marketing-campaigns", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("marketing_campaigns").select("*").order("start_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  ["client-sources", "marketing-campaigns", "source-analytics"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useSaveSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<ClientSource> & { name: string }) => {
      const payload = { name: s.name.trim(), source_type: s.source_type ?? "other", description: s.description?.trim() || null, is_active: s.is_active ?? true };
      const q = s.id ? db.from("client_sources").update(payload).eq("id", s.id) : db.from("client_sources").insert(payload);
      const { data, error } = await q.select().single();
      if (error) throw error;
      return data as ClientSource;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("client_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(qc); qc.invalidateQueries({ queryKey: ["clients"] }); },
  });
}

export function useSaveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<Campaign> & { name: string; source_id: string }) => {
      const payload = { name: c.name.trim(), source_id: c.source_id, start_date: c.start_date || null, end_date: c.end_date || null, status: c.status ?? "active", notes: c.notes?.trim() || null };
      const q = c.id ? db.from("marketing_campaigns").update(payload).eq("id", c.id) : db.from("marketing_campaigns").insert(payload);
      const { data, error } = await q.select().single();
      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("marketing_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

async function fetchAll<T>(build: (from: number, to: number) => any): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0; page < 50; page++) {
    const { data, error } = await build(page * 1000, page * 1000 + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Raw rows needed for acquisition analytics (clients, linked expenses, income). */
export function useSourceAnalyticsData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["source-analytics", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const [clients, expenses, income] = await Promise.all([
        fetchAll<SourceClient>((a, b) => db.from("clients").select("id,name,created_at,source_id,campaign_id,referred_by_client_id,referred_by_name").range(a, b)),
        fetchAll<SourceExpense & { id: string; description: string | null; category: string }>((a, b) =>
          db.from("expenses").select("id,amount,date,source_id,campaign_id,instance_status,description,category").not("source_id", "is", null).range(a, b)),
        fetchAll<SourceIncome>((a, b) => db.from("income").select("amount,date,client_id,status,source").not("client_id", "is", null).range(a, b)),
      ]);
      return { clients, expenses, income };
    },
  });
}
