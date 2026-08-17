import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  useAllIncome, useAllExpenses, useAppointments, useWorkingSchedule, useDaysOff, useProfile,
} from "@/hooks/useData";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";
import { calculateCapacity } from "@/lib/capacity";
import { FinanceSubnav } from "@/components/finance/FinanceSubnav";
import {
  ChevronLeft, ChevronRight, CalendarDays, Activity, Percent, TrendingUp,
  ArrowDownCircle, ArrowUpCircle, BarChart3, LineChart as LineChartIcon,
  Tag, Users, PieChart as PieChartIcon, Sprout,
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, LabelList,
} from "recharts";

type Scope = "month" | "year";

const FIXED_HINTS = ["rent", "subscription", "software", "tool", "insurance", "admin", "оренда", "подписк", "підписк"];

export default function CostEfficiencyPage() {
  useEffect(() => { import("@/lib/analytics").then(({ track }) => track("finances_opened")); }, []);
  const { t, lang } = useLanguage();
  const dateLocale = useMemo(() => getDateLocale(lang), [lang]);
  const { symbol: cs } = useCurrency();
  const fmt = (n: number) => `${cs}${Math.round(n).toLocaleString()}`;

  const [year, setYear] = useState(new Date().getFullYear());
  const [scope, setScope] = useState<Scope>("year");
  const [selMonth, setSelMonth] = useState(new Date().getMonth());

  const { data: allExpenses = [] } = useAllExpenses();
  const { data: allIncome = [] } = useAllIncome();
  const { data: allAppointments = [] } = useAppointments();
  const { data: schedule = [] } = useWorkingSchedule();
  const { data: daysOff = [] } = useDaysOff();
  const { data: profile } = useProfile();

  const monthLabels = useMemo(
    () => Array.from({ length: 12 }, (_, i) => format(new Date(year, i, 1), "LLL", { locale: dateLocale })),
    [year, dateLocale],
  );
  const monthLongLabels = useMemo(
    () => Array.from({ length: 12 }, (_, i) => format(new Date(year, i, 1), "LLLL", { locale: dateLocale })),
    [year, dateLocale],
  );

  const isFixed = (e: any) =>
    Boolean(e.is_recurring || e.template_id || e.recurrence_type) ||
    FIXED_HINTS.some(h => String(e.category || "").toLowerCase().includes(h));

  const realExpenses = useMemo(
    () => (allExpenses as any[]).filter(e => !e.is_template && e.instance_status !== "cancelled"),
    [allExpenses],
  );

  const expensesOfYear = (y: number) => realExpenses.filter(e => new Date(e.date).getFullYear() === y);

  /** Per-month aggregation for the selected year. */
  const months = useMemo(() => {
    const rows = Array.from({ length: 12 }, (_, m) => ({
      month: m,
      label: monthLabels[m],
      longLabel: monthLongLabels[m],
      total: 0,
      fixed: 0,
      variable: 0,
      sessions: 0,
      income: 0,
    }));
    for (const e of expensesOfYear(year)) {
      const m = new Date(e.date).getMonth();
      const amt = Number(e.amount || 0);
      rows[m].total += amt;
      if (isFixed(e)) rows[m].fixed += amt; else rows[m].variable += amt;
    }
    for (const a of allAppointments as any[]) {
      const d = new Date(a.scheduled_at);
      if (d.getFullYear() !== year) continue;
      if (a.status === "cancelled") continue;
      rows[d.getMonth()].sessions += 1;
    }
    for (const i of allIncome as any[]) {
      const d = new Date(i.session_date || i.date);
      if (d.getFullYear() !== year) continue;
      rows[d.getMonth()].income += Number(i.amount || 0);
    }
    return rows;
  }, [realExpenses, allAppointments, allIncome, year, monthLabels, monthLongLabels]);

  const scoped = scope === "year" ? months : [months[selMonth]];
  const monthCount = Math.max(scoped.length, 1);

  const totalExpenses = scoped.reduce((s, m) => s + m.total, 0);
  const fixedTotal = scoped.reduce((s, m) => s + m.fixed, 0);
  const variableTotal = scoped.reduce((s, m) => s + m.variable, 0);
  const sessions = scoped.reduce((s, m) => s + m.sessions, 0);
  const income = scoped.reduce((s, m) => s + m.income, 0);

  const monthlyFixed = fixedTotal / monthCount;
  const variablePerSession = sessions > 0 ? variableTotal / sessions : 0;
  const costPerSession = sessions > 0 ? totalExpenses / sessions : 0;
  const avgPrice = sessions > 0 ? income / sessions : 0;

  // Previous comparable period expenses
  const prevExpenses = useMemo(() => {
    if (scope === "year") {
      return expensesOfYear(year - 1).reduce((s, e) => s + Number(e.amount || 0), 0);
    }
    const prevM = selMonth === 0 ? 11 : selMonth - 1;
    const prevY = selMonth === 0 ? year - 1 : year;
    return realExpenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === prevY && d.getMonth() === prevM;
      })
      .reduce((s, e) => s + Number(e.amount || 0), 0);
  }, [realExpenses, scope, year, selMonth]);

  const expenseGrowth = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;

  // Monthly capacity from working schedule
  const capacity = useMemo(() => {
    const res = calculateCapacity(
      schedule as any[],
      daysOff as any[],
      (profile as any)?.default_session_duration || 60,
      new Date(year, scope === "month" ? selMonth : new Date().getMonth(), 1),
    );
    return Math.max(res.totalMonthlyCapacity, 1);
  }, [schedule, daysOff, profile, year, scope, selMonth]);

  const contribution = avgPrice - variablePerSession;
  const breakEvenOccupancy = contribution > 0
    ? Math.min((monthlyFixed / contribution) / capacity * 100, 100)
    : 0;

  // Summary card
  const monthsWithCost = months.filter(m => m.total > 0);
  const lowest = monthsWithCost.length ? monthsWithCost.reduce((a, b) => (b.total < a.total ? b : a)) : null;
  const highest = monthsWithCost.length ? monthsWithCost.reduce((a, b) => (b.total > a.total ? b : a)) : null;
  const cpsValues = months.filter(m => m.sessions > 0).map(m => m.total / m.sessions);
  const cpsMin = cpsValues.length ? Math.min(...cpsValues) : 0;
  const cpsMax = cpsValues.length ? Math.max(...cpsValues) : 0;

  // Cost pressure = expenses share of revenue
  const costShare = income > 0 ? (totalExpenses / income) * 100 : 0;
  const pressure = costShare < 40 ? "low" : costShare < 60 ? "moderate" : costShare < 80 ? "high" : "critical";
  const pressureValue = Math.min(costShare, 100);

  // Expense breakdown by category
  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of scoped.flatMap(m =>
      expensesOfYear(year).filter(x => new Date(x.date).getMonth() === m.month),
    )) {
      const key = String(e.category || t("category.other") || "Other");
      map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [realExpenses, scoped, year]);

  const topCategory = breakdown[0] || null;
  const topCategoryShare = topCategory && totalExpenses > 0 ? (topCategory.value / totalExpenses) * 100 : 0;

  const dynamicsData = months.map(m => ({
    name: m.label,
    total: Math.round(m.total),
    cps: m.sessions > 0 ? Math.round(m.total / m.sessions) : 0,
  }));

  // Cost per session vs occupancy
  const occupancyData = Array.from({ length: 10 }, (_, i) => {
    const occ = (i + 1) * 10;
    const sess = Math.max((capacity * occ) / 100, 1);
    return {
      name: `${occ}%`,
      cps: Math.round(monthlyFixed / sess + variablePerSession),
      occupancy: occ,
    };
  });

  const recommendedPrice = costPerSession * 1.8;
  const idealSessions = Math.round(capacity * 0.6);
  const savings = breakdown
    .filter(b => !/rent|оренда|czynsz|loyer/i.test(b.name))
    .slice(0, 2)
    .reduce((s, b) => s + b.value, 0) * 0.2 / monthCount;

  return (
    <AppLayout>
      <div className="space-y-5">
        <FinanceSubnav />

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("ce.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("ce.subtitle")}</p>
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
                {months.map(m => (
                  <option key={m.month} value={m.month}>{m.longLabel}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Kpi icon={CalendarDays} tone="primary" label={t("ce.fixedCosts")} value={fmt(monthlyFixed)} hint={t("ce.fixedCosts.hint")} />
          <Kpi icon={Activity} tone="primary" label={t("ce.variablePerSession")} value={fmt(variablePerSession)} hint={t("ce.variablePerSession.hint")} />
          <Kpi icon={Percent} tone="primary" label={t("ce.breakEvenOccupancy")} value={`${Math.round(breakEvenOccupancy)}%`} hint={t("ce.breakEvenOccupancy.hint")} />
          <Kpi
            icon={TrendingUp}
            tone={expenseGrowth > 0 ? "destructive" : "success"}
            label={t("ce.expenseGrowth")}
            value={`${expenseGrowth > 0 ? "+" : ""}${expenseGrowth.toFixed(1)}%`}
            hint={t("ce.expenseGrowth.hint")}
          />
        </div>

        {/* Cost dynamics + summary + gauge */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)] gap-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <h2 className="text-base font-bold text-foreground mb-4">{t("ce.costDynamics")}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dynamicsData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${cs}${v}`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${cs}${v}`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: any, n: any) => [`${cs}${Number(v).toLocaleString()}`, n]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line yAxisId="left" type="monotone" dataKey="total" name={t("ce.legendTotalExpenses")} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="cps" name={t("ce.legendCostPerSession")} stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-2xl border border-border p-4 space-y-3 self-start">
                <SummaryRow
                  icon={ArrowDownCircle}
                  tone="success"
                  label={t("ce.lowestCostMonth")}
                  sub={lowest?.longLabel ?? "—"}
                  value={lowest ? fmt(lowest.total) : "—"}
                  valueTone="text-success"
                />
                <SummaryRow
                  icon={ArrowUpCircle}
                  tone="destructive"
                  label={t("ce.highestCostMonth")}
                  sub={highest?.longLabel ?? "—"}
                  value={highest ? fmt(highest.total) : "—"}
                  valueTone="text-destructive"
                />
                <SummaryRow
                  icon={BarChart3}
                  tone="primary"
                  label={t("ce.cpsRange")}
                  value={cpsValues.length ? `${fmt(cpsMin)}–${fmt(cpsMax)}` : "—"}
                  valueTone="text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Cost pressure gauge */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col">
            <h2 className="text-base font-bold text-foreground">{t("ce.costPressure")}</h2>
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <Gauge value={pressureValue} />
              <p className={cn(
                "text-2xl font-bold",
                pressure === "low" || pressure === "moderate" ? "text-primary" : "text-destructive",
              )}>
                {t(`ce.pressure.${pressure}`)}
              </p>
              <p className="text-xs text-muted-foreground text-center">{t("ce.costPressure.hint")}</p>
            </div>
          </div>
        </div>

        {/* Breakdown + occupancy */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <h2 className="text-base font-bold text-foreground mb-4">{t("ce.expenseBreakdown")}</h2>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown} margin={{ top: 20, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${cs}${v}`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any) => [
                      `${cs}${Number(v).toLocaleString()} (${totalExpenses > 0 ? Math.round((Number(v) / totalExpenses) * 100) : 0}%)`,
                      t("ce.legendTotalExpenses"),
                    ]}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={54}>
                    <LabelList dataKey="value" position="top" formatter={(v: any) => fmt(Number(v))} style={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <h2 className="text-base font-bold text-foreground mb-4">{t("ce.cpsVsOccupancy")}</h2>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={occupancyData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${cs}${v}`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey="cps" name={t("ce.legendCostPerSession")} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="occupancy" name={t("ce.legendOccupancy")} stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Efficiency insights */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h2 className="text-base font-bold text-foreground mb-4">{t("ce.efficiencyInsights")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-3 font-medium"></th>
                  <th className="text-left py-2 px-3 font-medium">{t("ce.col.value")}</th>
                  <th className="text-left py-2 px-3 font-medium">{t("ce.col.insight")}</th>
                </tr>
              </thead>
              <tbody>
                <InsightRow
                  icon={LineChartIcon}
                  label={t("ce.insight.currentCps")}
                  value={fmt(costPerSession)}
                  valueTone="text-success"
                  insight={t("ce.insight.currentCps.text")}
                />
                <InsightRow
                  icon={Tag}
                  label={t("ce.insight.minPrice")}
                  value={fmt(recommendedPrice)}
                  insight={t("ce.insight.minPrice.text")}
                />
                <InsightRow
                  icon={Users}
                  label={t("ce.insight.idealSessions")}
                  value={String(idealSessions)}
                  insight={t("ce.insight.idealSessions.text")}
                />
                <InsightRow
                  icon={PieChartIcon}
                  label={t("ce.insight.topCategory")}
                  value={topCategory ? `${topCategory.name} (${fmt(topCategory.value)})` : "—"}
                  insight={t("ce.insight.topCategory.text", { pct: Math.round(topCategoryShare) })}
                />
                <InsightRow
                  icon={Sprout}
                  label={t("ce.insight.savings")}
                  value={`${fmt(savings)} / ${t("ce.perMonth")}`}
                  valueTone="text-success"
                  insight={t("ce.insight.savings.text")}
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Kpi({ icon: Icon, label, value, hint, tone }: { icon: any; label: string; value: string; hint: string; tone: "primary" | "success" | "destructive" }) {
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
          <p className={cn("text-2xl font-bold mt-0.5", tone === "primary" ? "text-foreground" : c.fg)}>{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, tone, label, sub, value, valueTone }: {
  icon: any; tone: "primary" | "success" | "destructive"; label: string; sub?: string; value: string; valueTone: string;
}) {
  const bg = tone === "success" ? "bg-success/10" : tone === "destructive" ? "bg-destructive/10" : "bg-primary/10";
  const fg = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-primary";
  return (
    <div className="flex items-center gap-3">
      <span className={cn("h-9 w-9 shrink-0 rounded-full flex items-center justify-center", bg)}>
        <Icon className={cn("h-4 w-4", fg)} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        {sub && <p className="text-sm font-semibold text-foreground truncate">{sub}</p>}
      </div>
      <span className={cn("text-sm font-bold whitespace-nowrap", valueTone)}>{value}</span>
    </div>
  );
}

function InsightRow({ icon: Icon, label, value, valueTone, insight }: {
  icon: any; label: string; value: string; valueTone?: string; insight: string;
}) {
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-3 pr-3">
        <span className="inline-flex items-center gap-3">
          <span className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </span>
          <span className="text-foreground font-medium">{label}</span>
        </span>
      </td>
      <td className={cn("py-3 px-3 font-bold", valueTone || "text-foreground")}>{value}</td>
      <td className="py-3 px-3 text-muted-foreground">{insight}</td>
    </tr>
  );
}

/** Semi-circular cost pressure gauge (0-100). */
function Gauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const angle = -90 + (clamped / 100) * 180;
  const r = 70;
  const cx = 100;
  const cy = 90;

  const arc = (from: number, to: number, color: string) => {
    const p = (pct: number) => {
      const a = (-180 + (pct / 100) * 180) * (Math.PI / 180);
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };
    const [x1, y1] = p(from);
    const [x2, y2] = p(to);
    return <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`} stroke={color} strokeWidth={14} fill="none" strokeLinecap="butt" />;
  };

  return (
    <svg viewBox="0 0 200 110" className="w-[220px] max-w-full">
      {arc(0, 39, "hsl(var(--success))")}
      {arc(40, 59, "hsl(var(--warning))")}
      {arc(60, 79, "hsl(var(--primary))")}
      {arc(80, 100, "hsl(var(--destructive))")}
      <g transform={`rotate(${angle} ${cx} ${cy})`}>
        <line x1={cx} y1={cy} x2={cx} y2={cy - r + 8} stroke="hsl(var(--foreground))" strokeWidth={3} strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r={5} fill="hsl(var(--foreground))" />
    </svg>
  );
}
