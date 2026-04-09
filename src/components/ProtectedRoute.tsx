import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useProfile } from "@/hooks/useData";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isRecovery } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Force password reset — user cannot access the app until new password is set
  if (isRecovery) {
    return <Navigate to="/reset-password" replace />;
  }

  // Redirect to onboarding if not completed
  if (profile && !(profile as any).onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
