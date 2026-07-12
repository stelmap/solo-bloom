/**
 * Pure filter predicates used by IncomeConfirmationDialog to bucket a client's
 * appointments in the "link this payment to sessions" step.
 *
 * The bucket a session lands in must be derived from a *combination* of:
 *   - lifecycle status (`status`)
 *   - payment status (`payment_status`)
 *   - session date (`scheduled_at`)
 *   - price / already paid / remaining
 *   - cancellation billability
 *
 * Deciding on any single one of these fields alone is the class of bug that
 * caused paid/future sessions to leak into the Unpaid tab.
 */

export type FilterKey = "unpaid" | "partial" | "future" | "cancelled_billable" | "all";

export interface AppointmentBucketInput {
  status?: string | null;
  payment_status?: string | null;
  scheduled_at?: string | null;
  /** Session's final billable price. */
  price?: number;
  /** Amount still owed on this appointment (price - already-allocated). */
  remaining: number;
  /** Amount already paid/allocated toward this appointment. */
  otherPaid: number;
  /** Optional flag from the API when a cancellation is billable per policy. */
  is_billable_cancellation?: boolean | null;
  /** Soft-delete / archived marker. */
  is_deleted?: boolean | null;
}

const PAID_STATUSES = new Set([
  "paid_now",
  "paid_in_advance",
  "paid_from_prepayment",
]);

const PARTIAL_STATUSES = new Set([
  "partially_paid",
  "partially_paid_from_prepayment",
]);

const UNPAID_STATUSES = new Set([
  "unpaid",
  "waiting_for_payment",
  // treat unknown / missing status as unpaid only when there's real debt —
  // see isUnpaidSession below.
]);

const isCancelledLike = (a: AppointmentBucketInput) =>
  a.status === "cancelled" || a.status === "no-show";

const isDeleted = (a: AppointmentBucketInput) => a.is_deleted === true;

const isCompletedLike = (a: AppointmentBucketInput) => a.status === "completed";

export const isPaidStatus = (a: AppointmentBucketInput) =>
  PAID_STATUSES.has(a.payment_status ?? "");

export const isPartialStatus = (a: AppointmentBucketInput) =>
  PARTIAL_STATUSES.has(a.payment_status ?? "");

/**
 * remaining <= 0 OR payment_status marks it fully paid.
 */
export const isFullyPaid = (a: AppointmentBucketInput) =>
  isPaidStatus(a) || a.remaining <= 0;

/**
 * A future session is anything with a future scheduled_at that is not
 * cancelled/no-show, not deleted, and not yet completed. Lifecycle status
 * must be `scheduled` / `confirmed` / `reminder_sent` (or any custom
 * in-flight state) — never `completed`.
 */
export const isFutureSession = (a: AppointmentBucketInput, now: Date = new Date()) => {
  if (!a.scheduled_at) return false;
  if (isDeleted(a)) return false;
  if (isCancelledLike(a)) return false;
  if (isCompletedLike(a)) return false;
  return new Date(a.scheduled_at) > now;
};

/**
 * Unpaid tab: only sessions the therapist can currently collect on, that
 * have not received any payment yet. Excludes: paid, partially paid, future,
 * cancelled, deleted, zero-debt.
 */
export const isUnpaidSession = (a: AppointmentBucketInput, now: Date = new Date()) => {
  if (isDeleted(a)) return false;
  if (isCancelledLike(a)) return false;
  if (isFutureSession(a, now)) return false;
  if (isFullyPaid(a)) return false;
  if (isPartialStatus(a)) return false;
  if (a.otherPaid > 0) return false;
  if (a.remaining <= 0) return false;
  // Payment status must be an unpaid-like state (or completed with no explicit
  // paid marker). Guards against sessions marked `not_applicable`.
  const ps = a.payment_status ?? "";
  if (ps === "not_applicable") return false;
  if (isCompletedLike(a)) return true;
  return UNPAID_STATUSES.has(ps);
};

/**
 * Partially paid tab: session has received some payment but still has debt.
 */
export const isPartiallyPaidSession = (
  a: AppointmentBucketInput,
  now: Date = new Date(),
) => {
  if (isDeleted(a)) return false;
  if (isCancelledLike(a)) return false;
  if (isFutureSession(a, now)) return false;
  if (a.remaining <= 0) return false;
  if (isPartialStatus(a)) return true;
  // Fallback for records without explicit partial status but with real
  // allocation history.
  return a.otherPaid > 0 && a.remaining > 0 && !isPaidStatus(a);
};

/**
 * Billable cancelled: cancelled per policy and money is still owed.
 */
export const isBillableCancelledSession = (a: AppointmentBucketInput) => {
  if (isDeleted(a)) return false;
  if (!isCancelledLike(a)) return false;
  if (a.remaining <= 0) return false;
  // If the API sets the flag explicitly, honor it. Otherwise treat any
  // cancelled row that still has debt as billable (matches legacy behavior).
  if (a.is_billable_cancellation === false) return false;
  return true;
};

export function matchesFilter(
  a: AppointmentBucketInput,
  filter: FilterKey,
  now: Date = new Date(),
): boolean {
  if (isDeleted(a)) return false;
  switch (filter) {
    case "unpaid":
      return isUnpaidSession(a, now);
    case "partial":
      return isPartiallyPaidSession(a, now);
    case "future":
      return isFutureSession(a, now);
    case "cancelled_billable":
      return isBillableCancelledSession(a);
    case "all":
    default:
      return true;
  }
}
