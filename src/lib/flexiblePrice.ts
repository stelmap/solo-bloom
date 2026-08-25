/**
 * Pure rules for the "Flexible session price" feature.
 *
 * For clients with `flexible_session_price` enabled, the actual amount received
 * may differ from the standard service price (currency conversion, individual
 * agreement). The entered amount fully settles the session: no debt, no
 * prepayment/credit, no reallocation to other sessions.
 */

export type FlexiblePaymentSource = "new_payment" | "prepaid_balance";

export interface FlexibleValidationInput {
  /** Raw value typed by the therapist. */
  amount: number | string | null | undefined;
  paymentDate: string | null | undefined;
  source: FlexiblePaymentSource | null | undefined;
  /** Client's currently available prepaid balance. */
  prepaidBalance: number;
}

export type FlexibleValidationError =
  | "amount_required"
  | "amount_invalid"
  | "amount_not_positive"
  | "date_required"
  | "source_required"
  | "insufficient_prepaid";

export interface FlexibleValidationResult {
  valid: boolean;
  /** Parsed, rounded amount when the input is numerically valid. */
  amount: number | null;
  error: FlexibleValidationError | null;
}

const EPS = 0.001;

export function parseFlexibleAmount(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const s = typeof raw === "string" ? raw.trim().replace(",", ".") : String(raw);
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export function validateFlexibleCompletion(
  input: FlexibleValidationInput,
): FlexibleValidationResult {
  const raw = input.amount;
  const isEmpty = raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "");
  if (isEmpty) return { valid: false, amount: null, error: "amount_required" };

  const amount = parseFlexibleAmount(raw);
  if (amount === null) return { valid: false, amount: null, error: "amount_invalid" };
  if (amount <= 0) return { valid: false, amount, error: "amount_not_positive" };

  if (!input.paymentDate) return { valid: false, amount, error: "date_required" };
  if (!input.source) return { valid: false, amount, error: "source_required" };

  if (input.source === "prepaid_balance") {
    const balance = Math.max(0, Number(input.prepaidBalance) || 0);
    if (balance + EPS < amount) {
      return { valid: false, amount, error: "insufficient_prepaid" };
    }
  }

  return { valid: true, amount, error: null };
}

export type FlexibleEffect =
  | { kind: "confirmed_income"; amount: number; linkedToSession: true }
  | { kind: "prepaid_allocation"; amount: number; linkedToSession: true };

/**
 * The single financial record written for a flexible-price completion.
 * Never produces debt, credit or cross-session allocation.
 */
export function flexibleFinancialEffects(
  source: FlexiblePaymentSource,
  amount: number,
): FlexibleEffect[] {
  const amt = Math.max(0, Number(amount) || 0);
  if (amt <= 0) return [];
  return source === "new_payment"
    ? [{ kind: "confirmed_income", amount: amt, linkedToSession: true }]
    : [{ kind: "prepaid_allocation", amount: amt, linkedToSession: true }];
}

/** Appointment payment_status after a flexible-price completion. */
export function flexibleNextPaymentStatus(source: FlexiblePaymentSource): string {
  return source === "prepaid_balance" ? "paid_from_prepayment" : "paid_now";
}

/** True when the informational "Flexible price applied" label should be shown. */
export function showsFlexibleLabel(standardPrice: number, actualAmount: number): boolean {
  return Math.abs(Number(standardPrice || 0) - Number(actualAmount || 0)) > EPS;
}
