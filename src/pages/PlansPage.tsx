import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Check, CheckCircle2, Loader2, Sparkles, ArrowLeft, Trash2, ShieldCheck, Users } from "lucide-react";
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
    solo: [
      t("plans.bulletClientsSolo" as any),
      t("plans.bulletEverythingFree" as any),
      t("plans.bulletCoreModules" as any),
      t("plans.bulletAnalytics" as any),
      t("plans.bulletCancelAnytime" as any),
    ],
    pro: [
      t("plans.bulletClientsPro" as any),
      t("plans.bulletEverythingSolo" as any),
      t("plans.bulletPrioritySupport" as any),
      t("plans.bulletCustomOnboarding" as any),
      t("plans.bulletScalingTeams" as any),
    ],
  };
  const planDescriptions: Record<string, string> = {
    solo: t("plans.soloDesc" as any),
    pro: t("plans.proDesc" as any),
  };
  const freeFeatures = [
    t("plans.bulletClientsFree" as any),
    t("plans.bulletAllFeatures" as any),
    t("plans.bulletCoreModules" as any),
    t("plans.bulletAnalytics" as any),
    t("plans.bulletForeverFree" as any),
  ];

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
        body: { planCode: selectedPlan.code, billingPeriod: period, withTrial: false },
      });
      // Edge-function returns non-2xx as `error` with a `context` containing the JSON body.
      if (error) {
        let serverMsg: string | undefined;
        let serverCode: string | undefined;
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const j = await ctx.json();
            serverMsg = j?.error;
            serverCode = j?.code;
          }
        } catch {
          // ignore — fall back to error.message
        }
        if (serverCode === "already_subscribed") {
          toast({ title: t("plans.alreadySubscribed") || "You're already subscribed", description: serverMsg });
          navigate("/settings");
          return;
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
      <div className="animate-fade-in">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          <button
            onClick={() => navigate("/settings")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("plans.backToSettings")}
          </button>
        </div>

        <section className="px-4 sm:px-6 py-10 sm:py-16 bg-orange-50/60">
          <div className="max-w-6xl mx-auto">
            <header className="text-center mb-10 space-y-4">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">{t("plans.title")}</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">{t("plans.title")}</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("plans.subtitle")}
              </p>
              <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                <Check className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{t("plans.bulletAllFeatures" as any)}</span>
              </div>
            </header>

            {subscriptionError && (
              <div className="mx-auto max-w-4xl mb-8 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{t("plans.billingError")}</p>
                    <p className="text-sm text-destructive/90">{subscriptionError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Billing period toggle (landing style) */}
            {availablePeriods.length > 1 && (
              <div className="flex justify-center mb-10">
                <div className="inline-flex rounded-full border border-border bg-card p-1 shadow-sm">
                  {availablePeriods.map((p) => {
                    const isActive = period === p;
                    const saveLabel = p === "quarterly" ? "−20%" : p === "yearly" ? "−40%" : null;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPeriod(p)}
                        className={cn(
                          "relative px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground shadow"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {periodLabels[p]}
                        {saveLabel && (
                          <span
                            className={cn(
                              "ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold",
                              isActive
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-emerald-100 text-emerald-700"
                            )}
                          >
                            {saveLabel}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Plan grid (landing style) */}
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orderedPlans.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border rounded-2xl">
                <p className="text-muted-foreground">{t("plans.loadingNone")}</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch pt-4">
                {/* Free Starter card */}
                <div className="relative p-8 rounded-2xl bg-card border border-border flex flex-col">
                  <h3 className="text-2xl font-semibold text-foreground">{t("plans.freeName" as any)}</h3>
                  <p className="text-sm text-muted-foreground mt-2 mb-6 leading-relaxed min-h-[3rem]">
                    {t("plans.freeDesc" as any)}
                  </p>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-5xl font-bold text-foreground">€0</span>
                    <span className="text-muted-foreground text-base">/ {periodSuffix["monthly"]}</span>
                  </div>

                  <p className="text-sm mb-1 font-semibold text-primary">{t("plans.freeForever" as any)}</p>
                  <p className="text-xs text-muted-foreground mb-5 min-h-[1rem]">
                    {t("plans.noCardRequired" as any)}
                  </p>

                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/60 border border-border mb-6">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground">{freeFeatures[0]}</span>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {freeFeatures.slice(1).map((f) => (
                      <li key={f} className="flex items-start gap-3 text-foreground">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                        <span className="text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-auto text-xs text-muted-foreground text-center">
                    {t("plans.freeAvailableByDefault" as any)}
                  </p>
                </div>

                {orderedPlans.map((plan) => {
                  const price = priceFor(plan.id, period);
                  const isHighlighted = plan.code === HIGHLIGHTED_CODE;
                  const isSelected = selectedPlanId === plan.id;
                  const features = planFeatures[plan.code] ?? [];
                  const pill = features[0];
                  const restFeatures = features.slice(1);
                  const equivPerMonth =
                    price && period !== "monthly"
                      ? Number(price.price) / (period === "quarterly" ? 3 : 12)
                      : null;
                  const billedLabel =
                    period === "monthly"
                      ? t("plans.billedMonthly" as any) || "Billed monthly"
                      : period === "quarterly"
                        ? t("plans.billedQuarterly" as any) || "Billed every 3 months"
                        : t("plans.billedYearly" as any) || "Billed yearly";
                  const isSolo = plan.code === "solo";
                  const isPro = plan.code === "pro";
                  const bulletColor = isSolo
                    ? "text-primary"
                    : isPro
                      ? "text-emerald-500"
                      : "text-muted-foreground";

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={cn(
                        "relative p-8 rounded-2xl bg-card flex flex-col text-left transition-all",
                        isHighlighted
                          ? "border-2 border-primary shadow-xl"
                          : "border border-border",
                        isSelected
                          ? "ring-2 ring-primary/40 -translate-y-0.5"
                          : "hover:-translate-y-0.5 hover:shadow-md"
                      )}
                    >
                      {isHighlighted && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-primary text-primary-foreground inline-flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {t("plans.mostPopular")}
                        </span>
                      )}
                      {!isHighlighted && isPro && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-emerald-500 text-white">
                          {t("plans.bulletScalingTeams" as any) ? "Pro" : "Pro"}
                        </span>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-2xl font-semibold text-foreground">{plan.name}</h3>
                        {isSelected && (
                          <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 mb-6 leading-relaxed min-h-[3rem]">
                        {planDescriptions[plan.code] || plan.description}
                      </p>

                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-5xl font-bold text-foreground">
                          {price ? formatPrice(price.price, price.currency) : "—"}
                        </span>
                        <span className="text-muted-foreground text-base">/ {periodSuffix[period]}</span>
                      </div>

                      <p className="text-sm mb-1 text-muted-foreground">{billedLabel}</p>
                      <p className="text-xs text-muted-foreground mb-5 min-h-[1rem]">
                        {equivPerMonth !== null && price
                          ? `≈ ${formatPrice(Number(equivPerMonth.toFixed(2)), price.currency)} / ${periodSuffix["monthly"]}`
                          : "\u00A0"}
                      </p>

                      {pill && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/60 border border-border mb-6">
                          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium text-foreground">{pill}</span>
                        </div>
                      )}

                      <ul className="space-y-3 mb-8 flex-1">
                        {restFeatures.map((f) => (
                          <li key={f} className="flex items-start gap-3 text-foreground">
                            <CheckCircle2 className={cn("h-4 w-4 shrink-0 mt-0.5", bulletColor)} />
                            <span className="text-sm">{f}</span>
                          </li>
                        ))}
                      </ul>

                      <div
                        className={cn(
                          "mt-auto w-full h-12 px-8 inline-flex items-center justify-center rounded-xl text-base font-semibold gap-2 transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                            : "border border-border text-foreground bg-background hover:border-primary/40"
                        )}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-4 w-4" />
                            {t("plans.continueSelect") ? t("plans.selected" as any) || "Selected" : "Selected"}
                          </>
                        ) : (
                          t("plans.selectPlan" as any) || t("plans.continueSelect")
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}


        {/* Privacy / trust block — placed near decision point */}
        <div className="max-w-3xl mx-auto rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4 sm:p-5 flex items-start gap-3.5">
          <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("privacy.longClients" as any)}
          </p>
        </div>

        {/* Footer CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-xs text-muted-foreground">
            {t("plans.footerSecure")}
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
                {clearing ? t("plans.clearing") : t("plans.clearDemo")}
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
                <>{selectedPlanId ? t("plans.continue") : t("plans.continueSelect")}</>
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
        title={t("plans.confirmClearTitle")}
        description={t("plans.confirmClearDesc")}
      />
    </AppLayout>
  );
}
