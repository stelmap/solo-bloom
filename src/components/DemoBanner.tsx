import { Link } from "react-router-dom";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFreeStarterMode, FREE_STARTER_CLIENT_LIMIT } from "@/hooks/useDemoWorkspace";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Persistent banner shown at the top of authenticated pages.
 * - Trial users: shows trial status with days remaining.
 * - Free Starter users: shows current X/5 client usage and an upgrade CTA.
 */
export function DemoBanner() {
  const { subscription } = useAuth();
  const { isFreeStarter, clientCount, limit } = useFreeStarterMode();
  const { t } = useLanguage();

  const tx = (key: string, fallback: string) => {
    const value = t(key as any);
    return !value || value === key ? fallback : value;
  };

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
  if (!isFreeStarter) return null;

  const badge = tx("freeStarter.badge", "Free Starter");
  const headline = tx(
    "freeStarter.bannerHeadline",
    `Free plan: ${clientCount}/${limit} clients used`
  ).replace("{count}", String(clientCount)).replace("{limit}", String(limit));
  const sub = tx(
    "freeStarter.bannerSub",
    "Upgrade anytime to remove the client limit and unlock everything."
  );
  const cta = tx("freeStarter.choosePlan", "Choose a plan");

  return (
    <div className="sticky top-0 z-30 border-b border-primary/25 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 md:pl-0 pl-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-bold uppercase text-primary whitespace-nowrap">
            <Sparkles className="h-3.5 w-3.5" />
            {badge}
          </span>
          <p className="text-sm text-foreground min-w-0">
            <span className="font-semibold">{headline}</span>{" "}
            <span className="text-muted-foreground hidden md:inline">
              {sub}
            </span>
          </p>
        </div>
        <Button asChild size="sm" variant="default" className="shrink-0">
          <Link to="/plans">
            {cta}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
