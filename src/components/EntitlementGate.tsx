import { Navigate, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { Button } from "@/components/ui/button";
import { useEntitlements, type FeatureCode } from "@/hooks/useEntitlements";

interface Props {
  feature: FeatureCode;
  children: React.ReactNode;
  /** If true, redirect to /plans instead of rendering an inline upsell. */
  redirect?: boolean;
}

/**
 * Gates a route by entitlement. If the user lacks the required feature,
 * shows an upgrade prompt (or redirects to /plans).
 */
export function EntitlementGate({ feature, children, redirect = false }: Props) {
  const { loading, has } = useEntitlements();
  const location = useLocation();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
          Loading…
        </div>
      </AppLayout>
    );
  }

  if (!has(feature)) {
    if (redirect) {
      return <Navigate to="/plans" replace state={{ from: location.pathname, feature }} />;
    }
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto py-16 text-center space-y-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">This feature isn't in your plan</h1>
            <p className="text-muted-foreground">
              Your current plan doesn't include access to this section. Upgrade to unlock it.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button asChild>
              <Link to="/plans">View plans</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return <>{children}</>;
}
