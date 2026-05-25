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

export const isCancelled = (a: AppointmentLike) =>
  a.status === "cancelled" || a.status === "no-show";

export const isPrepaid = (a: AppointmentLike) =>
  a.payment_status === "paid_in_advance" ||
  a.payment_status === "paid_from_prepayment";
