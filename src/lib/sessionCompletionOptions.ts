/**
 * Pure rules deciding which payment options are shown when completing a
 * session, and the resulting side-effects (Expected Payment / Income /
 * prepayment deduction) the write layer must perform.
 *
 * Mirrors the spec: "Синхронізація оплат, передоплат, балансів клієнта та
 * статусів сесій". Kept side-effect free so it can be unit tested without a
 * database round-trip.
 */

export type CompletionMode = "pay_now" | "waiting" | "from_prepayment";

export interface CompletionInput {
  /** Session price in currency units. */
  price: number;
  /** Client's currently unused prepayment pool. */
  prepaidBalance: number;
  /** Income already allocated to THIS session (e.g. prepaid for this slot). */
  preallocatedToSession?: number;
  /** True when the session belongs to a group booking (no prepayment flow). */
  isGroupSession?: boolean;
}

export interface CompletionOption {
  mode: CompletionMode | "already_paid";
  /** True when this option should be the pre-selected default. */
  primary: boolean;
}

const EPS = 0.001;

/**
 * The options a user may pick from in the completion dialog.
 * "paid_in_advance" is intentionally NOT returned — the spec removes it.
 */
export function completionOptionsFor(input: CompletionInput): CompletionOption[] {
  const price = Math.max(0, Number(input.price) || 0);
  const balance = Math.max(0, Number(input.prepaidBalance) || 0);
  const prealloc = Math.max(0, Number(input.preallocatedToSession) || 0);
  const isGroup = !!input.isGroupSession;

  const fullyPreallocated = price > 0 && prealloc + EPS >= price;
  const prepaymentCovers = !isGroup && balance + EPS >= price && price > 0;

  if (fullyPreallocated && !isGroup) {
    return [{ mode: "already_paid", primary: true }];
  }
  const opts: CompletionOption[] = [];
  if (prepaymentCovers) {
    opts.push({ mode: "from_prepayment", primary: true });
  }
  opts.push({ mode: "pay_now", primary: !prepaymentCovers });
  opts.push({ mode: "waiting", primary: false });
  return opts;
}

export interface PreviewLine {
  sessionPrice: number;
  amountToDeduct: number;
  prepaymentRemainingAfter: number;
  approxSessionsCovered: number;
}

/** Numbers rendered on the prepayment preview card. */
export function prepaymentPreview(input: {
  prepaidBalance: number;
  price: number;
}): PreviewLine {
  const price = Math.max(0, Number(input.price) || 0);
  const balance = Math.max(0, Number(input.prepaidBalance) || 0);
  const amountToDeduct = Math.min(price, balance);
  return {
    sessionPrice: price,
    amountToDeduct,
    prepaymentRemainingAfter: Math.max(0, balance - amountToDeduct),
    approxSessionsCovered: price > 0 ? Math.floor(balance / price) : 0,
  };
}

export type FinancialEffect =
  | { kind: "confirmed_income"; amount: number; source: "session_payment" }
  | { kind: "expected_payment"; amount: number }
  | { kind: "prepayment_deduction"; amount: number; from_prepayment: true }
  | { kind: "confirmed_income_zero"; source: "paid_from_prepayment" };

/**
 * The financial records that must be written for a given completion choice.
 *
 * AC1  Pay now      -> confirmed_income(price)              (no EP)
 * AC2  Waiting      -> expected_payment(price)              (no income)
 * AC3  From prepay  -> prepayment_deduction(price) + €0 confirmed income
 *                                                           (no EP)
 * AC8  paid_in_advance is not a valid mode.
 */
export function financialEffectsFor(
  mode: CompletionMode,
  input: CompletionInput,
): FinancialEffect[] {
  const price = Math.max(0, Number(input.price) || 0);
  const balance = Math.max(0, Number(input.prepaidBalance) || 0);

  if (mode === "pay_now") {
    return price > 0
      ? [{ kind: "confirmed_income", amount: price, source: "session_payment" }]
      : [];
  }
  if (mode === "waiting") {
    return price > 0 ? [{ kind: "expected_payment", amount: price }] : [];
  }
  if (mode === "from_prepayment") {
    if (balance + EPS < price) {
      // Guarded upstream by isPrepaymentInsufficient; keep defensive.
      throw new Error("insufficient_prepayment");
    }
    return [
      { kind: "prepayment_deduction", amount: price, from_prepayment: true },
      { kind: "confirmed_income_zero", source: "paid_from_prepayment" },
    ];
  }
  // Unknown mode
  return [];
}

export function isPrepaymentInsufficient(input: CompletionInput): boolean {
  const price = Math.max(0, Number(input.price) || 0);
  const balance = Math.max(0, Number(input.prepaidBalance) || 0);
  return !input.isGroupSession && balance > EPS && balance + EPS < price;
}

/** Whether a given completion should touch the Expected Payments table. */
export function shouldCreateExpectedPayment(mode: CompletionMode): boolean {
  return mode === "waiting";
}

/** New payment_status assigned to the appointment row after completion. */
export function nextPaymentStatus(mode: CompletionMode): string {
  switch (mode) {
    case "pay_now":
      return "paid_now";
    case "waiting":
      return "waiting_for_payment";
    case "from_prepayment":
      return "paid_from_prepayment";
  }
}
