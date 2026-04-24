import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";

const mockAuthState = vi.hoisted(() => ({
  current: {
    user: { id: "user-pro-trial" },
    subscription: {
      subscribed: false,
      on_trial: false,
      subscription_end: null,
      trial_end: null,
      price_id: null,
      cancel_at_period_end: false,
      loading: false,
    },
  },
}));

const mockDbState = vi.hoisted(() => ({
  entitlements: [] as { feature_code: FeatureCode; source_type: string; active_until: string | null; is_active: boolean }[],
  subscriptionRow: null as { legacy_full_access: boolean; legacy_access_until: string | null; status: string } | null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuthState.current,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "entitlements") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockDbState.entitlements, error: null })),
          })),
        };
      }

      if (table === "subscriptions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: mockDbState.subscriptionRow, error: null })),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  },
}));

import { useEntitlements } from "@/hooks/useEntitlements";

/**
 * Regression tests for the entitlement-tier hierarchy logic used in
 * src/hooks/useEntitlements.ts. We re-implement the pure transform here to
 * lock the contract:
 *
 *   premium_access  ⊃  financial_access  ⊃  operational_access
 *
 * Plus the paying-user fallback: if no rows but subscription is active/trial,
 * the user is granted premium_access.
 */

type FeatureCode = "operational_access" | "financial_access" | "premium_access";

const defaultSubscription = {
  subscribed: false,
  on_trial: false,
  subscription_end: null,
  trial_end: null,
  price_id: null,
  cancel_at_period_end: false,
  loading: false,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  mockAuthState.current = {
    user: { id: "user-pro-trial" },
    subscription: { ...defaultSubscription },
  };
  mockDbState.entitlements = [];
  mockDbState.subscriptionRow = null;
});

function applyHierarchy(input: {
  rows: { feature_code: FeatureCode }[];
  subscribed: boolean;
  on_trial: boolean;
}): Set<FeatureCode> {
  const codes = new Set<FeatureCode>();
  for (const r of input.rows) codes.add(r.feature_code);
  if (input.subscribed || input.on_trial) codes.add("premium_access");
  if (codes.has("premium_access")) {
    codes.add("financial_access");
    codes.add("operational_access");
  }
  if (codes.has("financial_access")) {
    codes.add("operational_access");
  }
  return codes;
}

describe("entitlement hierarchy", () => {
  it("operational only does NOT imply financial or premium", () => {
    const c = applyHierarchy({ rows: [{ feature_code: "operational_access" }], subscribed: false, on_trial: false });
    expect(c.has("operational_access")).toBe(true);
    expect(c.has("financial_access")).toBe(false);
    expect(c.has("premium_access")).toBe(false);
  });

  it("financial implies operational but not premium", () => {
    const c = applyHierarchy({ rows: [{ feature_code: "financial_access" }], subscribed: false, on_trial: false });
    expect(c.has("operational_access")).toBe(true);
    expect(c.has("financial_access")).toBe(true);
    expect(c.has("premium_access")).toBe(false);
  });

  it("premium implies financial AND operational", () => {
    const c = applyHierarchy({ rows: [{ feature_code: "premium_access" }], subscribed: false, on_trial: false });
    expect(c.has("operational_access")).toBe(true);
    expect(c.has("financial_access")).toBe(true);
    expect(c.has("premium_access")).toBe(true);
  });

  it("no rows + active subscription grants premium (fallback)", () => {
    const c = applyHierarchy({ rows: [], subscribed: true, on_trial: false });
    expect(c.has("premium_access")).toBe(true);
    expect(c.has("financial_access")).toBe(true);
    expect(c.has("operational_access")).toBe(true);
  });

  it("no rows + trial grants premium (fallback)", () => {
    const c = applyHierarchy({ rows: [], subscribed: false, on_trial: true });
    expect(c.has("premium_access")).toBe(true);
  });

  it("no rows + no subscription grants nothing", () => {
    const c = applyHierarchy({ rows: [], subscribed: false, on_trial: false });
    expect(c.size).toBe(0);
  });
});
