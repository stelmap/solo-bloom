/**
 * Pure predicates classifying an appointment by lifecycle + payment status.
 * Used by the client detail page (and tests) so prepaid sessions are
 * consistently treated as paid across counts and filters.
 */
export type AppointmentLike = {
  status?: string | null;
  payment_status?: string | null;
};

export const isCompleted = (a: AppointmentLike) => a.status === "completed";

export const isPaid = (a: AppointmentLike) =>
  a.payment_status === "paid_now" ||
  a.payment_status === "paid_in_advance" ||
  a.payment_status === "paid_from_prepayment";

export const isAwaiting = (a: AppointmentLike) =>
  a.status === "completed" &&
  (a.payment_status === "unpaid" ||
    a.payment_status === "waiting_for_payment" ||
    a.payment_status === "partially_paid" ||
    a.payment_status === "partially_paid_from_prepayment");

export const isCancelled = (a: AppointmentLike) => a.status === "cancelled";

export const isNoShow = (a: AppointmentLike) => a.status === "no-show";

export const isPrepaid = (a: AppointmentLike) =>
  a.payment_status === "paid_in_advance" ||
  a.payment_status === "paid_from_prepayment";

/**
 * A "real" session that should be counted in Total Sessions:
 *  - anything completed / cancelled / no-show
 *  - upcoming scheduled sessions (scheduled_at >= now)
 * Excludes past-dated `scheduled` orphans (never closed / seed leftovers)
 * so counts match DB reality shown in the audit.
 */
export const isRealSession = (a: AppointmentLike & { scheduled_at?: string | null }) => {
  const s = a.status ?? "";
  if (s === "completed" || s === "cancelled" || s === "no-show") return true;
  if (s === "scheduled" || s === "confirmed" || s === "reminder_sent") {
    const ts = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
    return ts >= Date.now();
  }
  return false;
};

