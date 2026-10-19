import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function usePracticeLiveUpdates() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user?.id) return;
    const refresh = () => {
      for (const key of ["appointments", "client-appointments", "dashboard-stats", "booking-requests", "booking-requests-count", "income", "income-all", "expected-payments"])
        void qc.invalidateQueries({ queryKey: [key] });
    };
    const channel = supabase.channel(`practice-live:${user.id}`);
    for (const table of ["appointments", "session_booking_requests", "group_sessions", "income"])
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `user_id=eq.${user.id}` }, refresh);
    channel.subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, qc]);
}