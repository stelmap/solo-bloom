import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSupervisions(clientId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["supervisions", clientId || "all"],
    queryFn: async () => {
      let query = supabase
        .from("supervisions" as any)
        .select("*, clients!inner(name)")
        .order("supervision_date", { ascending: false });
      if (clientId) {
        query = query.eq("client_id", clientId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
}

export function useSupervision(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["supervision", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supervisions" as any)
        .select("*, clients!inner(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user && !!id,
  });
}

export function useSupervisionCount(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["supervision-count", clientId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("supervisions" as any)
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId!);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user && !!clientId,
  });
}

export function useUnusedClientNotes(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unused-client-notes", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId!)
        .eq("included_in_supervision", false as any)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!clientId,
  });
}

export function useCreateSupervision() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: {
      client_id: string;
      supervision_date: string;
      paid_amount: number;
      imported_notes_snapshot: any[];
      note_ids: string[];
    }) => {
      const { note_ids, ...supervisionData } = params;

      // 1. Create expense record
      const { data: expense, error: expError } = await supabase
        .from("expenses")
        .insert({
          user_id: user!.id,
          amount: params.paid_amount,
          category: "Supervision",
          date: params.supervision_date,
          description: `Supervision for client`,
          is_recurring: false,
          payment_status: "paid",
        } as any)
        .select()
        .single();
      if (expError) throw expError;

      // 2. Create supervision record
      const { data: supervision, error: supError } = await supabase
        .from("supervisions" as any)
        .insert({
          ...supervisionData,
          user_id: user!.id,
          expense_id: expense.id,
        })
        .select()
        .single();
      if (supError) throw supError;

      // 3. Mark notes as included
      if (note_ids.length > 0) {
        const { error: noteError } = await supabase
          .from("client_notes")
          .update({
            included_in_supervision: true,
            supervision_id: (supervision as any).id,
          } as any)
          .in("id", note_ids);
        if (noteError) throw noteError;
      }

      return supervision as any;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["supervisions"] });
      qc.invalidateQueries({ queryKey: ["supervision-count", vars.client_id] });
      qc.invalidateQueries({ queryKey: ["unused-client-notes", vars.client_id] });
      qc.invalidateQueries({ queryKey: ["client-notes", vars.client_id] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useUpdateSupervision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; supervision_outcome?: string; supervisor_feedback?: string; next_steps?: string }) => {
      const { error } = await supabase
        .from("supervisions" as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supervisions"] });
      qc.invalidateQueries({ queryKey: ["supervision"] });
    },
  });
}

export function useDeleteSupervision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, expenseId }: { id: string; expenseId?: string }) => {
      // Delete linked expense if exists
      if (expenseId) {
        await supabase.from("expenses").delete().eq("id", expenseId);
      }
      // Unmark notes
      await (supabase
        .from("client_notes")
        .update({ included_in_supervision: false, supervision_id: null } as any) as any)
        .eq("supervision_id", id);
      // Delete supervision
      const { error } = await supabase.from("supervisions" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supervisions"] });
      qc.invalidateQueries({ queryKey: ["supervision-count"] });
      qc.invalidateQueries({ queryKey: ["unused-client-notes"] });
      qc.invalidateQueries({ queryKey: ["client-notes"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}
