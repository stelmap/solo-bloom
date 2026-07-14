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

/**
 * A cancellation that still carries a financial obligation (late-cancel fee,
 * paid from prepayment, or debt owed). From a session-management / clinical
 * perspective these count as delivered sessions — the slot was billed, only
 * the client's attendance changed. Finance side remains fully separate.
 *
 * Non-billed cancellations keep `payment_status = 'not_applicable'` (or null)
 * and are excluded here so free cancellations don't inflate delivered counts.
 */
const BILLED_PAYMENT_STATUSES = new Set([
  "paid_now",
  "paid_in_advance",
  "paid_from_prepayment",
  "waiting_for_payment",
  "partially_paid",
  "partially_paid_from_prepayment",
]);
export const isBilledCancellation = (a: AppointmentLike) =>
  (a.status === "cancelled" || a.status === "no-show") &&
  BILLED_PAYMENT_STATUSES.has(String(a.payment_status ?? ""));

/**
 * "Delivered" = session that counts toward the therapist's completed workload.
 * Includes true completions AND billed cancellations. Per product decision,
 * billed cancellations are ALSO still counted under `isCancelled` — the two
 * counters intentionally overlap so finance and session-management stay
 * independent.
 */
export const isDelivered = (a: AppointmentLike) =>
  isCompleted(a) || isBilledCancellation(a);

export const isPaid = (a: AppointmentLike) =>
  a.payment_status === "paid_now" ||
  a.payment_status === "paid_in_advance" ||
  a.payment_status === "paid_from_prepayment";

export const isAwaiting = (a: AppointmentLike) =>
  (a.status === "completed" || a.status === "cancelled" || a.status === "no-show") &&
  (a.payment_status === "waiting_for_payment" ||
    a.payment_status === "partially_paid" ||
    a.payment_status === "partially_paid_from_prepayment" ||
    (a.status === "completed" && a.payment_status === "unpaid"));

export const isCancelled = (a: AppointmentLike) => a.status === "cancelled";

export const isNoShow = (a: AppointmentLike) => a.status === "no-show";

/**
 * Prepaid = money still reserved for a future/not-yet-performed session.
 * Once a session is completed, its payment is earned (paid), not reserved,
 * so completed sessions must never be reported as prepaid — even if their
 * payment_status column is momentarily stale.
 */
export const isPrepaid = (a: AppointmentLike) => {
  const active = a.status === "scheduled" || a.status === "confirmed" || a.status === "reminder_sent";
  return active && (a.payment_status === "paid_in_advance" || a.payment_status === "paid_from_prepayment");
};

/**
 * A "real" session that should be counted in Total Sessions:
 *  - anything completed / cancelled / no-show
 *  - any scheduled / confirmed / reminder_sent session, regardless of date
 *
 * Past-dated `scheduled` sessions are legitimate — therapists often haven't
 * marked them completed yet. We must not hide them from the client card.
 */
export const isRealSession = (a: AppointmentLike & { scheduled_at?: string | null }) => {
  const s = a.status ?? "";
  return (
    s === "completed" ||
    s === "cancelled" ||
    s === "no-show" ||
    s === "scheduled" ||
    s === "confirmed" ||
    s === "reminder_sent"
  );
};

