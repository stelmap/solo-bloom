import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useProfile } from "@/hooks/useData";
import { useAutoSeedDemo } from "@/hooks/useDemoWorkspace";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isRecovery } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  // Seed a demo workspace on first login for unpaid users with no real data
  useAutoSeedDemo();

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

  return <>{children}</>;
}
