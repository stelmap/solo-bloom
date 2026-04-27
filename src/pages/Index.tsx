import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import LandingPage from "./LandingPage";

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
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}
