import { useAuth } from "@/contexts/AuthContext";
import { getPostAuthRedirect } from "@/lib/authRedirect";
import { Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

// Lazy-load the landing page so authenticated users hitting /dashboard
// (or any other route) don't pay the cost of the marketing bundle.
const LandingPage = lazy(() => import("./LandingPage"));

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={getPostAuthRedirect()} replace />;
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <LandingPage />
    </Suspense>
  );
}
