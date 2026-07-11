/**
 * Pure helpers for the manual-payment → Linked-sessions flow.
 *
 * Extracted so the allocation rules (AC1–AC10) can be unit-tested without
 * hitting Supabase. The `useSaveIncomeConfirmation` mutation applies the
 * same logic when persisting.
 */

export type AllocSession = {
  id: string;
  price: number;
  /** Amount already allocated to this session from OTHER income rows. */
  otherPaid: number;
  scheduled_at: string;
  status?: string | null;
};

export type AllocInput = {
  amount: number;
  allocations: Record<string, number>;
  sessions: AllocSession[];
};

export type AllocValidation =
  | { ok: true; totalAllocated: number; prepaidRemainder: number }
  | { ok: false; code: "over_amount" | "over_session" | "negative"; sessionId?: string; max?: number };

/** Remaining debt for a session (never negative). */
export function remainingDebt(s: AllocSession): number {
  return Math.max(0, Number(s.price || 0) - Number(s.otherPaid || 0));
}

/** AC9: oldest → newest. Stable on equal timestamps. */
export function sortOldestFirst<T extends { scheduled_at: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );
}

/**
 * AC1–AC3 + AC7: validate a proposed allocation set.
 *  - No negative allocations
 *  - Per-session cap ≤ remainingDebt (AC3)
 *  - Total ≤ payment amount (AC7 remainder is prepaid, not overflow)
 */
export function validateAllocations(input: AllocInput): AllocValidation {
  let total = 0;
  for (const s of input.sessions) {
    const a = Number(input.allocations[s.id] || 0);
    if (a < 0) return { ok: false, code: "negative", sessionId: s.id };
    const cap = remainingDebt(s);
    if (a - cap > 0.001) {
      return { ok: false, code: "over_session", sessionId: s.id, max: cap };
    }
    total += a;
  }
  if (total - Number(input.amount) > 0.001) {
    return { ok: false, code: "over_amount", max: Number(input.amount) };
  }
  return {
    ok: true,
    totalAllocated: Number(total.toFixed(2)),
    prepaidRemainder: Number(Math.max(0, Number(input.amount) - total).toFixed(2)),
  };
}

/**
 * AC10 auto-allocate: fill oldest debts first, never exceed a session's
 * remaining debt, never exceed the payment amount. Leftover surfaces as
 * prepaid balance (AC7). Cancelled/no-show sessions are treated as debts
 * when their price remains unpaid ("billable cancelled").
 */
export function autoAllocate(
  amount: number,
  sessions: AllocSession[],
): { allocations: Record<string, number>; prepaidRemainder: number } {
  const ordered = sortOldestFirst(sessions);
  let leftover = Number(amount) || 0;
  const out: Record<string, number> = {};
  for (const s of ordered) {
    if (leftover <= 0) break;
    const debt = remainingDebt(s);
    if (debt <= 0) continue;
    const take = Math.min(debt, leftover);
    if (take > 0) {
      out[s.id] = Number(take.toFixed(2));
      leftover -= take;
    }
  }
  return { allocations: out, prepaidRemainder: Number(Math.max(0, leftover).toFixed(2)) };
}

export type EpAdjustment =
  | { epId: string; action: "cancel"; reason: "manual_payment_recorded" }
  | {
      epId: string;
      action: "split";
      reason: "partially_covered_by_manual_payment";
      newAmount: number;
    };

/**
 * AC4 / AC5: given an active Expected Payment for a session and the amount
 * the manual payment allocates to that session, decide whether the EP is
 * fully cancelled or split into a new smaller EP for the leftover.
 */
export function planExpectedPaymentAdjustment(
  ep: { id: string; amount: number },
  allocatedToSession: number,
): EpAdjustment {
  const epAmount = Number(ep.amount || 0);
  const alloc = Number(allocatedToSession || 0);
  if (alloc + 0.001 >= epAmount) {
    return { epId: ep.id, action: "cancel", reason: "manual_payment_recorded" };
  }
  return {
    epId: ep.id,
    action: "split",
    reason: "partially_covered_by_manual_payment",
    newAmount: Number((epAmount - alloc).toFixed(2)),
  };
}

/**
 * AC11 final balance identity:
 *   payment_amount === sum(allocations) + prepaid_remainder
 */
export function balanceHolds(
  amount: number,
  allocations: Record<string, number>,
  prepaidRemainder: number,
): boolean {
  const total = Object.values(allocations).reduce((s, v) => s + Number(v || 0), 0);
  return Math.abs(Number(amount) - (total + Number(prepaidRemainder))) < 0.01;
}
