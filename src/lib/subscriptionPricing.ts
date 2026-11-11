export type BillingPeriod = "monthly" | "quarterly" | "yearly";
export const BILLING_PERIODS: BillingPeriod[] = ["monthly", "quarterly", "yearly"];
export const PERIOD_MONTHS: Record<BillingPeriod, number> = { monthly: 1, quarterly: 3, yearly: 12 };
export const PERIOD_DISCOUNT: Record<BillingPeriod, number> = { monthly: 0, quarterly: 10, yearly: 20 };

const cents = (n: number) => Math.round(n * 100) / 100;

/** Price breakdown for a plan's monthly base price and a billing period. */
export function periodPricing(monthly: number, period: BillingPeriod) {
  const months = PERIOD_MONTHS[period];
  const discount = PERIOD_DISCOUNT[period];
  const original = cents(monthly * months);
  const total = cents(original * (1 - discount / 100));
  return { total, original, savings: cents(original - total), discount, months, perMonth: cents(total / months) };
}

export function isBillingPeriod(v: unknown): v is BillingPeriod {
  return v === "monthly" || v === "quarterly" || v === "yearly";
}
