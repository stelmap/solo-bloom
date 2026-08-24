import { useMemo } from "react";
import { CalendarDays, Clock, FileSignature, Inbox, Receipt, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useAppointments, useClients, useDashboardStats } from "@/hooks/useData";
import { useBookingRequests } from "@/hooks/useBookingInbox";

const PAID_STATUSES = new Set(["paid_now", "paid_in_advance", "paid_from_prepayment"]);

export type AttentionTone = "warning" | "danger" | "info" | "muted";

export type AttentionItem = {
  key: string;
  icon: LucideIcon;
  tone: AttentionTone;
  title: string;
  sub: string;
  /** Analytics widget id used by the dashboard tracker. */
  widget: string;
  path: string;
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function currentMonthKey(offset = 0) {
  const base = new Date();
  const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/**
 * Single source of truth for the "Needs attention" list.
 * Both the Dashboard widget and the Calendar right sidebar render this list,
 * so counts and items always match.
 */
export function useNeedsAttention(monthKey: string = currentMonthKey()) {
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();
  const { data: stats } = useDashboardStats();
  const { data: allAppointments = [] } = useAppointments();
  const { data: allClients = [] } = useClients();
  // Pending booking requests are actionable regardless of the selected month.
  const { data: bookingRequests = [] } = useBookingRequests(null);

  const pendingRequests = useMemo(
    () => (bookingRequests as any[]).filter((r) => r.status === "pending" || r.status === "needs_linking"),
    [bookingRequests],
  );

  const isCurrentMonth = monthKey === currentMonthKey();

  const clientsWithoutNextSessionCount = useMemo(() => {
    const nowIso = new Date().toISOString();
    const withFuture = new Set<string>();
    for (const a of allAppointments as any[]) {
      if (a.status !== "cancelled" && a.scheduled_at > nowIso && a.client_id) withFuture.add(a.client_id);
    }
    let count = 0;
    for (const c of allClients as any[]) {
      if ((c.status ?? "active") === "active" && !withFuture.has(c.id)) count++;
    }
    return count;
  }, [allClients, allAppointments]);

  const derived = useMemo(() => {
    let cancelled = 0, lostIncome = 0;
    const unpaid: any[] = [];
    for (const a of allAppointments as any[]) {
      if (String(a.scheduled_at).slice(0, 7) !== monthKey) continue;
      if (a.status === "cancelled") {
        cancelled++;
        if (!PAID_STATUSES.has(a.payment_status)) lostIncome += Number(a.price ?? 0);
        continue;
      }
      if (a.status === "completed" && !PAID_STATUSES.has(a.payment_status)) unpaid.push(a);
    }
    const unpaidTotal = unpaid.reduce((s, a) => s + Number(a.price ?? 0), 0);
    return { cancelled, lostIncome, unpaid, unpaidTotal };
  }, [allAppointments, monthKey]);

  const totalDebt = Number((stats as any)?.outstandingBalance ?? 0);

  const items: AttentionItem[] = [
    {
      key: "pending",
      icon: Inbox,
      tone: "warning" as const,
      show: pendingRequests.length > 0,
      title: `${t("booking.pendingRequests") || "Pending requests"}: ${pendingRequests.length}`,
      sub: t("booking.pendingRequestsSub") || "Review and confirm booking requests",
      widget: "pending_requests",
      path: "/booking-inbox?status=pending",
    },
    {
      key: "unpaid",
      icon: Clock,
      tone: "warning" as const,
      show: derived.unpaid.length > 0,
      title: `${t("dashm.unpaidSessions", { count: derived.unpaid.length })}*`,
      sub: `${t("dashm.totalAmount")}: ${cs}${derived.unpaidTotal.toLocaleString()}`,
      widget: "unpaid_sessions",
      path: "/finances/income?tab=pending&range=all",
    },
    {
      key: "debt",
      icon: Receipt,
      tone: "danger" as const,
      show: totalDebt > 0,
      title: `${t("ops.totalDebt")}: ${cs}${totalDebt.toLocaleString()}*`,
      sub: t("dashm.debtSub"),
      widget: "total_debt",
      path: "/finances/income?tab=pending&range=all",
    },
    {
      key: "noNext",
      icon: CalendarDays,
      tone: "info" as const,
      show: isCurrentMonth && clientsWithoutNextSessionCount > 0,
      title: `${t("dashm.clientsWithoutNext", { count: clientsWithoutNextSessionCount })}*`,
      sub: t("dashm.clientsWithoutNextSub"),
      widget: "clients_without_next_session",
      path: "/clients?filter=withoutNextSession",
    },
    {
      key: "lost",
      icon: FileSignature,
      tone: "muted" as const,
      show: derived.lostIncome > 0,
      title: `${t("ops.lostIncomeCancellations")}: ${cs}${derived.lostIncome.toLocaleString()}*`,
      sub: t("dashm.lostSub", { count: derived.cancelled }),
      widget: "lost_income",
      path: "/calendar",
    },
  ].filter((a) => a.show).map(({ show, ...rest }) => rest);

  return { items, count: items.length, pendingRequests, unpaid: derived.unpaid, unpaidTotal: derived.unpaidTotal };
}
