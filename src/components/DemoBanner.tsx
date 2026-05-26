import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
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

  if (subscription.on_trial) return null;

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
    <div className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 shadow-card">
      <div className="max-w-[1600px] mx-auto px-4 md:px-10 xl:px-14 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 lg:pl-0 pl-12">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase text-primary whitespace-nowrap shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
            {badge}
          </span>
          <p className="text-sm text-foreground min-w-0 truncate">
            <span className="font-semibold">{headline}</span>{" "}
            <span className="text-muted-foreground hidden md:inline">
              {sub}
            </span>
          </p>
        </div>
        <Button asChild size="sm" variant="default" className="shrink-0 w-full sm:w-auto">
          <Link to="/plans">
            {cta}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
