import { describe, it, expect } from "vitest";

/**
 * Regression tests for plan pricing helpers used in PlansPage.
 * These mirror the helpers defined inline in src/pages/PlansPage.tsx.
 * If those helpers are refactored to a shared module, update the imports here.
 */

type BillingPeriod = "monthly" | "quarterly" | "yearly";
type PlanPrice = {
  id: string;
  plan_id: string;
  billing_period: BillingPeriod;
  price: number;
  currency: string;
  stripe_price_id: string | null;
};

function formatPrice(amount: number, currency: string) {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency + " ";
  if (amount === 0) return `${symbol}—`;
  return `${symbol}${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

function savingsVsMonthly(prices: PlanPrice[], planId: string, period: BillingPeriod): number | null {
  if (period === "monthly") return null;
  const monthly = prices.find((p) => p.plan_id === planId && p.billing_period === "monthly");
  const target = prices.find((p) => p.plan_id === planId && p.billing_period === period);
  if (!monthly || !target) return null;
  const months = period === "quarterly" ? 3 : 12;
  const baseline = Number(monthly.price) * months;
  if (baseline <= 0) return null;
  const pct = Math.round(((baseline - Number(target.price)) / baseline) * 100);
  return pct > 0 ? pct : null;
}

const SOLO = "solo-id";
const PRO = "pro-id";

const PRICES: PlanPrice[] = [
  { id: "1", plan_id: SOLO, billing_period: "monthly", price: 19, currency: "EUR", stripe_price_id: "price_solo_m" },
  { id: "2", plan_id: SOLO, billing_period: "quarterly", price: 45, currency: "EUR", stripe_price_id: "price_solo_q" },
  { id: "3", plan_id: SOLO, billing_period: "yearly", price: 132, currency: "EUR", stripe_price_id: "price_solo_y" },
  { id: "4", plan_id: PRO, billing_period: "monthly", price: 49, currency: "EUR", stripe_price_id: "price_pro_m" },
  { id: "5", plan_id: PRO, billing_period: "quarterly", price: 117, currency: "EUR", stripe_price_id: "price_pro_q" },
  { id: "6", plan_id: PRO, billing_period: "yearly", price: 348, currency: "EUR", stripe_price_id: "price_pro_y" },
];

describe("formatPrice", () => {
  it("renders EUR with € symbol and no decimals when integer", () => {
    expect(formatPrice(19, "EUR")).toBe("€19");
    expect(formatPrice(348, "EUR")).toBe("€348");
  });

  it("renders USD with $ symbol", () => {
    expect(formatPrice(20, "USD")).toBe("$20");
  });

  it("keeps two decimals for fractional prices", () => {
    expect(formatPrice(19.5, "EUR")).toBe("€19.50");
  });

  it("falls back to em-dash for zero amounts", () => {
    expect(formatPrice(0, "EUR")).toBe("€—");
  });
});

describe("savingsVsMonthly", () => {
  it("returns null for monthly period", () => {
    expect(savingsVsMonthly(PRICES, SOLO, "monthly")).toBeNull();
  });

  it("computes Solo quarterly savings vs monthly (19*3=57 → 45 ≈ 21%)", () => {
    expect(savingsVsMonthly(PRICES, SOLO, "quarterly")).toBe(21);
  });

  it("computes Solo yearly savings vs monthly (19*12=228 → 132 ≈ 42%)", () => {
    expect(savingsVsMonthly(PRICES, SOLO, "yearly")).toBe(42);
  });

  it("computes Pro yearly savings vs monthly (49*12=588 → 348 ≈ 41%)", () => {
    expect(savingsVsMonthly(PRICES, PRO, "yearly")).toBe(41);
  });

  it("returns null when monthly price is missing", () => {
    const subset = PRICES.filter((p) => !(p.plan_id === SOLO && p.billing_period === "monthly"));
    expect(savingsVsMonthly(subset, SOLO, "yearly")).toBeNull();
  });

  it("returns null when target period price is missing", () => {
    const subset = PRICES.filter((p) => !(p.plan_id === PRO && p.billing_period === "yearly"));
    expect(savingsVsMonthly(subset, PRO, "yearly")).toBeNull();
  });

  it("returns null when there is no positive saving", () => {
    const odd: PlanPrice[] = [
      { ...PRICES[0], price: 10 },
      { ...PRICES[2], price: 130 }, // 10*12=120 baseline, 130 > 120
    ];
    expect(savingsVsMonthly(odd, SOLO, "yearly")).toBeNull();
  });
});
