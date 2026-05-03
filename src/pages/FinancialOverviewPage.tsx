import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useIncome, useExpenses, useAppointments, useTaxSettings, useExpectedPayments, useProfile } from "@/hooks/useData";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, isBefore, isAfter, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign,
  BarChart3, Calendar, ArrowUpRight, ArrowDownRight, Eye, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart, Area,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MonthData {
  month: number;
  label: string;
  shortLabel: string;
  income: number;
  confirmedIncome: number;
  expectedIncome: number;
  expenses: number;
  taxes: number;
  net: number;
  sessions: number;
  isFuture: boolean;
  incomeItems: any[];
  expenseItems: any[];
}

export default function FinancialOverviewPage() {
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();
  const [year, setYear] = useState(new Date().getFullYear());
  const [drillMonth, setDrillMonth] = useState<MonthData | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "chart">("chart");

  const { data: incomeResult } = useIncome();
  const allIncome = (incomeResult as any)?.data ?? incomeResult ?? [];
  const { data: expenseResult } = useExpenses();
  const allExpenses = (expenseResult as any)?.data ?? expenseResult ?? [];
  const { data: allAppointments = [] } = useAppointments();
  const { data: taxSettings = [] } = useTaxSettings();
  const { data: expectedPayments = [] } = useExpectedPayments();
  const { data: profile } = useProfile();
  const incomeDateField: "date" | "session_date" =
    (profile as any)?.income_recognition_method === "session_date" ? "session_date" : "date";
  const incomeDateOf = (i: any) => i[incomeDateField] || i.date;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const activeTaxes = (taxSettings as any[]).filter((ts: any) => ts.is_active);

  const calcTaxes = (income: number) => {
    let total = 0;
    for (const tax of activeTaxes) {
      if (tax.tax_type === "percentage") {
        total += income * (Number(tax.tax_rate) / 100);
      } else if (tax.tax_type === "fixed") {
        const amount = Number(tax.fixed_amount);
        total += tax.frequency === "quarterly" ? amount / 3 : amount;
      }
    }
    return Math.round(total * 100) / 100;
  };

  const monthsData = useMemo<MonthData[]>(() => {
    const months = eachMonthOfInterval({
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31),
    });

    // Recurring expenses: only count those whose recurring_start_date <= the month
    const recurringExpenses = (allExpenses as any[]).filter(e => e.is_recurring);
    const getRecurringForMonth = (monthKey: string) => {
      return recurringExpenses
        .filter(e => {
          const startDate = e.recurring_start_date || e.date;
          return startDate <= monthKey + "-31"; // started on or before end of month
        })
        .reduce((s, e) => s + Number(e.amount), 0);
    };

    return months.map((monthDate, idx) => {
      const isFuture = year > currentYear || (year === currentYear && idx > currentMonth);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      const mKey = format(monthDate, "yyyy-MM");

      if (isFuture) {
        // Forecast: use scheduled appointments for income
        const futureApts = (allAppointments as any[]).filter(a => {
          const d = new Date(a.scheduled_at);
          return d >= mStart && d <= mEnd && a.status !== "cancelled" && a.status !== "no-show";
        });

        // Split: completed+paid = confirmed, rest = expected
        const confirmedApts = futureApts.filter(a => a.status === "completed" && (a.payment_status === "paid_now" || a.payment_status === "paid_in_advance"));
        const expectedApts = futureApts.filter(a => !confirmedApts.includes(a));
        const confirmedIncome = confirmedApts.reduce((s, a) => s + Number(a.price), 0);
        const expectedIncome = expectedApts.reduce((s, a) => s + Number(a.price), 0);
        const predictedIncome = confirmedIncome + expectedIncome;

        // Recurring expenses projected into future month (only those started by this month)
        const predictedExpenses = getRecurringForMonth(mKey);
        const predictedTaxes = calcTaxes(predictedIncome);

        return {
          month: idx,
          label: format(monthDate, "MMMM"),
          shortLabel: format(monthDate, "MMM"),
          income: predictedIncome,
          confirmedIncome,
          expectedIncome,
          expenses: predictedExpenses,
          taxes: predictedTaxes,
          net: predictedIncome - predictedTaxes - predictedExpenses,
          sessions: futureApts.length,
          isFuture: true,
          incomeItems: [
            ...confirmedApts.map(a => ({
              description: `${(a.clients as any)?.name || "Client"} — ${(a.services as any)?.name || "Service"}`,
              amount: Number(a.price),
              date: format(new Date(a.scheduled_at), "MMM d"),
              type: "confirmed" as const,
            })),
            ...expectedApts.map(a => ({
              description: `${(a.clients as any)?.name || "Client"} — ${(a.services as any)?.name || "Service"}`,
              amount: Number(a.price),
              date: format(new Date(a.scheduled_at), "MMM d"),
              type: "expected" as const,
            })),
          ],
          expenseItems: recurringExpenses
            .filter((e: any) => {
              const startDate = e.recurring_start_date || e.date;
              return startDate <= mKey + "-31";
            })
            .map((e: any) => ({
              description: e.description || e.category,
              amount: Number(e.amount),
              date: "—",
              category: e.category,
              isRecurring: true,
            })),
        };
      }

      // Past/current: actual data only
      const monthIncome = (allIncome as any[]).filter(i => i.date?.startsWith(mKey));
      const monthExpenses = (allExpenses as any[]).filter(e => e.date?.startsWith(mKey));
      const totalIncome = monthIncome.reduce((s, i) => s + Number(i.amount), 0);

      // Expected payments for this month (pending)
      const monthExpected = (expectedPayments as any[]).filter(ep => {
        const apt = ep.appointments as any;
        if (!apt?.scheduled_at) return false;
        return apt.scheduled_at.startsWith(mKey) && ep.status === "pending";
      });
      const expectedIncomeTotal = monthExpected.reduce((s, ep) => s + Number(ep.amount), 0);

      const totalExpenses = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const monthTaxes = calcTaxes(totalIncome);
      const monthSessions = (allAppointments as any[]).filter(a => {
        const d = new Date(a.scheduled_at);
        return d >= mStart && d <= mEnd && a.status === "completed";
      }).length;

      return {
        month: idx,
        label: format(monthDate, "MMMM"),
        shortLabel: format(monthDate, "MMM"),
        income: totalIncome,
        confirmedIncome: totalIncome,
        expectedIncome: expectedIncomeTotal,
        expenses: totalExpenses,
        taxes: monthTaxes,
        net: totalIncome - monthTaxes - totalExpenses,
        sessions: monthSessions,
        isFuture: false,
        incomeItems: monthIncome.map((i: any) => ({
          description: i.description || (i.appointments?.clients?.name ? `${i.appointments.clients.name} — ${i.appointments.services?.name}` : "Manual"),
          amount: Number(i.amount),
          date: format(new Date(i.date), "MMM d"),
          type: "confirmed" as const,
        })),
        expenseItems: monthExpenses.map((e: any) => ({
          description: e.description || e.category,
          amount: Number(e.amount),
          date: format(new Date(e.date), "MMM d"),
          category: e.category,
          isRecurring: e.is_recurring,
        })),
      };
    });
  }, [year, allIncome, allExpenses, allAppointments, activeTaxes, expectedPayments, currentMonth, currentYear]);

  // Yearly summaries
  const pastMonths = monthsData.filter(m => !m.isFuture && (m.income > 0 || m.expenses > 0));
  const futureMonths = monthsData.filter(m => m.isFuture);
  const totalActualIncome = pastMonths.reduce((s, m) => s + m.income, 0);
  const totalActualExpenses = pastMonths.reduce((s, m) => s + m.expenses, 0);
  const totalActualTaxes = pastMonths.reduce((s, m) => s + m.taxes, 0);
  const avgMonthlyIncome = pastMonths.length > 0 ? totalActualIncome / pastMonths.length : 0;
  const avgMonthlyExpenses = pastMonths.length > 0 ? totalActualExpenses / pastMonths.length : 0;
  const avgMonthlyNet = pastMonths.length > 0 ? pastMonths.reduce((s, m) => s + m.net, 0) / pastMonths.length : 0;

  const totalForecastIncome = futureMonths.reduce((s, m) => s + m.income, 0);
  const totalForecastExpenses = futureMonths.reduce((s, m) => s + m.expenses, 0);

  const chartData = monthsData.map(m => ({
    name: m.shortLabel,
    income: m.income,
    expenses: m.expenses,
    taxes: m.taxes,
    net: m.net,
    isFuture: m.isFuture,
  }));

  const fmt = (n: number) => `${cs}${Math.abs(n).toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("financial.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("financial.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setYear(y => y - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-lg font-semibold text-foreground min-w-[60px] text-center">{year}</span>
            <Button variant="outline" size="icon" onClick={() => setYear(y => y + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon={TrendingUp} label={t("financial.totalIncome")} value={fmt(totalActualIncome)} accent="text-success" />
          <SummaryCard icon={TrendingDown} label={t("financial.totalExpenses")} value={fmt(totalActualExpenses)} accent="text-destructive" />
          <SummaryCard icon={DollarSign} label={t("financial.avgMonthlyNet")} value={fmt(avgMonthlyNet)} accent={avgMonthlyNet >= 0 ? "text-success" : "text-destructive"} />
          {futureMonths.length > 0 && (
            <SummaryCard icon={BarChart3} label={t("financial.forecastIncome")} value={fmt(totalForecastIncome)} accent="text-primary" dashed />
          )}
        </div>

        {/* Averages strip */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="bg-muted/50 rounded-lg px-4 py-2">
            <span className="text-muted-foreground">{t("financial.avgIncome")}: </span>
            <span className="font-semibold text-foreground">{fmt(avgMonthlyIncome)}</span>
          </div>
          <div className="bg-muted/50 rounded-lg px-4 py-2">
            <span className="text-muted-foreground">{t("financial.avgExpenses")}: </span>
            <span className="font-semibold text-foreground">{fmt(avgMonthlyExpenses)}</span>
          </div>
          <div className="bg-muted/50 rounded-lg px-4 py-2">
            <span className="text-muted-foreground">{t("financial.totalTaxes")}: </span>
            <span className="font-semibold text-foreground">{fmt(totalActualTaxes)}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">{t("financial.yearlyChart")}</h2>
            <div className="flex gap-1">
              <Button variant={viewMode === "chart" ? "default" : "outline"} size="sm" onClick={() => setViewMode("chart")}>
                <BarChart3 className="h-3.5 w-3.5 mr-1" /> {t("financial.chart")}
              </Button>
              <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")}>
                <Calendar className="h-3.5 w-3.5 mr-1" /> {t("financial.table")}
              </Button>
            </div>
          </div>

          {viewMode === "chart" ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} tickFormatter={v => `${cs}${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number, name: string) => [`${cs}${value.toFixed(0)}`, name]}
                  />
                  <Legend />
                  <Bar dataKey="income" name={t("financial.income")} fill="hsl(var(--success))" radius={[4, 4, 0, 0]} opacity={0.9} />
                  <Bar dataKey="expenses" name={t("financial.expenses")} fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.7} />
                  <Bar dataKey="taxes" name={t("financial.taxes")} fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} opacity={0.6} />
                  <Line type="monotone" dataKey="net" name={t("financial.netResult")} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <MonthlyTable months={monthsData} onDrill={setDrillMonth} fmt={fmt} t={t} currentMonth={year === currentYear ? currentMonth : -1} />
          )}
        </div>

        {/* Monthly cards grid (always shown) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {monthsData.map(m => (
            <button
              key={m.month}
              onClick={() => setDrillMonth(m)}
              className={cn(
                "text-left p-4 rounded-xl border transition-all hover:ring-2 hover:ring-ring/20",
                m.isFuture ? "border-dashed border-border/60 bg-card/50" : "border-border bg-card",
                year === currentYear && m.month === currentMonth && "ring-2 ring-primary/30"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">{m.label}</span>
                {m.isFuture && <Badge variant="outline" className="text-[10px] border-dashed">{t("financial.forecast")}</Badge>}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("financial.income")}</span>
                  <div className="text-right">
                    <span className="text-success font-medium">{fmt(m.confirmedIncome)}</span>
                    {m.expectedIncome > 0 && (
                      <span className="text-muted-foreground ml-1">(+{fmt(m.expectedIncome)})</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("financial.expenses")}</span>
                  <span className="text-destructive font-medium">{fmt(m.expenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("financial.taxes")}</span>
                  <span className="text-warning font-medium">{fmt(m.taxes)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 mt-1">
                  <span className="text-muted-foreground font-medium">{t("financial.netResult")}</span>
                  <span className={cn("font-semibold", m.net >= 0 ? "text-success" : "text-destructive")}>
                    {m.net < 0 ? "-" : ""}{fmt(m.net)}
                  </span>
                </div>
                {m.sessions > 0 && (
                  <div className="text-muted-foreground mt-1">{m.sessions} {t("financial.sessions")}</div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Cashflow summary */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-semibold text-foreground mb-4">{t("financial.cashflow")}</h2>
          <CashflowChart data={monthsData} fmt={fmt} t={t} cs={cs} />
        </div>
      </div>

      {/* Drill-down dialog */}
      <Dialog open={!!drillMonth} onOpenChange={o => !o && setDrillMonth(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {drillMonth && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {drillMonth.label} {year}
                  {drillMonth.isFuture && <Badge variant="outline" className="border-dashed text-xs">{t("financial.forecast")}</Badge>}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-success/10 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">{t("financial.confirmed")}</p>
                    <p className="text-success font-bold text-lg">{fmt(drillMonth.confirmedIncome)}</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">{t("financial.expected")}</p>
                    <p className="text-primary font-bold text-lg">{fmt(drillMonth.expectedIncome)}</p>
                  </div>
                  <div className="bg-destructive/10 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">{t("financial.expenses")}</p>
                    <p className="text-destructive font-bold text-lg">{fmt(drillMonth.expenses)}</p>
                  </div>
                  <div className="bg-warning/10 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">{t("financial.taxes")}</p>
                    <p className="text-warning font-bold text-lg">{fmt(drillMonth.taxes)}</p>
                  </div>
                  <div className={cn("rounded-lg p-3 col-span-2", drillMonth.net >= 0 ? "bg-success/10" : "bg-destructive/10")}>
                    <p className="text-muted-foreground text-xs">{t("financial.netResult")}</p>
                    <p className={cn("font-bold text-lg", drillMonth.net >= 0 ? "text-success" : "text-destructive")}>
                      {drillMonth.net < 0 ? "-" : ""}{fmt(drillMonth.net)}
                    </p>
                  </div>
                </div>

                {/* Tax breakdown */}
                {activeTaxes.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-foreground text-sm">{t("financial.taxBreakdown")}</h3>
                    {activeTaxes.map(tax => {
                      const amount = tax.tax_type === "percentage"
                        ? drillMonth.income * (Number(tax.tax_rate) / 100)
                        : tax.frequency === "quarterly" ? Number(tax.fixed_amount) / 3 : Number(tax.fixed_amount);
                      return (
                        <div key={tax.id} className="flex justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                          <span className="text-muted-foreground">{tax.tax_name}</span>
                          <span className="text-warning font-medium">{fmt(amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Income items */}
                {drillMonth.incomeItems.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-foreground text-sm flex items-center gap-1">
                      <ArrowUpRight className="h-3.5 w-3.5 text-success" /> {t("financial.incomeDetails")}
                    </h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {drillMonth.incomeItems.map((item, i) => (
                        <div key={i} className={cn(
                          "flex justify-between text-sm rounded-lg px-3 py-2",
                          item.type === "expected" ? "bg-primary/5 border border-dashed border-primary/20" : "bg-muted/50"
                        )}>
                          <div className="flex items-center gap-2">
                            <span className="text-foreground">{item.description}</span>
                            <span className="text-muted-foreground text-xs">{item.date}</span>
                            {item.type === "expected" && <Badge variant="outline" className="text-[9px] border-dashed">{t("financial.expected")}</Badge>}
                          </div>
                          <span className={cn("font-medium", item.type === "expected" ? "text-primary" : "text-success")}>{fmt(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expense items */}
                {drillMonth.expenseItems.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-foreground text-sm flex items-center gap-1">
                      <ArrowDownRight className="h-3.5 w-3.5 text-destructive" /> {t("financial.expenseDetails")}
                    </h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {drillMonth.expenseItems.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                          <div>
                            <span className="text-foreground">{item.description}</span>
                            <span className="text-muted-foreground text-xs ml-2">{item.date}</span>
                            {item.isRecurring && <Badge variant="outline" className="text-[9px] ml-1">{t("financial.recurring")}</Badge>}
                          </div>
                          <span className="text-destructive font-medium">{fmt(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {drillMonth.incomeItems.length === 0 && drillMonth.expenseItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("financial.noData")}</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function SummaryCard({ icon: Icon, label, value, accent, dashed }: { icon: any; label: string; value: string; accent: string; dashed?: boolean }) {
  return (
    <div className={cn("bg-card rounded-xl border p-4", dashed ? "border-dashed" : "border-border")}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("h-4 w-4", accent)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-xl font-bold", accent)}>{value}</p>
    </div>
  );
}

function MonthlyTable({ months, onDrill, fmt, t, currentMonth }: { months: MonthData[]; onDrill: (m: MonthData) => void; fmt: (n: number) => string; t: any; currentMonth: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t("financial.month")}</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t("financial.income")}</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t("financial.expenses")}</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t("financial.taxes")}</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">{t("financial.netResult")}</th>
            <th className="text-center py-2 px-3 text-muted-foreground font-medium">{t("financial.sessions")}</th>
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {months.map(m => (
            <tr key={m.month} className={cn(
              "border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer",
              m.isFuture && "opacity-70",
              m.month === currentMonth && "bg-primary/5"
            )} onClick={() => onDrill(m)}>
              <td className="py-2.5 px-3 font-medium text-foreground">
                {m.label}
                {m.isFuture && <span className="text-[10px] text-muted-foreground ml-1 border border-dashed rounded px-1">{t("financial.forecast")}</span>}
              </td>
              <td className="py-2.5 px-3 text-right text-success font-medium">{fmt(m.income)}</td>
              <td className="py-2.5 px-3 text-right text-destructive font-medium">{fmt(m.expenses)}</td>
              <td className="py-2.5 px-3 text-right text-warning font-medium">{fmt(m.taxes)}</td>
              <td className={cn("py-2.5 px-3 text-right font-semibold", m.net >= 0 ? "text-success" : "text-destructive")}>
                {m.net < 0 ? "-" : ""}{fmt(m.net)}
              </td>
              <td className="py-2.5 px-3 text-center text-muted-foreground">{m.sessions}</td>
              <td className="py-2.5 px-3"><Eye className="h-3.5 w-3.5 text-muted-foreground" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CashflowChart({ data, fmt, t, cs }: { data: MonthData[]; fmt: (n: number) => string; t: any; cs: string }) {
  let runningBalance = 0;
  const cashflowData = data.map(m => {
    runningBalance += m.income - m.expenses - m.taxes;
    return {
      name: m.shortLabel,
      inflow: m.income,
      outflow: m.expenses + m.taxes,
      balance: runningBalance,
      isFuture: m.isFuture,
    };
  });

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={cashflowData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
          <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} tickFormatter={v => `${cs}${v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
            formatter={(value: number, name: string) => [`${cs}${value.toFixed(0)}`, name]}
          />
          <Legend />
          <Area type="monotone" dataKey="balance" name={t("financial.balance")} fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary))" strokeWidth={2} />
          <Bar dataKey="inflow" name={t("financial.inflow")} fill="hsl(var(--success) / 0.6)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="outflow" name={t("financial.outflow")} fill="hsl(var(--destructive) / 0.4)" radius={[3, 3, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
