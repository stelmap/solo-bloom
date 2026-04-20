import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, RefreshCw, Loader2, Check, Sparkles, Shield, Zap } from "lucide-react";
import { format } from "date-fns";
import { fr as frLocale, uk as ukLocale } from "date-fns/locale";

type Plan = {
  id: string;
  priceId: string;
  labelKey: string;
  priceKey: string;
  perMonth: number;
  badgeKey: string | null;
  savePct: number | null;
};

const PLANS: Plan[] = [
  {
    id: "monthly",
    priceId: "price_1TL8IORxXuU3N5IFvjohq4sk",
    labelKey: "sub.monthly",
    priceKey: "sub.priceMonthly",
    perMonth: 20,
    badgeKey: null,
    savePct: null,
  },
  {
    id: "quarterly",
    priceId: "price_1TL8IORxXuU3N5IFlwMslTtE",
    labelKey: "sub.quarterly",
    priceKey: "sub.priceQuarterly",
    perMonth: 50 / 3,
    badgeKey: "sub.popular",
    savePct: 17,
  },
  {
    id: "yearly",
    priceId: "price_1TL8INRxXuU3N5IF8bJlwGyr",
    labelKey: "sub.yearly",
    priceKey: "sub.priceYearly",
    perMonth: 200 / 12,
    badgeKey: "sub.bestValue",
    savePct: 17,
  },
];

export function SubscriptionSection() {
  const { subscription, refreshSubscription } = useAuth();
  const { t: tStrict, lang } = useLanguage();
  const t = tStrict as (key: string, params?: Record<string, string>) => string;
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [withTrial, setWithTrial] = useState(true);

  const dateLocale = lang === "fr" ? frLocale : lang === "uk" ? ukLocale : undefined;
  const fmtDate = (d: string) => format(new Date(d), "d MMM yyyy", { locale: dateLocale });

  const currentPlan = PLANS.find((p) => p.priceId === subscription.price_id);

  const handleCheckout = async (priceId: string) => {
    setLoadingPlan(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, withTrial },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message || t("sub.error"), variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSubscription();
    setRefreshing(false);
    toast({ title: t("settings.saved"), description: t("sub.refreshed") });
  };

  if (subscription.loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 animate-fade-in">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // ACTIVE SUBSCRIPTION VIEW
  if (subscription.subscribed) {
    return (
      <div className="relative overflow-hidden bg-card rounded-2xl border border-border animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground">{t("settings.subscription")}</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground text-lg">
                  Solo<span className="text-primary">.Bizz</span>
                  {currentPlan && <span className="text-muted-foreground font-normal"> · {t(currentPlan.labelKey)}</span>}
                </p>
                {subscription.on_trial ? (
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-0">{t("sub.trialBadge")}</Badge>
                ) : (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border-0">{t("sub.activeBadge")}</Badge>
                )}
                {subscription.cancel_at_period_end && (
                  <Badge variant="destructive" className="border-0">{t("sub.cancelingBadge")}</Badge>
                )}
              </div>
              {subscription.on_trial && subscription.trial_end && (
                <p className="text-sm text-muted-foreground">{t("sub.trialEnds", { date: fmtDate(subscription.trial_end) })}</p>
              )}
              {subscription.subscription_end && !subscription.on_trial && (
                <p className="text-sm text-muted-foreground">
                  {subscription.cancel_at_period_end
                    ? t("sub.accessUntil", { date: fmtDate(subscription.subscription_end) })
                    : t("sub.renewsOn", { date: fmtDate(subscription.subscription_end) })}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={handleManageBilling} disabled={portalLoading} className="shrink-0">
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              {t("settings.manageBilling")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // PRICING VIEW
  return (
    <div className="relative overflow-hidden bg-card rounded-2xl border border-border animate-fade-in">
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="relative p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {t("sub.headline")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("sub.subheadline")}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Trial / Pay-now toggle */}
        <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setWithTrial(true)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              withTrial
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("sub.trialMode")}
          </button>
          <button
            type="button"
            onClick={() => setWithTrial(false)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              !withTrial
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("sub.payNow")}
          </button>
        </div>

        <p className="text-sm text-muted-foreground -mt-2">
          {withTrial ? t("sub.trialDescription") : t("sub.payNowDescription")}
        </p>

        {/* Plan cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isHighlighted = plan.id === "quarterly";
            const isLoading = loadingPlan === plan.priceId;
            return (
              <button
                key={plan.id}
                onClick={() => handleCheckout(plan.priceId)}
                disabled={!!loadingPlan}
                className={`group relative p-5 rounded-2xl border text-left transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
                  isHighlighted
                    ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-0.5"
                    : "border-border bg-background hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                {plan.badgeKey && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                      isHighlighted
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground text-background"
                    }`}>
                      {plan.id === "yearly" && <Sparkles className="h-3 w-3" />}
                      {t(plan.badgeKey)}
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {t(plan.labelKey)}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{t(plan.priceKey)}</p>
                    {plan.id !== "monthly" && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("sub.perMonthEquiv", {
                          amount: `€${plan.perMonth.toFixed(plan.perMonth % 1 === 0 ? 0 : 2)}`,
                        })}
                      </p>
                    )}
                  </div>

                  {plan.savePct && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                      {t("sub.save", { pct: String(plan.savePct) })}
                    </div>
                  )}

                  <div className={`pt-3 border-t ${isHighlighted ? "border-primary/20" : "border-border"}`}>
                    <div className={`flex items-center justify-center gap-1.5 text-sm font-medium ${
                      isHighlighted ? "text-primary" : "text-foreground group-hover:text-primary"
                    } transition-colors`}>
                      {withTrial ? t("sub.startTrial") : t("sub.subscribe")}
                    </div>
                  </div>
                </div>

                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Feature row */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-primary" />
            {t("sub.feature1")}
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            {t("sub.feature2")}
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            {t("sub.feature3")}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/80">{t("sub.couponHint")}</p>
      </div>
    </div>
  );
}
