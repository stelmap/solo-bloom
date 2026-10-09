import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { summarizePrepaid, type PrepaidLedgerRow } from "@/lib/prepaidSessions";

export const PREPAID_LEDGER_KEY = "prepaid-session-ledger";

/** All prepaid-session ledger rows of the signed-in practitioner. */
export function usePrepaidLedger() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [PREPAID_LEDGER_KEY, user?.id],
    enabled: !!user?.id,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("session_prepayment_ledger")
        .select("id, client_id, kind, sessions, amount, appointment_id, income_id, reversed_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PrepaidLedgerRow[];
    },
  });
}

export function usePrepaidSummaries() {
  const q = usePrepaidLedger();
  return { ...q, summaries: summarizePrepaid(q.data ?? []) };
}
