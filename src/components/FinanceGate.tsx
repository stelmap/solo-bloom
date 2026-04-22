import { Navigate, useLocation } from "react-router-dom";
import { useFinanceSetupStatus } from "@/hooks/useFinanceSetup";
import { AppLayout } from "./AppLayout";

/**
 * Wraps Finance routes. If the user hasn't completed finance setup
 * (no expenses, income, or breakeven goal yet), redirect them to the
 * Finance Onboarding Wizard. The wizard route itself is never gated.
 */
export function FinanceGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useFinanceSetupStatus();
  const location = useLocation();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
          Loading…
        </div>
      </AppLayout>
    );
  }

  if (!data?.completed) {
    return (
      <Navigate
        to="/finances/onboarding"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}
