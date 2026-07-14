import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMode, useDemoWriteGuard } from "@/hooks/useDemoWorkspace";
import { track } from "@/lib/analytics";

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
      // 1. Fetch unused client_notes
      const { data: clientNotes, error: cnErr } = await supabase
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId!)
        .eq("included_in_supervision", false as any)
        .order("created_at", { ascending: true });
      if (cnErr) throw cnErr;

      // 2. Fetch appointments with legacy notes for this client
      const { data: appointments, error: apErr } = await supabase
        .from("appointments")
        .select("id, notes, scheduled_at, status, services(name)")
        .eq("client_id", clientId!)
        .not("notes", "is", null)
        .neq("notes", "")
        .order("scheduled_at", { ascending: true });
      if (apErr) throw apErr;

      // 2b. Fetch structured session_notes (summary / homework / transference)
      const { data: sessionNotes, error: snErr } = await supabase
        .from("session_notes" as any)
        .select("id, appointment_id, session_summary, homework_text, has_homework, transference, created_at, appointments!inner(scheduled_at, status, services(name))")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: true });
      if (snErr) throw snErr;

      // 3. Get all supervisions for this client to find already-used appointment IDs
      const { data: supervisions, error: supErr } = await supabase
        .from("supervisions" as any)
        .select("imported_notes_snapshot")
        .eq("client_id", clientId!);
      if (supErr) throw supErr;

      const usedAppointmentIds = new Set<string>();
      const usedSessionNoteIds = new Set<string>();
      (supervisions || []).forEach((sup: any) => {
        const snapshot = sup.imported_notes_snapshot || [];
        snapshot.forEach((n: any) => {
          if (n.appointment_id) usedAppointmentIds.add(n.appointment_id);
          if (n.source === "session_note" && n.id) usedSessionNoteIds.add(n.id);
        });
      });

      // 4. Filter out already-used appointment notes and group session markers
      const unusedAppointmentNotes = (appointments || [])
        .filter((a: any) => !usedAppointmentIds.has(a.id))
        .filter((a: any) => !a.notes?.startsWith("[Group:"))
        .map((a: any) => ({
          id: `appt-${a.id}`,
          appointment_id: a.id,
          content: a.notes,
          created_at: a.scheduled_at,
          source: "appointment" as const,
          service_name: a.services?.name,
        }));

      // 4b. Build structured session-note entries
      const unusedSessionNotes = (sessionNotes || [])
        .filter((n: any) => !usedSessionNoteIds.has(n.id))
        .map((n: any) => {
          const parts: string[] = [];
          if (n.session_summary) parts.push(n.session_summary);
          if (n.has_homework && n.homework_text) parts.push(`📋 Homework: ${n.homework_text}`);
          if (n.transference) parts.push(`🔄 Transference: ${n.transference}`);
          return {
            id: n.id,
            appointment_id: n.appointment_id,
            content: parts.join("\n\n"),
            session_summary: n.session_summary,
            homework_text: n.has_homework ? n.homework_text : null,
            transference: n.transference,
            created_at: n.appointments?.scheduled_at || n.created_at,
            source: "session_note" as const,
            service_name: n.appointments?.services?.name,
          };
        })
        .filter((n: any) => n.content.length > 0);

      // 5. Merge all sources, dedupe appointment-level entries when a structured
      //    session_note exists for the same appointment (session_note wins).
      const sessionNoteApptIds = new Set(unusedSessionNotes.map(n => n.appointment_id));
      const allNotes = [
        ...(clientNotes || []).map((n: any) => ({ ...n, source: "client_note" as const })),
        ...unusedAppointmentNotes.filter(n => !sessionNoteApptIds.has(n.appointment_id)),
        ...unusedSessionNotes,
      ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      return allNotes;
    },
    enabled: !!user && !!clientId,
  });
}


export function useCreateSupervision() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
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
          ...(isDemoMode ? { is_demo: true } : {}),
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
          ...(isDemoMode ? { is_demo: true } : {}),
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
      track("supervision_created");
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
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; supervision_outcome?: string; supervisor_feedback?: string; next_steps?: string }) => {
      assertCanWrite();
      const { error } = await supabase
        .from("supervisions" as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      track("supervision_updated");
      qc.invalidateQueries({ queryKey: ["supervisions"] });
      qc.invalidateQueries({ queryKey: ["supervision"] });
    },
  });
}

export function useDeleteSupervision() {
  const qc = useQueryClient();
  const assertCanWrite = useDemoWriteGuard();
  return useMutation({
    mutationFn: async ({ id, expenseId }: { id: string; expenseId?: string }) => {
      assertCanWrite();
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
      track("supervision_deleted");
      qc.invalidateQueries({ queryKey: ["supervisions"] });
      qc.invalidateQueries({ queryKey: ["supervision-count"] });
      qc.invalidateQueries({ queryKey: ["unused-client-notes"] });
      qc.invalidateQueries({ queryKey: ["client-notes"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}
