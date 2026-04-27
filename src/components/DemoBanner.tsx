import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMode } from "@/hooks/useDemoWorkspace";
import { Button } from "@/components/ui/button";

/**
 * Persistent banner shown at the top of authenticated pages.
 * - Trial users: shows trial status with days remaining.
 * - Free/unpaid users with demo data: shows demo data notice.
 */
export function DemoBanner() {
  const { subscription } = useAuth();
  const { isDemoMode } = useDemoMode();

  if (subscription.loading) return null;

  // Trial banner takes precedence
  if (subscription.on_trial) {
    const daysLeft = subscription.trial_end
      ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / 86_400_000))
      : null;

    return (
      <div className="border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-foreground truncate">
              <span className="font-medium">You're on a trial.</span>{" "}
              <span className="text-muted-foreground hidden sm:inline">
                {daysLeft !== null
                  ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining — upgrade to keep full access.`
                  : "Upgrade to keep full access."}
              </span>
            </p>
          </div>
          <Button asChild size="sm" variant="default" className="shrink-0">
            <Link to="/plans">
              Upgrade now
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (subscription.subscribed) return null;
  if (!isDemoMode) return null;

  return (
    <div className="border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-foreground truncate">
            <span className="font-medium">Demo Mode — view-only workspace.</span>{" "}
            <span className="text-muted-foreground hidden sm:inline">
              Choose a subscription to unlock editing and create your own data.
            </span>
          </p>
        </div>
        <Button asChild size="sm" variant="default" className="shrink-0">
          <Link to="/plans">
            Choose a plan
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
