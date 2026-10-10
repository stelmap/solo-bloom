import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isPaid } from "@/lib/paymentClassifiers";

export type UnpaidMeeting = {
  apt: any;
  price: number;
  paid: number;
  remaining: number;
};

/** Statuses that represent a delivered/billed meeting which may carry a debt. */
const DEBT_PAYMENT_STATUSES = new Set([
  "unpaid",
  "waiting_for_payment",
  "partially_paid",
  "partially_paid_from_prepayment",
]);

/**
 * Pure: compute remaining due for a meeting. A meeting is owed only once it
 * was completed (or billed-cancelled) — the time merely passing never creates debt.
 */
export function computeUnpaidMeeting(apt: any, allocated: number): UnpaidMeeting | null {
  const status = String(apt?.status ?? "");
  const pay = String(apt?.payment_status ?? "");
  const delivered = status === "completed" || ((status === "cancelled" || status === "no-show") && pay !== "unpaid" && DEBT_PAYMENT_STATUSES.has(pay));
  if (!delivered) return null;
  if (isPaid(apt) || !DEBT_PAYMENT_STATUSES.has(pay)) return null;
  const price = Number(apt?.price ?? 0);
  const paid = Math.max(0, allocated);
  const remaining = Math.round((price - paid) * 100) / 100;
  if (remaining <= 0) return null;
  return { apt, price, paid, remaining };
}

/** All completed meetings with an amount still due — independent of the visible week or filters. */
export function useUnpaidMeetings() {
  const { user } = useAuth();
  return useQuery({
    // "appointments" prefix: refreshes whenever appointments are invalidated (payments, realtime).
    queryKey: ["appointments", user?.id, "unpaid-meetings"],
    enabled: !!user,
    queryFn: async (): Promise<UnpaidMeeting[]> => {
      const { data: apts, error } = await supabase
        .from("appointments")
        .select("*, clients(name), services(name, price), group_sessions!appointments_group_session_id_fkey(id, group_id, groups(name))")
        .in("payment_status", Array.from(DEBT_PAYMENT_STATUSES))
        .in("status", ["completed", "cancelled", "no-show"])
        .order("scheduled_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const list = apts || [];
      if (list.length === 0) return [];
      const ids = list.map((a: any) => a.id);
      const allocated = new Map<string, number>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data: allocs } = await supabase
          .from("income_session_allocations")
          .select("appointment_id, allocated_amount, income:income_id(status)")
          .in("appointment_id", ids.slice(i, i + 200));
        for (const r of (allocs || []) as any[]) {
          if (r.income?.status === "cancelled") continue;
          allocated.set(r.appointment_id, (allocated.get(r.appointment_id) || 0) + Number(r.allocated_amount || 0));
        }
      }
      return list
        .map((a: any) => computeUnpaidMeeting(a, allocated.get(a.id) || 0))
        .filter(Boolean) as UnpaidMeeting[];
    },
  });
}
