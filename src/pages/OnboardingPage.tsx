import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Scissors, TrendingDown, CalendarDays, Target, Plus, Trash2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 5;

interface ServiceDraft {
  name: string;
  duration_minutes: number;
  price: number;
}

interface ExpenseDraft {
  category: string;
  amount: number;
}

const DEFAULT_EXPENSES: ExpenseDraft[] = [
  { category: "Rent", amount: 0 },
  { category: "Materials", amount: 0 },
  { category: "Other", amount: 0 },
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 2 — Services
  const [services, setServices] = useState<ServiceDraft[]>([
    { name: "", duration_minutes: 60, price: 0 },
  ]);

  // Step 3 — Expenses
  const [expenses, setExpenses] = useState<ExpenseDraft[]>(DEFAULT_EXPENSES);

  // Step 4 — Work setup
  const [workingDays, setWorkingDays] = useState(5);
  const [sessionsPerDay, setSessionsPerDay] = useState(6);

  const addService = () => setServices([...services, { name: "", duration_minutes: 60, price: 0 }]);
  const removeService = (i: number) => setServices(services.filter((_, idx) => idx !== i));
  const updateService = (i: number, field: keyof ServiceDraft, value: string | number) =>
    setServices(services.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  const addExpense = () => setExpenses([...expenses, { category: "", amount: 0 }]);
  const removeExpense = (i: number) => setExpenses(expenses.filter((_, idx) => idx !== i));
  const updateExpense = (i: number, field: keyof ExpenseDraft, value: string | number) =>
    setExpenses(expenses.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));

  // Calculations for Step 5
  const totalMonthlyExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const avgServicePrice = services.filter(s => s.price > 0).length > 0
    ? services.filter(s => s.price > 0).reduce((s, sv) => s + Number(sv.price), 0) / services.filter(s => s.price > 0).length
    : 0;
  const clientsNeeded = avgServicePrice > 0 ? Math.ceil(totalMonthlyExpenses / avgServicePrice) : 0;
  const maxMonthlyCapacity = workingDays * 4 * sessionsPerDay;

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Save valid services
      const validServices = services.filter(s => s.name.trim() && s.price > 0);
      if (validServices.length > 0) {
        const { error: sErr } = await supabase.from("services").insert(
          validServices.map(s => ({ ...s, name: s.name.trim(), user_id: user.id }))
        );
        if (sErr) throw sErr;
      }

      // Save valid expenses as recurring
      const today = new Date().toISOString().split("T")[0];
      const validExpenses = expenses.filter(e => e.category.trim() && Number(e.amount) > 0);
      if (validExpenses.length > 0) {
        const { error: eErr } = await supabase.from("expenses").insert(
          validExpenses.map(e => ({
            category: e.category.trim(),
            amount: Number(e.amount),
            date: today,
            is_recurring: true,
            recurring_start_date: today,
            user_id: user.id,
          }))
        );
        if (eErr) throw eErr;
      }

      // Mark onboarding completed + save work setup
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          working_days_per_week: workingDays,
          sessions_per_day: sessionsPerDay,
        } as any)
        .eq("user_id", user.id);
      if (pErr) throw pErr;

      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });

      toast({ title: "You're all set! 🎉", description: "Your business is ready to go." });
      navigate("/");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("user_id", user.id);
      qc.invalidateQueries({ queryKey: ["profile"] });
      navigate("/");
    } catch {
      navigate("/");
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 2) return services.some(s => s.name.trim() && s.price > 0);
    return true;
  };

  const stepIcons = [Sparkles, Scissors, TrendingDown, CalendarDays, Target];
  const stepLabels = ["Welcome", "Services", "Expenses", "Schedule", "Insight"];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="w-full bg-muted">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            {stepLabels.map((label, i) => {
              const Icon = stepIcons[i];
              const isActive = step === i + 1;
              const isDone = step > i + 1;
              return (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                      isDone
                        ? "bg-primary text-primary-foreground"
                        : isActive
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-border text-muted-foreground"
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={cn("text-xs font-medium hidden sm:block", isActive ? "text-foreground" : "text-muted-foreground")}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-8 animate-fade-in" key={step}>
          {/* Step 1 — Welcome */}
          {step === 1 && (
            <div className="text-center space-y-6">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-foreground">
                  Welcome to Solo<span className="text-primary">.Biz</span>! 👋
                </h1>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto">
                  Let's set up your business in <strong className="text-foreground">2 minutes</strong>. We'll help you understand how much you need to earn to cover your costs.
                </p>
              </div>
              <div className="flex items-center justify-center gap-6 pt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><Scissors className="h-4 w-4 text-primary" /> Add services</span>
                <span className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-primary" /> Set expenses</span>
                <span className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Get insight</span>
              </div>
            </div>
          )}

          {/* Step 2 — Services */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">What services do you offer?</h2>
                <p className="text-muted-foreground">Add at least one service so we can calculate your break-even.</p>
              </div>
              <div className="space-y-4">
                {services.map((s, i) => (
                  <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Service {i + 1}</span>
                      {services.length > 1 && (
                        <button onClick={() => removeService(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        placeholder="e.g. Deep Tissue Massage"
                        value={s.name}
                        onChange={(e) => updateService(i, "name", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Duration (min)</Label>
                        <Input
                          type="number"
                          min={15}
                          value={s.duration_minutes}
                          onChange={(e) => updateService(i, "duration_minutes", Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Price</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="80"
                          value={s.price || ""}
                          onChange={(e) => updateService(i, "price", Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={addService} className="w-full">
                <Plus className="h-4 w-4 mr-2" /> Add another service
              </Button>
            </div>
          )}

          {/* Step 3 — Expenses */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">What are your monthly expenses?</h2>
                <p className="text-muted-foreground">These help us calculate your break-even point. Estimates are fine!</p>
              </div>
              <div className="space-y-3">
                {expenses.map((e, i) => (
                  <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-end gap-3">
                    <div className="flex-1 space-y-2">
                      <Label>Category</Label>
                      <Input
                        placeholder="e.g. Rent"
                        value={e.category}
                        onChange={(ev) => updateExpense(i, "category", ev.target.value)}
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="500"
                        value={e.amount || ""}
                        onChange={(ev) => updateExpense(i, "amount", Number(ev.target.value))}
                      />
                    </div>
                    {expenses.length > 1 && (
                      <button onClick={() => removeExpense(i)} className="pb-2 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={addExpense} className="w-full">
                <Plus className="h-4 w-4 mr-2" /> Add expense
              </Button>
            </div>
          )}

          {/* Step 4 — Work setup */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Your work schedule</h2>
                <p className="text-muted-foreground">This helps us calculate how many clients you can see per month.</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                <div className="space-y-3">
                  <Label className="text-base">Working days per week</Label>
                  <div className="flex items-center gap-2">
                    {[3, 4, 5, 6, 7].map(d => (
                      <button
                        key={d}
                        onClick={() => setWorkingDays(d)}
                        className={cn(
                          "h-12 w-12 rounded-lg font-semibold transition-colors text-sm",
                          workingDays === d
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-base">Sessions per day</Label>
                  <div className="flex items-center gap-2">
                    {[2, 3, 4, 5, 6, 7, 8].map(s => (
                      <button
                        key={s}
                        onClick={() => setSessionsPerDay(s)}
                        className={cn(
                          "h-12 w-12 rounded-lg font-semibold transition-colors text-sm",
                          sessionsPerDay === s
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Max monthly capacity: <strong className="text-foreground">{maxMonthlyCapacity} sessions</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — First insight */}
          {step === 5 && (
            <div className="space-y-6 text-center">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Target className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">Your first insight</h2>
                <p className="text-muted-foreground">Based on what you told us, here's what you need:</p>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Monthly expenses</p>
                    <p className="text-2xl font-bold text-foreground">€{totalMonthlyExpenses.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Avg. service price</p>
                    <p className="text-2xl font-bold text-foreground">€{avgServicePrice.toFixed(0)}</p>
                  </div>
                </div>

                <div className="bg-secondary rounded-xl p-6">
                  <p className="text-secondary-foreground/70 text-sm mb-1">To cover your costs, you need</p>
                  <p className="text-4xl font-bold text-primary">
                    {clientsNeeded > 0 ? clientsNeeded : "—"}
                  </p>
                  <p className="text-secondary-foreground/70 text-sm mt-1">
                    {clientsNeeded > 0 ? "clients per month" : "Add services & expenses to see your number"}
                  </p>
                </div>

                {clientsNeeded > 0 && maxMonthlyCapacity > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {clientsNeeded <= maxMonthlyCapacity ? (
                      <p className="text-success font-medium">
                        ✅ That's {Math.round((clientsNeeded / maxMonthlyCapacity) * 100)}% of your capacity — very achievable!
                      </p>
                    ) : (
                      <p className="text-destructive font-medium">
                        ⚠️ That exceeds your capacity of {maxMonthlyCapacity} sessions. Consider raising prices or reducing expenses.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <div>
              {step > 1 && (
                <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={saving}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={handleSkip} disabled={saving} className="text-muted-foreground">
                Skip setup
              </Button>
              {step < TOTAL_STEPS ? (
                <Button onClick={() => setStep(step + 1)} disabled={step === 2 && !canProceed()}>
                  Continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleFinish} disabled={saving}>
                  {saving ? "Saving..." : "Go to Dashboard"} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
