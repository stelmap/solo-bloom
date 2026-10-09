import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useProfile } from "@/hooks/useData";
import { useAutoSeedDemo } from "@/hooks/useDemoWorkspace";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isRecovery } = useAuth();
  // Kick off profile fetch in the background, but do NOT block rendering on it —
  // pages already render skeletons while their own data resolves.
  const { data: profile } = useProfile();
  const location = useLocation();
  // Seed a demo workspace on first login for unpaid users with no real data
  useAutoSeedDemo();
  // GDPR: auto sign-out on inactivity (configurable in Settings → Security)
  useIdleTimeout();

  if (loading) {
    return <div className="min-h-screen bg-background" aria-hidden="true" />;
  }


  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Force password reset — user cannot access the app until new password is set
  if (isRecovery) {
    return <Navigate to="/reset-password" replace />;
  }

  // Initial setup: until the practice profile is saved once, every app page
  // opens the practice profile form (also on later logins).
  const SETUP_EXEMPT = ["/settings/practice", "/plans", "/checkout", "/purchase-success", "/reset-password"];
  if (
    profile &&
    (profile as any).profile_setup_completed === false &&
    !(profile as any).onboarding_state?.setupSkipped &&
    !SETUP_EXEMPT.some((p) => location.pathname.startsWith(p))
  ) {
    return <Navigate to="/settings/practice?setup=1" replace />;
  }

  return <>{children}</>;
}
