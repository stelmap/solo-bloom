import { describe, it, expect } from "vitest";
import { periodPricing } from "../subscriptionPricing";

describe("subscription billing periods", () => {
  it("monthly stays €12 and €24", () => {
    expect(periodPricing(12, "monthly").total).toBe(12);
    expect(periodPricing(24, "monthly").total).toBe(24);
  });
  it("quarterly applies 10%", () => {
    expect(periodPricing(12, "quarterly")).toMatchObject({ total: 32.4, original: 36, savings: 3.6, perMonth: 10.8 });
    expect(periodPricing(24, "quarterly").total).toBe(64.8);
  });
  it("yearly applies 20%", () => {
    expect(periodPricing(12, "yearly")).toMatchObject({ total: 115.2, original: 144, savings: 28.8, perMonth: 9.6 });
    expect(periodPricing(24, "yearly").total).toBe(230.4);
  });
});
