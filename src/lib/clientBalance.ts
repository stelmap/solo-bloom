/**
 * Pure utilities for computing a client's balance with auto-coverage logic.
 *
 * Stages:
 *   1. raw prepaid pool = totalPaid − price of fully-paid completed sessions
 *   2. raw outstanding  = sum(price − allocated) for completed sessions NOT marked fully paid
 *   3. auto-cover: prepaid pool first absorbs raw outstanding.
 *
 * Final:
 *   prepaid     = max(0, rawPrepaid − rawOutstanding)
 *   outstanding = max(0, rawOutstanding − rawPrepaid)
 */

export const FULLY_PAID_STATUSES = new Set([
  "paid_now",
  "paid_in_advance",
  "paid_from_prepayment",
]);

export type AppointmentLike = {
  id: string;
  status?: string | null;
  price?: number | null;
  payment_status?: string | null;
};

export type AllocationMap = Record<string, { paid?: number } | undefined>;

export type BalanceInput = {
  appointments: AppointmentLike[];
  allocByApt: AllocationMap;
  totalPaid: number;
};

export type BalanceResult = {
  prepaid: number;
  outstanding: number;
  fullyPaidTotal: number;
  rawPrepaid: number;
  rawOutstanding: number;
  payableCompleted: AppointmentLike[];
};

export function computeClientBalance({
  appointments,
  allocByApt,
  totalPaid,
}: BalanceInput): BalanceResult {
  const payableCompleted = appointments.filter(
    (a) =>
      a.status === "completed" &&
      Number(a.price || 0) > 0 &&
      a.payment_status !== "not_applicable",
  );

  let fullyPaidTotal = 0;
  let rawOutstanding = 0;
  for (const a of payableCompleted) {
    const price = Number(a.price || 0);
    const paid = Number(allocByApt[a.id]?.paid || 0);
    if (FULLY_PAID_STATUSES.has(String(a.payment_status))) {
      fullyPaidTotal += price;
    } else {
      rawOutstanding += Math.max(0, price - paid);
    }
  }

  const rawPrepaid = Math.max(0, Number(totalPaid || 0) - fullyPaidTotal);
  const covered = Math.min(rawPrepaid, rawOutstanding);

  return {
    prepaid: rawPrepaid - covered,
    outstanding: rawOutstanding - covered,
    fullyPaidTotal,
    rawPrepaid,
    rawOutstanding,
    payableCompleted,
  };
}
