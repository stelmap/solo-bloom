import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";

const PLANS = [
  { id: "monthly", priceId: "price_1TL8IORxXuU3N5IFvjohq4sk", label: "Monthly", price: "€20/mo" },
  { id: "quarterly", priceId: "price_1TL8IORxXuU3N5IFlwMslTtE", label: "Quarterly", price: "€50/3mo" },
  { id: "yearly", priceId: "price_1TL8INRxXuU3N5IF8bJlwGyr", label: "Yearly", price: "€200/yr" },
];

export function SubscriptionSection() {
  const { subscription, refreshSubscription } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [withTrial, setWithTrial] = useState(true);

  const currentPlan = PLANS.find((p) => p.priceId === subscription.price_id);

  const handleCheckout = async (priceId: string) => {
    setLoadingPlan(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, withTrial },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to start checkout", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to open billing portal", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSubscription();
    setRefreshing(false);
    toast({ title: t("settings.saved"), description: "Subscription status refreshed" });
  };

  if (subscription.loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
        <h2 className="font-semibold text-foreground">{t("settings.subscription")}</h2>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">{t("settings.subscription")}</h2>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {subscription.subscribed ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">
                  {currentPlan?.label || "Solo .Bizz"} — {currentPlan?.price || "Active"}
                </p>
                {subscription.on_trial && (
                  <Badge variant="secondary" className="text-xs">Trial</Badge>
                )}
                {subscription.cancel_at_period_end && (
                  <Badge variant="destructive" className="text-xs">Canceling</Badge>
                )}
              </div>
              {subscription.on_trial && subscription.trial_end && (
                <p className="text-sm text-muted-foreground">
                  Trial ends: {format(new Date(subscription.trial_end), "MMM d, yyyy")}
                </p>
              )}
              {subscription.subscription_end && (
                <p className="text-sm text-muted-foreground">
                  {subscription.cancel_at_period_end ? "Access until" : "Renews"}: {format(new Date(subscription.subscription_end), "MMM d, yyyy")}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={handleManageBilling} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              {t("settings.manageBilling")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {withTrial
              ? "Start your 7-day free trial. Cancel anytime."
              : "Subscribe immediately — no trial, billed today."}
          </p>
          <div className="inline-flex rounded-lg border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setWithTrial(true)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                withTrial ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              7-day free trial
            </button>
            <button
              type="button"
              onClick={() => setWithTrial(false)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                !withTrial ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Subscribe now
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => handleCheckout(plan.priceId)}
                disabled={!!loadingPlan}
                className="relative p-4 rounded-xl border border-border bg-background hover:border-primary/50 hover:shadow-sm transition-all text-left"
              >
                <p className="font-medium text-foreground">{plan.label}</p>
                <p className="text-lg font-bold text-primary mt-1">{plan.price}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {withTrial ? "7-day free trial" : "Billed today"}
                </p>
                {loadingPlan === plan.priceId && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
