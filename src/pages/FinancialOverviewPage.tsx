import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAllIncome, useAllExpenses, useAppointments, useTaxSettings, useExpectedPayments, useProfile } from "@/hooks/useData";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, isBefore, isAfter, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign,
  BarChart3, Calendar, ArrowUpRight, ArrowDownRight, Eye, X, Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart, ReferenceLine,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MonthlyDetailsModal } from "@/components/MonthlyDetailsModal";
import { getDateLocale } from "@/lib/dateLocale";
import { FinanceSubnav } from "@/components/finance/FinanceSubnav";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  useEffect(() => { import("@/lib/analytics").then(({ track }) => track("finances_opened")); }, []);
  const { t, lang } = useLanguage();
  const dateLocale = useMemo(() => getDateLocale(lang), [lang]);
  const capitalize = (v: string) => (v ? v.charAt(0).toLocaleUpperCase(lang) + v.slice(1) : v);
  const { symbol: cs } = useCurrency();
  const [year, setYear] = useState(new Date().getFullYear());
  const [drillMonth, setDrillMonth] = useState<MonthData | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "chart">("chart");
  const [scope, setScope] = useState<"year" | "month">("year");
  const [selMonth, setSelMonth] = useState(new Date().getMonth());
  const [explainOpen, setExplainOpen] = useState(false);
  const recalculatedAt = useMemo(() => new Date(), []);

  const { data: allIncome = [] } = useAllIncome();
  const { data: allExpenses = [] } = useAllExpenses();
  
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
              amount: Number(a.price), date: format(new Date(a.scheduled_at), "MMM d", { locale: dateLocale }),
              type: "confirmed" as const,
            })),
            ...expectedApts.map(a => ({
              description: `${(a.clients as any)?.name || "Client"} — ${(a.services as any)?.name || "Service"}`,
              amount: Number(a.price), date: format(new Date(a.scheduled_at), "MMM d", { locale: dateLocale }),
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
          amount: Number(i.amount), date: format(new Date(incomeDateOf(i)), "MMM d", { locale: dateLocale }),
          type: "confirmed" as const,
        })),
        expenseItems: [
          ...oneOffMonthExpenses.map((e: any) => ({
            description: e.description || e.category, amount: Number(e.amount),
            date: format(new Date(e.date), "MMM d", { locale: dateLocale }), category: e.category, isRecurring: false,
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
        label: capitalize(format(p.monthDate, "LLLL", { locale: dateLocale })),
        shortLabel: capitalize(format(p.monthDate, "LLL", { locale: dateLocale })),
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
  }, [year, allIncome, allExpenses, allAppointments, activeTaxes, expectedPayments, currentMonth, currentYear, incomeDateField, dateLocale, lang]);

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

  const scopedMonths = scope === "year" ? monthsData : monthsData.filter(m => m.month === selMonth);
  const scopeConfirmed = scopedMonths.reduce((s2, m) => s2 + m.confirmedIncome, 0);
  const scopeExpected = scopedMonths.reduce((s2, m) => s2 + m.expectedIncome, 0);
  const scopePlannedExpenses = scopedMonths.reduce((s2, m) => s2 + m.expenses, 0);
  const scopeTaxes = scopedMonths.reduce((s2, m) => s2 + m.taxes, 0);
  const scopeSessions = scopedMonths.reduce((s2, m) => s2 + m.sessions, 0);
  const forecastNet = scopeConfirmed + scopeExpected - scopePlannedExpenses - scopeTaxes;
  const periodEndLabel = scope === "year"
    ? format(new Date(year, 11, 31), "d MMMM yyyy", { locale: dateLocale })
    : format(endOfMonth(new Date(year, selMonth, 1)), "d MMMM yyyy", { locale: dateLocale });

  const chartData = scopedMonths.map(m => ({
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

  // ---- Forecast-only derivations (Financial Overview = what's expected next) ----
  const fcMonths = scopedMonths.filter(m => m.isFuture);
  const actualMonths = scopedMonths.filter(m => !m.isFuture);
  const expectedIncome = scopedMonths.reduce((s, m) => s + (m.isFuture ? m.income : m.expectedIncome), 0);
  const plannedExpenses = fcMonths.reduce((s, m) => s + m.expenses, 0);
  const forecastTaxes = fcMonths.reduce((s, m) => s + m.taxes, 0);
  const currentNet = actualMonths.reduce((s, m) => s + m.net, 0);
  const forecastNetTotal = currentNet + expectedIncome - plannedExpenses - forecastTaxes;
  const forecastedSessions = scopedMonths.reduce((s, m) => s + m.sessions, 0);
  const fcCount = Math.max(fcMonths.length, 1);
  const avgExpectedIncome = expectedIncome / fcCount;
  const avgPlannedExpenses = plannedExpenses / fcCount;
  const asOfLabel = format(now, "MMM d", { locale: dateLocale });
  const dividerLabel = scopedMonths.find(m => m.isFuture)?.shortLabel ?? null;
  const lastActualLabel = [...scopedMonths].reverse().find(m => !m.isFuture)?.shortLabel ?? null;

  const overviewData = scopedMonths.map(m => ({
    name: m.shortLabel,
    income: m.income,
    outflow: m.expenses + m.taxes,
    net: m.net,
  }));

  return (
    <AppLayout>
      <div className="space-y-5">
        <FinanceSubnav />

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("financial.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("fo.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setYear(y => y - 1)}
                className="h-9 w-9 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label={String(year - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xl font-bold text-foreground min-w-[64px] text-center">{year}</span>
              <button
                onClick={() => setYear(y => y + 1)}
                className="h-9 w-9 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label={String(year + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="inline-flex rounded-full bg-muted p-1">
              {(["month", "year"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setScope(v)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                    scope === v ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v === "month" ? t("fo.viewMonth") : t("fo.viewYear")}
                </button>
              ))}
            </div>
            {scope === "month" && (
              <select
                value={selMonth}
                onChange={e => setSelMonth(Number(e.target.value))}
                className="h-9 rounded-xl border border-border bg-card px-2 text-sm text-foreground"
              >
                {monthsData.map(m => (
                  <option key={m.month} value={m.month}>{m.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* KPI row — forecast only */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            icon={TrendingUp}
            tone="primary"
            label={t("fo.expectedIncome")}
            value={fmt(expectedIncome)}
            hint={t("fo.desc.expectedIncome")}
          />
          <KpiCard
            icon={TrendingDown}
            tone="destructive"
            label={t("fo.plannedExpenses")}
            value={fmt(plannedExpenses)}
            hint={t("fo.desc.plannedExpenses")}
          />
          <KpiCard
            icon={Percent}
            tone="destructive"
            label={t("fo.forecastTaxes")}
            value={fmt(forecastTaxes)}
            hint={t("fo.desc.forecastTaxes")}
          />
          <KpiCard
            icon={TrendingUp}
            tone={forecastNetTotal >= 0 ? "success" : "destructive"}
            label={t("fo.forecastNet")}
            value={`${forecastNetTotal < 0 ? "-" : ""}${fmt(forecastNetTotal)}`}
            hint={t("fo.desc.forecastNet")}
          />
        </div>

        {/* Forecast bridge */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h2 className="text-base font-bold text-foreground mb-6">{t("fo.expectedBy", { date: periodEndLabel })}</h2>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <BridgeItem label={t("fo.currentNetResult")} value={`${currentNet < 0 ? "-" : ""}${fmt(currentNet)}`} hint={t("fo.actualAsOf", { date: asOfLabel })} />
            <BridgeOp op="+" />
            <BridgeItem label={`+ ${t("fo.expectedIncome")}`} value={`+${fmt(expectedIncome)}`} tone="text-primary" />
            <BridgeOp op="−" />
            <BridgeItem label={`− ${t("fo.plannedExpenses")}`} value={`−${fmt(plannedExpenses)}`} tone="text-destructive" />
            <BridgeOp op="−" />
            <BridgeItem label={`− ${t("fo.forecastTaxes")}`} value={`−${fmt(forecastTaxes)}`} tone="text-destructive" />
            <BridgeOp op="=" />
            <BridgeItem label={`= ${t("fo.forecastNet")}`} value={`${forecastNetTotal < 0 ? "-" : ""}${fmt(forecastNetTotal)}`} tone={forecastNetTotal >= 0 ? "text-success" : "text-destructive"} />
          </div>
        </div>

        {/* Supporting metrics */}
        <div className="flex flex-wrap gap-3">
          <MiniStat dot="bg-muted-foreground" label={t("fo.forecastSessions")} value={String(forecastedSessions)} />
          <MiniStat dot="bg-primary" label={t("fo.avgMonthlyNet")} value={`${avgMonthlyNet < 0 ? "-" : ""}${fmt(avgMonthlyNet)}`} />
          <MiniStat dot="bg-primary" label={t("fo.avgExpectedIncome")} value={fmt(avgExpectedIncome)} />
          <MiniStat dot="bg-destructive" label={t("fo.avgPlannedExpenses")} value={fmt(avgPlannedExpenses)} />
        </div>


        {/* Yearly overview */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-6 gap-3">
            <h2 className="text-base font-bold text-foreground">{t("financial.yearlyChart")}</h2>
            <div className="inline-flex gap-2">
              <button
                onClick={() => setViewMode("chart")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                  viewMode === "chart" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                <BarChart3 className="h-4 w-4" /> {t("financial.chart")}
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                  viewMode === "table" ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                <Calendar className="h-4 w-4" /> {t("financial.table")}
              </button>
            </div>
          </div>

          {viewMode === "chart" ? (
            <>
              <div className="flex items-center gap-2 mb-1 text-[11px] font-medium">
                <span className="rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-success">{t("fo.actual")}</span>
                <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-muted-foreground">{t("financial.forecast")}</span>
              </div>
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={overviewData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={72}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={v => `${v < 0 ? "-" : ""}${cs}${Math.abs(Number(v)).toLocaleString("en")}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number, name: string) => [`${value < 0 ? "-" : ""}${cs}${Math.abs(value).toFixed(0)}`, name]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                    {dividerLabel && lastActualLabel && (
                      <ReferenceLine x={lastActualLabel} stroke="hsl(var(--border))" strokeWidth={1} />
                    )}
                    <Bar dataKey="income" name={t("fo.legendIncome")} fill="hsl(var(--success))" radius={[4, 4, 0, 0]} barSize={18} />
                    <Bar dataKey="outflow" name={t("fo.legendExpenses")} fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} barSize={18} />
                    <Line type="monotone" dataKey="net" name={t("fo.legendNet")} stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--card))", strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <MonthlyTable months={scopedMonths} onDrill={setDrillMonth} fmt={fmt} t={t} currentMonth={year === currentYear ? currentMonth : -1} />
          )}
        </div>

        {/* Forecast explanation */}
        <Collapsible open={explainOpen} onOpenChange={setExplainOpen}>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
              <span className="font-semibold text-foreground">{t("fo.howCalculated")}</span>
              <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", explainOpen && "rotate-90")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-2 text-sm text-muted-foreground">
              <p>{t("fo.explainSessions")}</p>
              <p>{t("fo.explainPayments")}</p>
              <p>{t("fo.explainExpenses")}</p>
              <p>{t("fo.explainTaxes")}</p>
              <p className="text-xs">{t("fo.lastRecalc", { time: format(recalculatedAt, "d MMM yyyy HH:mm", { locale: dateLocale }) })}</p>
              <button
                onClick={() => setDrillMonth(scopedMonths[0] ?? monthsData[currentMonth] ?? null)}
                className="text-xs font-semibold text-primary inline-flex items-center gap-1.5 hover:opacity-80"
              >
                {t("fo.viewIncluded")} <Eye className="h-3.5 w-3.5" />
              </button>
            </CollapsibleContent>
          </div>
        </Collapsible>
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

function KpiCard({ icon: Icon, label, value, hint, tone }: { icon: any; label: string; value: string; hint: string; tone: "primary" | "success" | "destructive" }) {
  const toneMap = {
    primary: { bg: "bg-primary/10", fg: "text-primary" },
    success: { bg: "bg-success/10", fg: "text-success" },
    destructive: { bg: "bg-destructive/10", fg: "text-destructive" },
  } as const;
  const c = toneMap[tone];
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
      <div className="flex items-start gap-4">
        <span className={cn("h-11 w-11 shrink-0 rounded-full flex items-center justify-center", c.bg)}>
          <Icon className={cn("h-5 w-5", c.fg)} />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={cn("text-2xl font-bold mt-0.5", c.fg)}>{value}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">{hint}</p>
    </div>
  );
}

function BridgeItem({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="flex-1 min-w-[150px] text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold mt-1", tone || "text-foreground")}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function BridgeOp({ op }: { op: string }) {
  return (
    <div className="hidden lg:flex items-center pt-6">
      <span className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">{op}</span>
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

function MiniStat({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}
