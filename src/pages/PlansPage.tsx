import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  code: "medium" | "gold" | "premium" | string;
  description: string | null;
};

type PlanPrice = {
  id: string;
  plan_id: string;
  billing_period: "monthly" | "quarterly" | "yearly";
  price: number;
  currency: string;
};

type BillingPeriod = "monthly" | "quarterly" | "yearly";

// Placeholder feature lists per plan code (UI-only; real entitlements live in DB)
const PLAN_FEATURES: Record<string, string[]> = {
  medium: [
    "Calendar & appointments",
    "Clients & groups",
    "Services catalog",
    "Email reminders",
  ],
  gold: [
    "Everything in Medium",
    "Income & expenses tracking",
    "Break-even goals",
    "Invoices & VAT",
  ],
  premium: [
    "Everything in Gold",
    "Supervision workspace",
    "Advanced analytics",
    "Priority support",
  ],
};

const PLAN_ORDER = ["medium", "gold", "premium"];
const HIGHLIGHTED_CODE = "gold";

function formatPrice(amount: number, currency: string) {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency + " ";
  if (amount === 0) return `${symbol}—`;
  return `${symbol}${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

export default function PlansPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [plansRes, pricesRes] = await Promise.all([
        supabase.from("plans").select("id,name,code,description").eq("is_active", true),
        supabase.from("plan_prices").select("id,plan_id,billing_period,price,currency").eq("is_active", true),
      ]);
      if (cancelled) return;
      if (plansRes.error) toast({ title: "Failed to load plans", description: plansRes.error.message, variant: "destructive" });
      if (pricesRes.error) toast({ title: "Failed to load prices", description: pricesRes.error.message, variant: "destructive" });
      setPlans((plansRes.data ?? []) as Plan[]);
      setPrices((pricesRes.data ?? []) as PlanPrice[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Sort plans by predefined order so Medium → Gold → Premium
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

  // Available billing periods (only show toggles that have at least one price)
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

  const handleContinue = () => {
    if (!selectedPlanId) return;
    const plan = orderedPlans.find((p) => p.id === selectedPlanId);
    const price = priceFor(selectedPlanId, period);
    setContinuing(true);
    // Placeholder: prices are €0 today, so we don't trigger Stripe. When real
    // prices and stripe_price_id are filled in, wire create-checkout here.
    toast({
      title: "Plan selected",
      description: `${plan?.name ?? "Plan"} · ${period}${price ? ` · ${formatPrice(price.price, price.currency)}` : ""}. Checkout will be enabled once pricing is configured.`,
    });
    setTimeout(() => setContinuing(false), 600);
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
        <button
          onClick={() => navigate("/settings")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </button>

        <header className="space-y-2 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Choose your plan</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Pick the package that fits your practice. You can change or cancel anytime.
          </p>
        </header>

        {/* Billing period toggle */}
        {availablePeriods.length > 1 && (
          <div className="flex justify-center">
            <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
              {availablePeriods.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize",
                    period === p
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
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
          <div className="grid sm:grid-cols-3 gap-5">
            {orderedPlans.map((plan) => {
              const price = priceFor(plan.id, period);
              const isHighlighted = plan.code === HIGHLIGHTED_CODE;
              const isSelected = selectedPlanId === plan.id;
              const features = PLAN_FEATURES[plan.code] ?? [];

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
                        <span className="text-sm text-muted-foreground">/ {period.replace("ly", "")}</span>
                      </div>
                      {price && price.price === 0 && (
                        <Badge variant="secondary" className="mt-2 text-[10px]">
                          Placeholder price
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
            Prices and features shown are placeholders while pricing is being finalised.
          </p>
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
    </AppLayout>
  );
}
