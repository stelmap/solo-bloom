import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAllIncome, useExpenses, useAppointments, useTaxSettings, useExpectedPayments, useProfile } from "@/hooks/useData";
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
import { MonthlyDetailsModal } from "@/components/MonthlyDetailsModal";

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

  const { data: allIncome = [] } = useAllIncome();
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

  // Map "yyyy-Qn" -> total income for that quarter (actual past quarters).
  const quarterIncomeMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of allIncome as any[]) {
      const d = incomeDateOf(i);
      if (!d) continue;
      const dt = new Date(d);
      const q = Math.floor(dt.getMonth() / 3) + 1;
      const key = `${dt.getFullYear()}-Q${q}`;
      map.set(key, (map.get(key) || 0) + Number(i.amount));
    }
    return map;
  }, [allIncome, incomeDateField]);

  /**
   * Whether a tax rule applies to the given month/quarter.
   * Monthly: (year, month) must be on or after the start month.
   * Quarterly: the accrued quarter (the quarter being taxed) must be on or after the start quarter.
   */
  const taxAppliesIn = (tax: any, monthIdx: number, monthYear: number, accruedQuarterKey: string | null) => {
    const startStr: string | undefined = tax.start_calculation_date;
    if (!startStr) return true;
    const m = startStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return true;
    const sy = +m[1], smonth = +m[2] - 1;
    if (tax.frequency === "quarterly") {
      if (!accruedQuarterKey) return false;
      const qm = accruedQuarterKey.match(/^(\d{4})-Q(\d)$/);
      if (!qm) return true;
      const qy = +qm[1], qn = +qm[2];
      const sq = Math.floor(smonth / 3) + 1;
      return qy > sy || (qy === sy && qn >= sq);
    }
    return monthYear > sy || (monthYear === sy && monthIdx >= smonth);
  };


  /**
   * Compute taxes recognized in a given month.
   * - Monthly tax: accrued in the same month against that month's income.
   * - Quarterly tax: accrued only in the month AFTER the quarter ends
   *   (Jan→Q4 prev year, Apr→Q1, Jul→Q2, Oct→Q3). Other months: 0.
   */
  const calcTaxes = (
    monthIncome: number,
    monthIdx: number,
    monthYear: number,
    quarterIncomeOverride?: Map<string, number>,
  ) => {
    let total = 0;
    const isAccrualMonth = monthIdx % 3 === 0; // 0=Jan,3=Apr,6=Jul,9=Oct
    let accruedQuarterKey: string | null = null;
    if (isAccrualMonth) {
      // The quarter that ended just before this month
      const prevQuarterMonthIdx = monthIdx - 1; // -1 for Jan -> Dec prev year
      if (prevQuarterMonthIdx < 0) {
        accruedQuarterKey = `${monthYear - 1}-Q4`;
      } else {
        const q = Math.floor(prevQuarterMonthIdx / 3) + 1;
        accruedQuarterKey = `${monthYear}-Q${q}`;
      }
    }
    const qMap = quarterIncomeOverride ?? quarterIncomeMap;

    for (const tax of activeTaxes) {
      if (!taxAppliesIn(tax, monthIdx, monthYear, accruedQuarterKey)) continue;
      if (tax.frequency === "quarterly") {
        if (!accruedQuarterKey) continue;
        if (tax.tax_type === "percentage") {
          const qIncome = qMap.get(accruedQuarterKey) || 0;
          total += qIncome * (Number(tax.tax_rate) / 100);
        } else {
          total += Number(tax.fixed_amount);
        }
      } else {
        if (tax.tax_type === "percentage") {
          total += monthIncome * (Number(tax.tax_rate) / 100);
        } else {
          total += Number(tax.fixed_amount);
        }
      }
    }
    return Math.round(total * 100) / 100;
  };

  const monthsData = useMemo<MonthData[]>(() => {
    const months = eachMonthOfInterval({
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31),
    });

    // Instances are real rows now; bucket per month directly.
    const expensesByMonth = (allExpenses as any[])
      .filter(e => !e.is_template && e.instance_status !== "cancelled");
    const getRecurringForMonth = (monthKey: string) =>
      expensesByMonth.filter(e => e.date?.startsWith(monthKey) && e.template_id)
        .reduce((s, e) => s + Number(e.amount), 0);
    const recurringItemsForMonth = (monthKey: string) => expensesByMonth
      .filter(e => e.date?.startsWith(monthKey) && e.template_id)
      .map((e: any) => ({
        description: e.description || e.category,
        amount: Number(e.amount),
        date: e.date,
        category: e.category,
        isRecurring: true,
      }));

    type Pre = {
      idx: number; isFuture: boolean; monthDate: Date; mStart: Date; mEnd: Date; mKey: string;
      income: number; confirmedIncome: number; expectedIncome: number;
      expenses: number; sessions: number;
      incomeItems: any[]; expenseItems: any[];
    };
    const pre: Pre[] = months.map((monthDate, idx) => {
      const isFuture = year > currentYear || (year === currentYear && idx > currentMonth);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      const mKey = format(monthDate, "yyyy-MM");

      if (isFuture) {
        const futureApts = (allAppointments as any[]).filter(a => {
          const d = new Date(a.scheduled_at);
          return d >= mStart && d <= mEnd && a.status !== "cancelled" && a.status !== "no-show";
        });
        const confirmedApts = futureApts.filter(a => a.status === "completed" && (a.payment_status === "paid_now" || a.payment_status === "paid_in_advance" || a.payment_status === "paid_from_prepayment"));
        const expectedApts = futureApts.filter(a => !confirmedApts.includes(a));
        const confirmedIncome = confirmedApts.reduce((s, a) => s + Number(a.price), 0);
        const expectedIncome = expectedApts.reduce((s, a) => s + Number(a.price), 0);
        const predictedIncome = confirmedIncome + expectedIncome;
        const predictedExpenses = getRecurringForMonth(mKey);

        return {
          idx, isFuture, monthDate, mStart, mEnd, mKey,
          income: predictedIncome, confirmedIncome, expectedIncome,
          expenses: predictedExpenses, sessions: futureApts.length,
          incomeItems: [
            ...confirmedApts.map(a => ({
              description: `${(a.clients as any)?.name || "Client"} — ${(a.services as any)?.name || "Service"}`,
              amount: Number(a.price), date: format(new Date(a.scheduled_at), "MMM d"),
              type: "confirmed" as const,
            })),
            ...expectedApts.map(a => ({
              description: `${(a.clients as any)?.name || "Client"} — ${(a.services as any)?.name || "Service"}`,
              amount: Number(a.price), date: format(new Date(a.scheduled_at), "MMM d"),
              type: "expected" as const,
            })),
          ],
          expenseItems: recurringItemsForMonth(mKey),
        };
      }

      const monthIncome = (allIncome as any[]).filter(i => (incomeDateOf(i) as string)?.startsWith(mKey));
      // Past/current months: include one-off expenses dated this month + recurring templates that apply to this month.
      const oneOffMonthExpenses = (allExpenses as any[]).filter(e => !e.is_template && !e.template_id && e.instance_status !== "cancelled" && e.date?.startsWith(mKey));
      const recurringMonthTotal = getRecurringForMonth(mKey);
      const totalIncome = monthIncome.reduce((s, i) => s + Number(i.amount), 0);
      const monthExpected = (expectedPayments as any[]).filter(ep => {
        const apt = ep.appointments as any;
        if (!apt?.scheduled_at) return false;
        return apt.scheduled_at.startsWith(mKey) && ep.status === "pending";
      });
      const expectedIncomeTotal = monthExpected.reduce((s, ep) => s + Number(ep.amount), 0);
      const totalExpenses = oneOffMonthExpenses.reduce((s, e) => s + Number(e.amount), 0) + recurringMonthTotal;
      const monthSessions = (allAppointments as any[]).filter(a => {
        const d = new Date(a.scheduled_at);
        return d >= mStart && d <= mEnd && a.status === "completed";
      }).length;
      return {
        idx, isFuture, monthDate, mStart, mEnd, mKey,
        income: totalIncome, confirmedIncome: totalIncome, expectedIncome: expectedIncomeTotal,
        expenses: totalExpenses, sessions: monthSessions,
        incomeItems: monthIncome.map((i: any) => ({
          description: i.description || (i.appointments?.clients?.name ? `${i.appointments.clients.name} — ${i.appointments.services?.name}` : "Manual"),
          amount: Number(i.amount), date: format(new Date(incomeDateOf(i)), "MMM d"),
          type: "confirmed" as const,
        })),
        expenseItems: [
          ...oneOffMonthExpenses.map((e: any) => ({
            description: e.description || e.category, amount: Number(e.amount),
            date: format(new Date(e.date), "MMM d"), category: e.category, isRecurring: false,
          })),
          ...recurringItemsForMonth(mKey),
        ],
      };
    });

    // Forecast-aware quarterly income map (actual + predicted future months in this year)
    const fcQuarterMap = new Map(quarterIncomeMap);
    for (const p of pre) {
      if (!p.isFuture) continue;
      const q = Math.floor(p.idx / 3) + 1;
      const key = `${year}-Q${q}`;
      fcQuarterMap.set(key, (fcQuarterMap.get(key) || 0) + p.income);
    }

    return pre.map(p => {
      const monthTaxes = calcTaxes(p.income, p.idx, year, fcQuarterMap);
      return {
        month: p.idx,
        label: format(p.monthDate, "MMMM"),
        shortLabel: format(p.monthDate, "MMM"),
        income: p.income,
        confirmedIncome: p.confirmedIncome,
        expectedIncome: p.expectedIncome,
        expenses: p.expenses,
        taxes: monthTaxes,
        net: p.income - monthTaxes - p.expenses,
        sessions: p.sessions,
        isFuture: p.isFuture,
        incomeItems: p.incomeItems,
        expenseItems: p.expenseItems,
      };
    });
  }, [year, allIncome, allExpenses, allAppointments, activeTaxes, expectedPayments, currentMonth, currentYear, incomeDateField]);

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

  // Tax breakdown lines for the currently drilled month
  const drillTaxLines = useMemo(() => {
    if (!drillMonth || activeTaxes.length === 0 || drillMonth.taxes <= 0) return [];
    const monthIdx = drillMonth.month;
    const isAccrualMonth = monthIdx % 3 === 0;
    let accruedQuarterKey: string | null = null;
    let qLabel = "";
    if (isAccrualMonth) {
      const prev = monthIdx - 1;
      if (prev < 0) {
        accruedQuarterKey = `${year - 1}-Q4`;
        qLabel = `Q4 ${year - 1}`;
      } else {
        const q = Math.floor(prev / 3) + 1;
        accruedQuarterKey = `${year}-Q${q}`;
        qLabel = `Q${q}`;
      }
    }
    const qMap = new Map<string, number>();
    for (const m of monthsData) {
      const q = Math.floor(m.month / 3) + 1;
      const key = `${year}-Q${q}`;
      qMap.set(key, (qMap.get(key) || 0) + m.income);
    }
    const lines: { id: string; label: string; amount: number; isForecast?: boolean }[] = [];
    for (const tax of activeTaxes as any[]) {
      if (!taxAppliesIn(tax, monthIdx, year, accruedQuarterKey)) continue;
      let amount = 0;
      let label = tax.tax_name;
      if (tax.frequency === "quarterly") {
        if (!accruedQuarterKey) continue;
        if (tax.tax_type === "percentage") {
          const qIncome = qMap.get(accruedQuarterKey) || 0;
          amount = qIncome * (Number(tax.tax_rate) / 100);
        } else {
          amount = Number(tax.fixed_amount);
        }
        label = `${tax.tax_name} — ${qLabel}`;
      } else {
        if (tax.tax_type === "percentage") {
          amount = drillMonth.income * (Number(tax.tax_rate) / 100);
        } else {
          amount = Number(tax.fixed_amount);
        }
      }
      amount = Math.round(amount * 100) / 100;
      if (amount === 0) continue;
      lines.push({ id: tax.id, label, amount, isForecast: drillMonth.isFuture });
    }
    return lines;
  }, [drillMonth, activeTaxes, monthsData, year]);

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
      <MonthlyDetailsModal
        open={!!drillMonth}
        onOpenChange={o => !o && setDrillMonth(null)}
        data={drillMonth}
        year={year}
        taxLines={drillTaxLines}
        fmt={fmt}
        t={t}
      />
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
