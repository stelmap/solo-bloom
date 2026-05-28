import { useAuth } from "@/contexts/AuthContext";
import { getPostAuthRedirect } from "@/lib/authRedirect";
import { Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

// Lazy-load the landing page so authenticated users hitting /dashboard
// (or any other route) don't pay the cost of the marketing bundle.
const LandingPage = lazy(() => import("./LandingPage"));

export default function Index() {
  const { user, loading } = useAuth();

  // If the URL contains an OAuth callback fragment (access_token / code /
  // error from the provider), wait for Supabase to consume it and for the
  // auth context to hydrate before deciding to render the landing page.
  // Otherwise we briefly flash the landing page and the user perceives
  // "login did nothing".
  const hasAuthCallback =
    typeof window !== "undefined" &&
    (window.location.hash.includes("access_token") ||
      window.location.hash.includes("error") ||
      window.location.search.includes("code="));

  if (loading || (hasAuthCallback && !user)) {
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
