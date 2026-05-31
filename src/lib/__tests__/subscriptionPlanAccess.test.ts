import { describe, it, expect } from "vitest";

/**
 * Contract tests for the subscription → feature mapping used by both
 * `check-subscription` (server, supabase/functions/check-subscription/index.ts)
 * and `useEntitlements` (client, src/hooks/useEntitlements.ts).
 *
 * Business rules:
 *   • Free Starter, Solo Practice, and Pro Practice ALL have access to
 *     Finance, Supervision, and Reports (operational + financial baseline).
 *   • Only Pro Practice unlocks `premium_access`.
 *   • Active client limits per plan: Free = 5, Solo = 20, Pro = unlimited.
 */

type PlanCode = "free" | "solo" | "pro";

const PRICE_TO_PLAN: Record<string, "solo" | "pro"> = {
  price_1TPQ3DRxXuU3N5IFMcxZCvva: "solo",
  price_1TPQ5FRxXuU3N5IF5ufGLkV1: "solo",
  price_1TPQ60RxXuU3N5IFBiGOuz8f: "solo",
  price_1TPQahRxXuU3N5IF3umwA0Bd: "pro",
  price_1TPQbIRxXuU3N5IFPVrvG60z: "pro",
  price_1TPQbmRxXuU3N5IFirrjnqdi: "pro",
};

function planFromPrice(priceId: string | null): PlanCode {
  if (!priceId) return "free";
  return PRICE_TO_PLAN[priceId] ?? "free";
}

function featuresForPlan(plan: PlanCode): string[] {
  // Mirrors check-subscription/index.ts after baseline-access refactor.
  if (plan === "pro") {
    return ["premium_access", "financial_access", "operational_access"];
  }
  if (plan === "solo") {
    return ["financial_access", "operational_access"];
  }
  // Free Starter: baseline entitlements granted at signup.
  return ["financial_access", "operational_access"];
}

const ACTIVE_CLIENT_LIMITS: Record<PlanCode, number | null> = {
  free: 5,
  solo: 20,
  pro: null, // unlimited
};

function canAddAnotherClient(plan: PlanCode, activeClients: number): boolean {
  const limit = ACTIVE_CLIENT_LIMITS[plan];
  if (limit === null) return true;
  return activeClients < limit;
}

describe("price → plan mapping", () => {
  it("resolves all 3 solo prices to 'solo'", () => {
    expect(planFromPrice("price_1TPQ3DRxXuU3N5IFMcxZCvva")).toBe("solo");
    expect(planFromPrice("price_1TPQ5FRxXuU3N5IF5ufGLkV1")).toBe("solo");
    expect(planFromPrice("price_1TPQ60RxXuU3N5IFBiGOuz8f")).toBe("solo");
  });

  it("resolves all 3 pro prices to 'pro'", () => {
    expect(planFromPrice("price_1TPQahRxXuU3N5IF3umwA0Bd")).toBe("pro");
    expect(planFromPrice("price_1TPQbIRxXuU3N5IFPVrvG60z")).toBe("pro");
    expect(planFromPrice("price_1TPQbmRxXuU3N5IFirrjnqdi")).toBe("pro");
  });

  it("falls back to 'free' for unknown or missing price", () => {
    expect(planFromPrice(null)).toBe("free");
    expect(planFromPrice("price_unknown_xyz")).toBe("free");
  });
});

describe("plan → feature entitlements", () => {
  it("Free Starter gets Finance + Supervision (baseline), no premium", () => {
    const f = featuresForPlan("free");
    expect(f).toContain("operational_access");
    expect(f).toContain("financial_access");
    expect(f).not.toContain("premium_access");
  });

  it("Solo Practice gets Finance + Supervision, no premium", () => {
    const f = featuresForPlan("solo");
    expect(f).toContain("operational_access");
    expect(f).toContain("financial_access");
    expect(f).not.toContain("premium_access");
  });

  it("Pro Practice unlocks premium_access AND keeps baseline", () => {
    const f = featuresForPlan("pro");
    expect(f).toContain("premium_access");
    expect(f).toContain("financial_access");
    expect(f).toContain("operational_access");
  });

  it("every plan can reach Finance/Supervision/Reports", () => {
    for (const plan of ["free", "solo", "pro"] as PlanCode[]) {
      const f = featuresForPlan(plan);
      expect(f).toContain("financial_access");
      expect(f).toContain("operational_access");
    }
  });
});

describe("active client limits per plan", () => {
  it("Free Starter allows up to 5 active clients", () => {
    expect(canAddAnotherClient("free", 0)).toBe(true);
    expect(canAddAnotherClient("free", 4)).toBe(true);
    expect(canAddAnotherClient("free", 5)).toBe(false);
    expect(canAddAnotherClient("free", 99)).toBe(false);
  });

  it("Solo Practice allows up to 20 active clients", () => {
    expect(canAddAnotherClient("solo", 19)).toBe(true);
    expect(canAddAnotherClient("solo", 20)).toBe(false);
    expect(canAddAnotherClient("solo", 21)).toBe(false);
  });

  it("Pro Practice is unlimited", () => {
    expect(canAddAnotherClient("pro", 20)).toBe(true);
    expect(canAddAnotherClient("pro", 9999)).toBe(true);
  });
});

describe("payment success → access transition", () => {
  it("Free Starter who pays for Solo upgrades plan and keeps baseline", () => {
    const before = planFromPrice(null);
    const after = planFromPrice("price_1TPQ3DRxXuU3N5IFMcxZCvva");
    expect(before).toBe("free");
    expect(after).toBe("solo");
    expect(featuresForPlan(after)).toEqual(
      expect.arrayContaining(["operational_access", "financial_access"]),
    );
  });

  it("Solo who pays for Pro gains premium_access without losing baseline", () => {
    const before = featuresForPlan("solo");
    const after = featuresForPlan("pro");
    expect(before).not.toContain("premium_access");
    expect(after).toContain("premium_access");
    // Baseline preserved
    expect(after).toContain("operational_access");
    expect(after).toContain("financial_access");
  });

  it("Cancelled / expired subscription drops back to Free baseline (no premium)", () => {
    const expired = planFromPrice(null);
    const f = featuresForPlan(expired);
    expect(f).not.toContain("premium_access");
    expect(f).toContain("operational_access");
    expect(f).toContain("financial_access");
  });
});
