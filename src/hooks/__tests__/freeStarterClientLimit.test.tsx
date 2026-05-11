import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration test: the 6th active client for an unpaid user must be blocked
 * with FREE_STARTER_CLIENT_LIMIT_REACHED — both via the client-side guard and
 * via the server-side trigger backstop.
 */

const mockState = vi.hoisted(() => ({
  clientCount: 5,
  insertError: null as { message: string } | null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "free-user-1" },
    subscription: {
      subscribed: false,
      on_trial: false,
      subscription_end: null,
      trial_end: null,
      price_id: null,
      cancel_at_period_end: false,
      loading: false,
    },
  }),
}));

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "clients") {
        return {
          select: vi.fn(() => {
            const final = () => Promise.resolve({ count: mockState.clientCount, data: [], error: null });
            const eq2 = { eq: vi.fn(final) };
            const eq1 = { eq: vi.fn(() => eq2) };
            return {
              eq: vi.fn(() => eq1),
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            };
          }),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve(
                  mockState.insertError
                    ? { data: null, error: mockState.insertError }
                    : { data: { id: "new" }, error: null },
                ),
              ),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })) })),
      };
    }),
  },
}));

import { useCreateClient, FREE_STARTER_LIMIT_ERROR } from "@/hooks/useData";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  mockState.clientCount = 5;
  mockState.insertError = null;
});

describe("Free Starter 5-client limit", () => {
  it("blocks the 6th client client-side with FREE_STARTER_CLIENT_LIMIT_REACHED", async () => {
    const { result } = renderHook(
      () => {
        const fs = useFreeStarterMode();
        const create = useCreateClient();
        return { fs, create };
      },
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.fs.atClientLimit).toBe(true));

    await expect(
      result.current.create.mutateAsync({ name: "Sixth Client" }),
    ).rejects.toThrow(FREE_STARTER_LIMIT_ERROR);
  });

  it("surfaces the server-side trigger error as FREE_STARTER_CLIENT_LIMIT_REACHED", async () => {
    // Simulate the client guard being bypassed (e.g. stale count) but the DB
    // trigger raising the limit error.
    mockState.clientCount = 0;
    mockState.insertError = {
      message: 'new row for relation "clients" violates: FREE_STARTER_CLIENT_LIMIT_REACHED',
    };

    const { result } = renderHook(() => useCreateClient(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current).toBeDefined());

    await expect(
      result.current.mutateAsync({ name: "Sixth Client" }),
    ).rejects.toThrow(FREE_STARTER_LIMIT_ERROR);
  });
});
