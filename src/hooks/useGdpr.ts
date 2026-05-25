import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditEntry = {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  at: string;
};

export type DeletionRequest = {
  id: string;
  user_id: string;
  requested_at: string;
  scheduled_for: string;
  cancelled_at: string | null;
  executed_at: string | null;
  reason: string | null;
};

export function useAuditLog(limit = 100) {
  return useQuery({
    queryKey: ["data_access_audit", limit],
    queryFn: async (): Promise<AuditEntry[]> => {
      const { data, error } = await supabase
        .from("data_access_audit")
        .select("*")
        .order("at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
  });
}

export function useDeletionRequest() {
  return useQuery({
    queryKey: ["gdpr_deletion_request"],
    queryFn: async (): Promise<DeletionRequest | null> => {
      const { data, error } = await supabase
        .from("gdpr_deletion_requests")
        .select("*")
        .is("cancelled_at", null)
        .is("executed_at", null)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return (data as DeletionRequest | null) ?? null;
    },
  });
}

export function useRequestDeletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reason?: string) => {
      const { data, error } = await supabase.functions.invoke("gdpr-erase", {
        body: { action: "request", reason },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gdpr_deletion_request"] }),
  });
}

export function useCancelDeletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("gdpr-erase", {
        body: { action: "cancel" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gdpr_deletion_request"] }),
  });
}

export async function downloadMyData() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdpr-export`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `my-data-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
