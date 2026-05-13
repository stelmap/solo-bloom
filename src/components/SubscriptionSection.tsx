import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import {
  CreditCard,
  RefreshCw,
  Loader2,
  Sparkles,
  LayoutGrid,
  XCircle,
  CheckCircle2,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { fr as frLocale, uk as ukLocale } from "date-fns/locale";
import { track } from "@/lib/analytics";

type BillingPeriod = "monthly" | "quarterly" | "yearly";

// Mapping of known Stripe price IDs (legacy single-tier prices) to billing period.
const LEGACY_PRICE_MAP: Record<string, BillingPeriod> = {
  price_1TL8IORxXuU3N5IFvjohq4sk: "monthly",
  price_1TL8IORxXuU3N5IFlwMslTtE: "quarterly",
  price_1TL8INRxXuU3N5IF8bJlwGyr: "yearly",
};

// Active client limit by plan code. `null` means unlimited.
const CLIENT_LIMIT_BY_CODE: Record<string, number | null> = {
  solo: 20,
  pro: null,
  premium: null,
  gold: null,
  medium: 20,
};

type ResolvedPlan = {
  planName: string | null;
  planCode: string | null;
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
  const [resolved, setResolved] = useState<ResolvedPlan>({ planName: null, planCode: null, billingPeriod: null });

  const dateLocale = lang === "fr" ? frLocale : lang === "uk" ? ukLocale : undefined;
  const fmtDate = (d: string) => format(new Date(d), "d MMM yyyy", { locale: dateLocale });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const priceId = subscription.price_id;
      if (!priceId) {
        setResolved({ planName: null, planCode: null, billingPeriod: null });
        return;
      }

      const { data } = await supabase
        .from("plan_prices")
        .select("billing_period, plans(name, code)")
        .eq("stripe_price_id", priceId)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setResolved({
          planName: (data as any).plans?.name ?? null,
          planCode: (data as any).plans?.code ?? null,
          billingPeriod: (data.billing_period as BillingPeriod) ?? null,
        });
        return;
      }

      const legacyPeriod = LEGACY_PRICE_MAP[priceId] ?? null;
      setResolved({ planName: null, planCode: null, billingPeriod: legacyPeriod });
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

  // Reusable header (title + subtitle + refresh icon button with tooltip)
  const SectionHeader = () => (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground leading-tight">
            {t("settings.subscription")}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t("sub.headerSubtitle")}</p>
        </div>
      </div>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label={t("sub.refreshTooltip")}
              className="h-9 w-9 rounded-full border-border/70 bg-background/80 hover:bg-primary/5 hover:border-primary/40"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("sub.refreshTooltip")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

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
    const planLabel = resolved.planName ?? "SoloBizz";
    const billingLabel = resolved.billingPeriod
      ? t(`sub.${resolved.billingPeriod}`)
      : t("sub.awaitingPaymentData");
    const billingMissing = !resolved.billingPeriod;

    const clientLimit =
      resolved.planCode && resolved.planCode in CLIENT_LIMIT_BY_CODE
        ? CLIENT_LIMIT_BY_CODE[resolved.planCode]
        : undefined;
    const clientLimitLabel =
      clientLimit === undefined
        ? t("sub.notSpecified")
        : clientLimit === null
          ? t("sub.clientsUnlimited")
          : t("sub.clientsUpTo", { count: String(clientLimit) });

    const statusBadge = subscription.cancel_at_period_end ? (
      <Badge className="rounded-full px-3 py-1 bg-destructive/10 text-destructive border-0 hover:bg-destructive/10">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
        {t("sub.cancelingBadge")}
      </Badge>
    ) : (
      <Badge className="rounded-full px-3 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 hover:bg-emerald-500/15">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {t("sub.activeBadge")}
      </Badge>
    );

    let dateLabel: string | null = null;
    let dateValue: string | null = null;
    if (subscription.subscription_end) {
      dateLabel = subscription.cancel_at_period_end ? t("sub.detailsEnds") : t("sub.detailsRenewal");
      dateValue = fmtDate(subscription.subscription_end);
    } else {
      dateLabel = t("sub.detailsRenewal");
      dateValue = t("sub.awaitingPaymentData");
    }

    const summaryClientLine =
      clientLimit === null
        ? t("sub.planSummaryUnlimited")
        : clientLimit !== undefined
          ? t("sub.planSummaryClientsLimit", { count: String(clientLimit) })
          : null;

    const Field = ({
      label,
      children,
      muted,
    }: {
      label: string;
      children: React.ReactNode;
      muted?: boolean;
    }) => (
      <div className="flex items-center justify-between gap-3 sm:block">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd
          className={`text-sm sm:mt-1 ${
            muted ? "italic text-muted-foreground" : "font-semibold text-foreground"
          }`}
        >
          {children}
        </dd>
      </div>
    );

    return (
      <>
        <div className="relative overflow-hidden bg-card rounded-2xl border border-border shadow-sm animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-primary/[0.04] pointer-events-none" />
          <div className="relative p-6 sm:p-7 space-y-6">
            <SectionHeader />

            {/* Plan headline */}
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-bold text-foreground tracking-tight">{planLabel}</h3>
              {statusBadge}
            </div>

            {/* Details grid */}
            <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] to-primary/[0.02] p-5">
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                <Field label={t("sub.detailsPlan")}>{planLabel}</Field>
                <Field label={t("sub.detailsBilling")} muted={billingMissing}>
                  {billingLabel}
                </Field>
                <Field label={t("sub.detailsRenewal")} muted={!subscription.subscription_end}>
                  {dateValue}
                </Field>
                <Field label={t("sub.detailsClientLimit")}>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    {clientLimitLabel}
                  </span>
                </Field>
              </dl>
            </div>

            {/* Plan summary */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
              <p className="text-sm font-semibold text-foreground mb-3">{t("sub.planSummaryTitle")}</p>
              <ul className="space-y-2 text-sm text-foreground/85">
                {summaryClientLine && (
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{summaryClientLine}</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{t("sub.planSummaryFullAccess")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{t("sub.planSummaryStripe")}</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              {!subscription.cancel_at_period_end ? (
                <Button
                  variant="ghost"
                  onClick={() => setCancelOpen(true)}
                  disabled={portalLoading}
                  className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t("sub.cancelSubscription")}
                </Button>
              ) : (
                <span />
              )}
              <Button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="w-full sm:w-auto"
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                {t("settings.manageBilling")}
              </Button>
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
    <div className="relative overflow-hidden bg-card rounded-2xl border border-border shadow-sm animate-fade-in">
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="relative p-6 sm:p-7 space-y-6">
        <SectionHeader />

        <div className="rounded-xl border border-border/70 bg-muted/30 p-5 space-y-4">
          <Badge variant="secondary" className="rounded-full">{t("sub.noActiveTitle")}</Badge>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("sub.noActiveDesc")}</p>
          <Button asChild className="w-full sm:w-auto">
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
