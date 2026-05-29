/**
 * Pure utilities for computing a client's balance with auto-coverage logic.
 *
 * Stages:
 *   1. raw prepaid pool = totalPaid − price of fully-paid completed sessions
 *   2. raw outstanding  = sum(price − allocated) for completed sessions NOT marked fully paid
 *   3. auto-cover: prepaid pool absorbs raw outstanding starting with the oldest
 *      outstanding session. Sessions whose remaining gap is fully absorbed become
 *      "auto-covered" — UI should display them as Paid (from prepayment).
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
  scheduled_at?: string | null;
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
  /** Appointment IDs whose remaining gap was fully covered by the prepaid pool. */
  autoCoveredApptIds: Set<string>;
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
  const outstandingItems: { id: string; gap: number; ts: number }[] = [];
  for (const a of payableCompleted) {
    const price = Number(a.price || 0);
    const paid = Number(allocByApt[a.id]?.paid || 0);
    if (FULLY_PAID_STATUSES.has(String(a.payment_status))) {
      fullyPaidTotal += price;
    } else {
      const gap = Math.max(0, price - paid);
      rawOutstanding += gap;
      if (gap > 0) {
        outstandingItems.push({
          id: a.id,
          gap,
          ts: a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0,
        });
      }
    }
  }

  const rawPrepaid = Math.max(0, Number(totalPaid || 0) - fullyPaidTotal);

  // Allocate prepaid pool to outstanding sessions oldest-first.
  outstandingItems.sort((a, b) => a.ts - b.ts);
  const autoCoveredApptIds = new Set<string>();
  let pool = rawPrepaid;
  const EPSILON = 0.001;
  for (const item of outstandingItems) {
    if (pool + EPSILON >= item.gap) {
      autoCoveredApptIds.add(item.id);
      pool -= item.gap;
    } else {
      // Pool can't fully cover this gap — leave as partially paid and stop.
      break;
    }
  }

  const covered = Math.min(rawPrepaid, rawOutstanding);

  return {
    prepaid: rawPrepaid - covered,
    outstanding: rawOutstanding - covered,
    fullyPaidTotal,
    rawPrepaid,
    rawOutstanding,
    payableCompleted,
    autoCoveredApptIds,
  };
}
