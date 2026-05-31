import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";

/**
 * Integration tests for the post-checkout success flow.
 *
 * These tests pin down the contract that the demo-workspace cleanup RPC has
 * been retired: even when the user has no demo data, the page must reach
 * the "ready" state without ever invoking `cleanup_demo_workspace`.
 */

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  rpc: vi.fn(),
  refreshSubscription: vi.fn().mockResolvedValue(undefined),
  user: { id: "user-123" } as { id: string } | null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.user,
    refreshSubscription: mocks.refreshSubscription,
    subscription: { loading: false, subscribed: true, on_trial: false },
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mocks.invoke(...args) },
    rpc: (...args: unknown[]) => mocks.rpc(...args),
  },
}));

import PurchaseSuccessPage from "@/pages/PurchaseSuccessPage";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PurchaseSuccessPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mocks.invoke.mockReset();
  mocks.rpc.mockReset();
  mocks.refreshSubscription.mockClear();
  mocks.user = { id: "user-123" };
});

describe("PurchaseSuccessPage", () => {
  it("activates the plan and never invokes cleanup_demo_workspace", async () => {
    mocks.invoke.mockResolvedValue({ data: { subscribed: true }, error: null });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/your workspace is ready/i)).toBeInTheDocument()
    );

    expect(mocks.invoke).toHaveBeenCalledWith("check-subscription", {
      body: { force: true },
    });
    expect(mocks.refreshSubscription).toHaveBeenCalledWith({ force: true });
    // The legacy demo-cleanup RPC must NEVER be called from this page.
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("reaches the ready state when no demo data is present (no FK error)", async () => {
    // Even if the RPC would have thrown a FK constraint violation, the page
    // must not call it. Simulate that by failing rpc loudly and asserting
    // we never reach it.
    mocks.invoke.mockResolvedValue({ data: { subscribed: true }, error: null });
    mocks.rpc.mockImplementation(() => {
      throw new Error(
        'update or delete on table "groups" violates foreign key constraint'
      );
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/your workspace is ready/i)).toBeInTheDocument()
    );

    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("treats a delayed Stripe confirmation as soft success, not a blocking error", async () => {
    // All polls return subscribed=false → soft-warn but still ready.
    mocks.invoke.mockResolvedValue({
      data: { subscribed: false, on_trial: false },
      error: null,
    });

    renderPage();

    await waitFor(
      () =>
        expect(screen.getByText(/your workspace is ready/i)).toBeInTheDocument(),
      { timeout: 30_000 }
    );

    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  }, 35_000);
});
