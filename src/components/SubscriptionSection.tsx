import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreditCard, RefreshCw, Loader2, Sparkles, LayoutGrid, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr as frLocale, uk as ukLocale } from "date-fns/locale";
import { track } from "@/lib/analytics";

type BillingPeriod = "monthly" | "quarterly" | "yearly";

// Mapping of known Stripe price IDs (legacy single-tier prices) to billing period.
// New multi-plan prices are looked up dynamically from `plan_prices` below.
const LEGACY_PRICE_MAP: Record<string, BillingPeriod> = {
  price_1TL8IORxXuU3N5IFvjohq4sk: "monthly",
  price_1TL8IORxXuU3N5IFlwMslTtE: "quarterly",
  price_1TL8INRxXuU3N5IF8bJlwGyr: "yearly",
};

type ResolvedPlan = {
  planName: string | null;
  billingPeriod: BillingPeriod | null;
};

export function SubscriptionSection() {
  const { subscription, refreshSubscription } = useAuth();
  const { t: tStrict, lang } = useLanguage();
  const t = tStrict as (key: string, params?: Record<string, string>) => string;
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [resolved, setResolved] = useState<ResolvedPlan>({ planName: null, billingPeriod: null });

  const dateLocale = lang === "fr" ? frLocale : lang === "uk" ? ukLocale : undefined;
  const fmtDate = (d: string) => format(new Date(d), "d MMM yyyy", { locale: dateLocale });

  // Resolve plan name + billing period from current price_id.
  // Prefer DB lookup (new plans). Fallback to legacy hardcoded map.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const priceId = subscription.price_id;
      if (!priceId) {
        setResolved({ planName: null, billingPeriod: null });
        return;
      }

      // Try plan_prices DB lookup
      const { data } = await supabase
        .from("plan_prices")
        .select("billing_period, plans(name)")
        .eq("stripe_price_id", priceId)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setResolved({
          planName: (data as any).plans?.name ?? null,
          billingPeriod: (data.billing_period as BillingPeriod) ?? null,
        });
        return;
      }

      // Legacy fallback
      const legacyPeriod = LEGACY_PRICE_MAP[priceId] ?? null;
      setResolved({ planName: null, billingPeriod: legacyPeriod });
    })();
    return () => {
      cancelled = true;
    };
  }, [subscription.price_id]);

  // Analytics: detect subscription state transitions
  const lastStateRef = useRef<{ subscribed: boolean; cancel: boolean } | null>(null);
  useEffect(() => {
    if (subscription.loading) return;
    const prev = lastStateRef.current;
    const curr = { subscribed: subscription.subscribed, cancel: subscription.cancel_at_period_end };
    if (prev) {
      if (!prev.subscribed && curr.subscribed) {
        track("checkout_completed", { plan_type: resolved.billingPeriod ?? undefined, is_trial: subscription.on_trial });
        track("subscription_active", { plan_type: resolved.billingPeriod ?? undefined, is_trial: subscription.on_trial });
      }
      if (!prev.cancel && curr.cancel) {
        track("subscription_canceled", { plan_type: resolved.billingPeriod ?? undefined });
      }
    }
    lastStateRef.current = curr;
  }, [subscription.loading, subscription.subscribed, subscription.cancel_at_period_end, subscription.on_trial, resolved.billingPeriod]);

  const openStripePortal = async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      await openStripePortal();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    setCancelOpen(false);
    setPortalLoading(true);
    try {
      await openStripePortal();
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

  // ============ ACTIVE SUBSCRIPTION VIEW ============
  if (subscription.subscribed) {
    const billingLabel = resolved.billingPeriod ? t(`sub.${resolved.billingPeriod}`) : "—";
    const planLabel = resolved.planName ?? "SoloBizz";

    const statusBadge = subscription.cancel_at_period_end ? (
      <Badge variant="destructive" className="border-0">{t("sub.cancelingBadge")}</Badge>
    ) : subscription.on_trial ? (
      <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-0">{t("sub.trialBadge")}</Badge>
    ) : (
      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border-0">
        {t("sub.activeBadge")}
      </Badge>
    );

    // Determine which date row to show
    let dateLabel: string | null = null;
    let dateValue: string | null = null;
    if (subscription.on_trial && subscription.trial_end) {
      dateLabel = t("sub.detailsTrialEnds");
      dateValue = fmtDate(subscription.trial_end);
    } else if (subscription.subscription_end) {
      dateLabel = subscription.cancel_at_period_end ? t("sub.detailsEnds") : t("sub.detailsRenewal");
      dateValue = fmtDate(subscription.subscription_end);
    }

    return (
      <>
        <div className="relative overflow-hidden bg-card rounded-2xl border border-border animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
          <div className="relative p-6 space-y-5">
            {/* Header */}
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

            {/* Details grid */}
            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-5 space-y-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex items-center justify-between sm:block">
                  <dt className="text-muted-foreground">{t("sub.detailsPlan")}</dt>
                  <dd className="font-semibold text-foreground sm:mt-0.5">
                    Solo<span className="text-primary">.Bizz</span>
                    {resolved.planName && <span className="text-muted-foreground font-normal"> · {planLabel}</span>}
                  </dd>
                </div>
                <div className="flex items-center justify-between sm:block">
                  <dt className="text-muted-foreground">{t("sub.detailsBilling")}</dt>
                  <dd className="font-semibold text-foreground sm:mt-0.5">{billingLabel}</dd>
                </div>
                <div className="flex items-center justify-between sm:block">
                  <dt className="text-muted-foreground">{t("sub.detailsStatus")}</dt>
                  <dd className="sm:mt-0.5">{statusBadge}</dd>
                </div>
                {dateLabel && dateValue && (
                  <div className="flex items-center justify-between sm:block">
                    <dt className="text-muted-foreground">{dateLabel}</dt>
                    <dd className="font-semibold text-foreground sm:mt-0.5">{dateValue}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="sm:order-1"
              >
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                {t("settings.manageBilling")}
              </Button>
              {!subscription.cancel_at_period_end && (
                <Button
                  variant="ghost"
                  onClick={() => setCancelOpen(true)}
                  disabled={portalLoading}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t("sub.cancelSubscription")}
                </Button>
              )}
            </div>
          </div>
        </div>

        <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("sub.cancelSubscription")}</AlertDialogTitle>
              <AlertDialogDescription>{t("sub.cancelConfirm")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmCancel}>
                {t("sub.cancelSubscription")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // ============ NO SUBSCRIPTION VIEW ============
  return (
    <div className="relative overflow-hidden bg-card rounded-2xl border border-border animate-fade-in">
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="relative p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
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

        <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="mt-0.5">{t("sub.noActiveTitle")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t("sub.noActiveDesc")}</p>
          <Button asChild>
            <Link to="/plans">
              <LayoutGrid className="h-4 w-4 mr-2" />
              {t("sub.viewPlans")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
