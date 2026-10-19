import { describe, expect, it } from "vitest";
import { normalizePromoCode } from "../../supabase/functions/create-checkout/promoCode";

describe("promo validation shared by price preview and checkout", () => {
  it("keeps underscore codes for the Paddle discount lookup", () => {
    expect(normalizePromoCode("SPRING_20")).toBe("SPRING_20");
    expect(normalizePromoCode("SUPPORT_UA_PSYCHOTHERAPY_50")).toBe("SUPPORT_UA_PSYCHOTHERAPY_50");
  });
  it("normalizes spaces and casing without removing underscores", () => {
    expect(normalizePromoCode(" spring_20 ")).toBe("SPRING_20");
  });
  it("preserves existing letters, digits and hyphen codes", () => {
    expect(normalizePromoCode("SAVE-20")).toBe("SAVE-20");
    expect(normalizePromoCode("SUPPORTUA50")).toBe("SUPPORTUA50");
  });
  it("rejects unsupported characters and invalid lengths", () => {
    expect(normalizePromoCode("SPRING!20")).toBeNull();
    expect(normalizePromoCode("AB")).toBeNull();
    expect(normalizePromoCode("A".repeat(41))).toBeNull();
    expect(normalizePromoCode({ code: "SPRING_20" })).toBeNull();
  });
});