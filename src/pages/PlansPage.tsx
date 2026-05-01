import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Check, Loader2, Sparkles, ArrowLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useHasDemoData } from "@/hooks/useDemoWorkspace";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useLanguage } from "@/i18n/LanguageContext";

type Plan = {
  id: string;
  name: string;
  code: "solo" | "pro" | string;
  description: string | null;
};

type PlanPrice = {
  id: string;
  plan_id: string;
  billing_period: "monthly" | "quarterly" | "yearly";
  price: number;
  currency: string;
  stripe_price_id: string | null;
};

type BillingPeriod = "monthly" | "quarterly" | "yearly";

const PLAN_ORDER = ["solo", "pro"];
const HIGHLIGHTED_CODE = "pro";

function formatPrice(amount: number, currency: string) {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency + " ";
  if (amount === 0) return `${symbol}—`;
  return `${symbol}${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

// Compute savings vs paying monthly for the same total period
function savingsVsMonthly(
  prices: PlanPrice[],
  planId: string,
  period: BillingPeriod,
): number | null {
  if (period === "monthly") return null;
  const monthly = prices.find((p) => p.plan_id === planId && p.billing_period === "monthly");
  const target = prices.find((p) => p.plan_id === planId && p.billing_period === period);
  if (!monthly || !target) return null;
  const months = period === "quarterly" ? 3 : 12;
  const baseline = Number(monthly.price) * months;
  if (baseline <= 0) return null;
  const pct = Math.round(((baseline - Number(target.price)) / baseline) * 100);
  return pct > 0 ? pct : null;
}

export default function PlansPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, subscription, subscriptionError } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: hasDemoData } = useHasDemoData();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const isPaid = subscription.subscribed || subscription.on_trial;
  const canClearDemo = !isPaid && Boolean(hasDemoData);
  const periodLabels: Record<BillingPeriod, string> = { monthly: t("plans.monthly"), quarterly: t("plans.quarterly"), yearly: t("plans.yearly") };
  const periodSuffix: Record<BillingPeriod, string> = { monthly: t("plans.month" as any), quarterly: t("plans.threeMonths" as any), yearly: t("plans.year" as any) };
  const planFeatures: Record<string, string[]> = {
    solo: [t("plans.soloFeatureCalendar" as any), t("plans.soloFeatureClients" as any), t("plans.soloFeatureServices" as any), t("plans.soloFeatureReminders" as any), t("plans.soloFeatureRecurring" as any)],
    pro: [t("plans.proFeatureEverything" as any), t("plans.proFeatureFinance" as any), t("plans.proFeatureBreakeven" as any), t("plans.proFeatureInvoices" as any), t("plans.proFeatureSupervision" as any), t("plans.proFeatureAnalytics" as any)],
  };

  const checkHasRealData = async (): Promise<boolean> => {
    const tables = ["clients", "appointments", "income", "expenses"] as const;
    const results = await Promise.all(
      tables.map((t) =>
        supabase.from(t).select("id", { count: "exact", head: true }).eq("is_demo", false),
      ),
    );
    return results.some((r) => (r.count ?? 0) > 0);
  };

  const requestClearDemo = async () => {
    if (!user?.id) return;
    setClearing(true);
    try {
      const hasReal = await checkHasRealData();
      if (hasReal) {
        toast({
          title: t("plans.cantClearTitle"),
          description: t("plans.cantClearDesc"),
          variant: "destructive",
        });
        return;
      }
      setConfirmClearOpen(true);
    } catch (e: any) {
      toast({ title: t("plans.checkFailed"), description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const handleClearDemo = async () => {
    if (!user?.id) return;
    setClearing(true);
    try {
      const hasReal = await checkHasRealData();
      if (hasReal) {
        toast({
          title: t("plans.cantClearTitle"),
          description: t("plans.cantClearAborted"),
          variant: "destructive",
        });
        setConfirmClearOpen(false);
        return;
      }
      const { error } = await supabase.rpc("cleanup_demo_workspace", { p_user_id: user.id });
      if (error) throw error;
      toast({ title: t("plans.demoCleared"), description: t("plans.demoClearedDesc") });
      qc.invalidateQueries();
      sessionStorage.setItem(`demo_seed_attempted:${user.id}`, "1");
    } catch (e: any) {
      toast({ title: t("plans.failedClear"), description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setClearing(false);
      setConfirmClearOpen(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [plansRes, pricesRes] = await Promise.all([
        supabase.from("plans").select("id,name,code,description").eq("is_active", true),
        supabase
          .from("plan_prices")
          .select("id,plan_id,billing_period,price,currency,stripe_price_id")
          .eq("is_active", true),
      ]);
      if (cancelled) return;
      if (plansRes.error) toast({ title: t("plans.failedLoadPlans"), description: plansRes.error.message, variant: "destructive" });
      if (pricesRes.error) toast({ title: t("plans.failedLoadPrices"), description: pricesRes.error.message, variant: "destructive" });
      setPlans((plansRes.data ?? []) as Plan[]);
      setPrices((pricesRes.data ?? []) as PlanPrice[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Sort plans by predefined order: Solo → Pro
  const orderedPlans = useMemo(() => {
    const sorted = [...plans].sort((a, b) => {
      const ai = PLAN_ORDER.indexOf(a.code);
      const bi = PLAN_ORDER.indexOf(b.code);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return sorted;
  }, [plans]);

  const priceFor = (planId: string, p: BillingPeriod) =>
    prices.find((pr) => pr.plan_id === planId && pr.billing_period === p);

  const availablePeriods = useMemo<BillingPeriod[]>(() => {
    const set = new Set<BillingPeriod>();
    prices.forEach((p) => set.add(p.billing_period));
    const order: BillingPeriod[] = ["monthly", "quarterly", "yearly"];
    const filtered = order.filter((p) => set.has(p));
    return filtered.length ? filtered : ["monthly"];
  }, [prices]);

  useEffect(() => {
    if (!availablePeriods.includes(period)) setPeriod(availablePeriods[0]);
  }, [availablePeriods, period]);

  const handleContinue = async () => {
    if (!selectedPlanId || continuing) return; // guard against double-click
    const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
    if (!selectedPlan) {
      toast({
        title: t("plans.checkoutUnavailable"),
        description: t("plans.checkoutChooseAgain"),
        variant: "destructive",
      });
      return;
    }
    setContinuing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planCode: selectedPlan.code, billingPeriod: period, withTrial: true },
      });
      // Edge-function returns non-2xx as `error` with a `context` containing the JSON body.
      if (error) {
        let serverMsg: string | undefined;
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const j = await ctx.json();
            serverMsg = j?.error;
          }
        } catch {
          // ignore — fall back to error.message
        }
        throw new Error(serverMsg || error.message || "Checkout failed");
      }
      if (data?.url) {
        // Single, same-tab redirect to Stripe.
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (e: any) {
      toast({
        title: t("plans.checkoutFailed"),
        description: e?.message ?? String(e),
        variant: "destructive",
      });
      setContinuing(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
        <button
          onClick={() => navigate("/settings")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("plans.backToSettings")}
        </button>

        <header className="space-y-3 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{t("plans.title")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("plans.subtitle")}
          </p>
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              {t("plans.trialBadge")}
            </span>
          </div>
        </header>

        {subscriptionError && (
          <div className="mx-auto max-w-4xl rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">{t("plans.billingError")}</p>
                <p className="text-sm text-destructive/90">{subscriptionError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Billing period toggle */}
        {availablePeriods.length > 1 && (
          <div className="flex justify-center">
            <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
              {availablePeriods.map((p) => {
                const isActive = period === p;
                // Show savings for the longest period (yearly) hint
                const showSave = p === "yearly";
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "relative px-4 py-2 text-sm font-medium rounded-lg transition-all",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {periodLabels[p]}
                    {showSave && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-primary/15 text-primary">
                        Save ~40%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Plan grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orderedPlans.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-2xl">
            <p className="text-muted-foreground">No active plans available yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {orderedPlans.map((plan) => {
              const price = priceFor(plan.id, period);
              const isHighlighted = plan.code === HIGHLIGHTED_CODE;
              const isSelected = selectedPlanId === plan.id;
              const features = planFeatures[plan.code] ?? [];
              const savings = price ? savingsVsMonthly(prices, plan.id, period) : null;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={cn(
                    "group relative text-left p-6 rounded-2xl border transition-all duration-200 flex flex-col",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/10"
                      : isHighlighted
                        ? "border-primary/40 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary hover:-translate-y-0.5 hover:shadow-md"
                        : "border-border bg-card hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md"
                  )}
                >
                  {isHighlighted && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-primary text-primary-foreground">
                        <Sparkles className="h-3 w-3" />
                        Most popular
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {plan.name}
                      </p>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">
                          {price ? formatPrice(price.price, price.currency) : "—"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          / {periodSuffix[period]}
                        </span>
                      </div>
                      {savings !== null && (
                        <Badge variant="secondary" className="mt-2 text-[10px]">
                          Save {savings}% vs monthly
                        </Badge>
                      )}
                    </div>
                    {isSelected && (
                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  {plan.description && (
                    <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
                  )}

                  <ul className="mt-5 space-y-2.5 flex-1">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-xs text-muted-foreground">
            Secure checkout via Stripe. Cancel anytime from Settings.
          </p>
          <div className="flex items-center gap-3">
            {canClearDemo && (
              <Button
                variant="outline"
                size="lg"
                onClick={requestClearDemo}
                disabled={clearing}
              >
                <Trash2 className="h-4 w-4" />
                {clearing ? "Clearing…" : "Clear demo data"}
              </Button>
            )}
            <Button
              size="lg"
              disabled={!selectedPlanId || continuing}
              onClick={handleContinue}
              className="min-w-[180px]"
            >
              {continuing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Continue {selectedPlanId ? "" : "— select a plan"}</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        onConfirm={handleClearDemo}
        loading={clearing}
        title="Clear demo workspace?"
        description="This will permanently remove all demo clients, sessions, income, expenses, and other demo records. Your account, settings, and any real records you created will be kept."
      />
    </AppLayout>
  );
}
