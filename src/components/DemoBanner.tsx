import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHasDemoData } from "@/hooks/useDemoWorkspace";
import { Button } from "@/components/ui/button";

/**
 * Persistent banner shown at the top of authenticated pages whenever the
 * current user is on a free/unpaid plan AND has demo data loaded.
 */
export function DemoBanner() {
  const { subscription } = useAuth();
  const { data: hasDemo } = useHasDemoData();

  if (subscription.loading) return null;
  if (subscription.subscribed || subscription.on_trial) return null;
  if (!hasDemo) return null;

  return (
    <div className="border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-foreground truncate">
            <span className="font-medium">You're viewing demo data.</span>{" "}
            <span className="text-muted-foreground hidden sm:inline">
              Purchase a plan to start with your own clean workspace.
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
