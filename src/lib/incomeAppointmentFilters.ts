/**
 * Pure filter predicates used by IncomeConfirmationDialog to bucket a client's
 * appointments in the "link this payment to sessions" step.
 *
 * Kept as a standalone module so we can unit-test regressions like:
 *  - future-dated sessions with non-`scheduled` status being hidden
 *  - cancelled sessions leaking into the unpaid list
 */

export type FilterKey = "unpaid" | "partial" | "future" | "cancelled_billable" | "all";

export interface AppointmentBucketInput {
  status?: string | null;
  scheduled_at?: string | null;
  /** Amount still owed on this appointment (price - already-allocated). */
  remaining: number;
  /** Amount already paid/allocated toward this appointment. */
  otherPaid: number;
}

const isCancelledLike = (a: AppointmentBucketInput) =>
  a.status === "cancelled" || a.status === "no-show";

/**
 * A future session is anything with a future scheduled_at that is not
 * cancelled/no-show and not yet completed — regardless of its exact status
 * (`scheduled`, `confirmed`, `reminder_sent`, or any custom in-flight state).
 */
export const isFutureSession = (a: AppointmentBucketInput, now: Date = new Date()) => {
  if (!a.scheduled_at) return false;
  if (isCancelledLike(a)) return false;
  if (a.status === "completed") return false;
  return new Date(a.scheduled_at) > now;
};

export function matchesFilter(
  a: AppointmentBucketInput,
  filter: FilterKey,
  now: Date = new Date(),
): boolean {
  const cancelled = isCancelledLike(a);
  switch (filter) {
    case "unpaid":
      return !cancelled && a.remaining > 0 && a.otherPaid === 0;
    case "partial":
      return !cancelled && a.otherPaid > 0 && a.remaining > 0;
    case "future":
      return isFutureSession(a, now);
    case "cancelled_billable":
      return cancelled && a.remaining > 0;
    case "all":
    default:
      return true;
  }
}
