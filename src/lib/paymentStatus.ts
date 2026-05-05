/**
 * Pure replica of the DB function `recalc_appointment_payment_status`.
 * Computes the resulting payment_status for a session given its price,
 * scheduled date, current status, and the set of confirmed allocations
 * applied to it.
 *
 * Status outputs mirror the database:
 *   - "unpaid"
 *   - "partially_paid"
 *   - "paid_now"          (allocation date >= session date)
 *   - "paid_in_advance"   (any allocation date < session date)
 *
 * Cancelled / no-show sessions keep their existing payment_status.
 * Overpayment of a single session still resolves as fully paid; the
 * remainder is held as client credit and is NOT represented here.
 */
export type AppointmentLifecycleStatus =
  | "scheduled"
  | "confirmed"
  | "reminder_sent"
  | "completed"
  | "cancelled"
  | "no-show";

export type PaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid_now"
  | "paid_in_advance"
  | "waiting_for_payment";

export interface ConfirmedAllocation {
  /** ISO date (YYYY-MM-DD) the income was received. */
  date: string;
  amount: number;
}

export interface RecalcInput {
  price: number;
  /** ISO date or full timestamp of the session. Only the date part is used. */
  scheduled_at: string;
  status: AppointmentLifecycleStatus;
  /** Only confirmed income allocations should be passed in. */
  allocations: ConfirmedAllocation[];
  /** Existing payment_status on the row, used when allocations sum to 0. */
  currentPaymentStatus?: PaymentStatus;
}

export function recalcAppointmentPaymentStatus(input: RecalcInput): PaymentStatus {
  const { price, scheduled_at, status, allocations, currentPaymentStatus } = input;

  if (status === "cancelled" || status === "no-show") {
    return currentPaymentStatus ?? "unpaid";
  }

  const allocSum = allocations.reduce((s, a) => s + Number(a.amount || 0), 0);

  if (allocSum <= 0) {
    if (
      currentPaymentStatus === "paid_now" ||
      currentPaymentStatus === "paid_in_advance" ||
      currentPaymentStatus === "partially_paid"
    ) {
      return "unpaid";
    }
    return currentPaymentStatus ?? "unpaid";
  }

  const sessionDate = scheduled_at.slice(0, 10);
  const minPayDate = allocations
    .map((a) => a.date)
    .sort()[0];

  if (price > 0 && allocSum + 1e-9 >= price) {
    return minPayDate < sessionDate ? "paid_in_advance" : "paid_now";
  }
  return "partially_paid";
}
