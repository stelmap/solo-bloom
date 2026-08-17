import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { FinanceSubnav } from "@/components/finance/FinanceSubnav";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import {
  useAllIncome, useAllExpenses, useAppointments, useClients, useExpectedPayments, useProfile,
} from "@/hooks/useData";
import { cn } from "@/lib/utils";
import {
  ArrowRight, ChevronRight, TrendingUp, TrendingDown, Wallet, Receipt,
  Clock, CalendarDays, XCircle, Users, CheckCircle2, Activity, Lock as LockIcon,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

type Period = "today" | "month" | "all";

const PAID_STATUSES = new Set(["paid_now", "paid_in_advance", "paid_from_prepayment"]);
const BILLED_CANCEL_STATUSES = new Set([
  "paid_now", "paid_in_advance", "paid_from_prepayment", "waiting_for_payment",
  "partially_paid", "partially_paid_from_prepayment",
]);

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const DONUT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--muted-foreground))",
];

export default function PracticeOverviewPage() {
  const { t, lang } = useLanguage();
  const { symbol: cs } = useCurrency();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("month");
  const [trendRange, setTrendRange] = useState<1 | 3 | 6>(6);

  useEffect(() => { import("@/lib/analytics").then(({ track }) => track("finances_opened")); }, []);

  const { data: allIncome = [], isLoading: l1 } = useAllIncome();
  const { data: allExpenses = [], isLoading: l2 } = useAllExpenses();
  const { data: appointments = [], isLoading: l3 } = useAppointments();
  const { data: clients = [] } = useClients();
  const { data: expectedPayments = [] } = useExpectedPayments();
  const { data: profile } = useProfile();
  const loading = l1 || l2 || l3;

  const incomeDateOf = (i: any) =>
    ((profile as any)?.income_recognition_method === "session_date" ? i.session_date : i.date) || i.date;

  const now = new Date();

  /** Current + previous comparable range for the selected period. */
  const ranges = useMemo(() => {
    if (period === "today") {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { from: startOfDay(now), to: endOfDay(now), prevFrom: startOfDay(y), prevTo: endOfDay(y) };
    }
    if (period === "month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const dayCount = now.getDate();
      const prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevTo = endOfDay(new Date(now.getFullYear(), now.getMonth() - 1, dayCount));
      return { from, to: endOfDay(now), prevFrom, prevTo };
    }
    return { from: new Date(1970, 0, 1), to: endOfDay(now), prevFrom: null, prevTo: null };
  }, [period, now.getTime()]);

  const inRange = (d: Date | null, from: Date, to: Date) => !!d && d >= from && d <= to;

  const sumIncome = (from: Date, to: Date) =>
    (allIncome as any[]).reduce((s, i) => {
      const raw = incomeDateOf(i);
      if (!raw) return s;
      const d = new Date(raw);
      return inRange(d, from, to) ? s + Number(i.amount || 0) : s;
    }, 0);

  const activeExpenses = useMemo(
    () => (allExpenses as any[]).filter((e) => !e.is_template && e.instance_status !== "cancelled"),
    [allExpenses],
  );

  const sumExpenses = (from: Date, to: Date) =>
    activeExpenses.reduce((s, e) => {
      if (!e.date) return s;
      const d = new Date(`${e.date}T12:00:00`);
      return inRange(d, from, to) ? s + Number(e.amount || 0) : s;
    }, 0);

  const revenue = sumIncome(ranges.from, ranges.to);
  const expenses = sumExpenses(ranges.from, ranges.to);
  const net = revenue - expenses;

  const prevRevenue = ranges.prevFrom ? sumIncome(ranges.prevFrom, ranges.prevTo!) : null;
  const prevExpenses = ranges.prevFrom ? sumExpenses(ranges.prevFrom, ranges.prevTo!) : null;
  const prevNet = prevRevenue !== null && prevExpenses !== null ? prevRevenue - prevExpenses : null;

  const pct = (curr: number, prev: number | null) => {
    if (prev === null || prev === 0) return null;
    return Math.round(((curr - prev) / Math.abs(prev)) * 100);
  };

  /* ── Practice metrics for the selected period ───────────────────── */
  const periodApts = useMemo(
    () => (appointments as any[]).filter((a) => {
      const d = new Date(a.scheduled_at);
      return inRange(d, ranges.from, ranges.to);
    }),
    [appointments, ranges],
  );

  const metrics = useMemo(() => {
    let completed = 0, cancelled = 0, paidCompletedCount = 0, paidCompletedRevenue = 0;
    const activeIds = new Set<string>();
    for (const a of periodApts) {
      if (a.client_id) activeIds.add(a.client_id);
      if (a.status === "cancelled" || a.status === "no-show") { cancelled++; continue; }
      if (a.status === "completed") {
        completed++;
        if (PAID_STATUSES.has(a.payment_status)) {
          paidCompletedCount++;
          paidCompletedRevenue += Number(a.price || 0);
        }
      }
    }
    const scheduled = periodApts.length;

    // Average therapy duration (months) between first and last completed session
    // for clients active in the period.
    const spans: number[] = [];
    for (const id of activeIds) {
      const dates = (appointments as any[])
        .filter((a) => a.client_id === id && a.status === "completed")
        .map((a) => new Date(a.scheduled_at).getTime());
      if (dates.length < 2) continue;
      spans.push((Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24 * 30.44));
    }
    const avgTherapyMonths = spans.length ? spans.reduce((s, v) => s + v, 0) / spans.length : 0;

    return {
      completed, cancelled, scheduled,
      activeClients: activeIds.size,
      completionRate: scheduled ? Math.round((completed / scheduled) * 100) : 0,
      cancellationRate: scheduled ? Math.round((cancelled / scheduled) * 100) : 0,
      avgRevenuePerSession: paidCompletedCount ? Math.round(paidCompletedRevenue / paidCompletedCount) : 0,
      avgTherapyMonths,
    };
  }, [periodApts, appointments]);

  /* ── Health trend (monthly series) ──────────────────────────────── */
  const trendData = useMemo(() => {
    const out: { name: string; active: number; completed: number; cancelled: number }[] = [];
    for (let i = trendRange - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKeyOf(d);
      const ids = new Set<string>();
      let completed = 0, cancelled = 0;
      for (const a of appointments as any[]) {
        const ad = new Date(a.scheduled_at);
        if (monthKeyOf(ad) !== key) continue;
        if (a.client_id) ids.add(a.client_id);
        if (a.status === "completed") completed++;
        else if (a.status === "cancelled" || a.status === "no-show") cancelled++;
      }
      let label = key;
      try { label = new Intl.DateTimeFormat(lang, { month: "short" }).format(d); } catch { /* noop */ }
      out.push({ name: label, active: ids.size, completed, cancelled });
    }
    return out;
  }, [appointments, trendRange, lang, now.getMonth()]);

  /* ── Needs attention ────────────────────────────────────────────── */
  const totalDebt = (expectedPayments as any[]).reduce((s, ep) => s + Number(ep.amount || 0), 0);
  const unpaidCount = (expectedPayments as any[]).length;

  const clientsWithoutNext = useMemo(() => {
    const future = new Set(
      (appointments as any[])
        .filter((a) => new Date(a.scheduled_at) > now && a.status !== "cancelled" && a.client_id)
        .map((a) => a.client_id),
    );
    return (clients as any[]).filter((c) => c.status !== "archived" && !future.has(c.id)).length;
  }, [appointments, clients]);

  const lostIncome = useMemo(
    () => periodApts
      .filter((a) => (a.status === "cancelled" || a.status === "no-show") && !BILLED_CANCEL_STATUSES.has(a.payment_status))
      .reduce((s, a) => s + Number(a.price || 0), 0),
    [periodApts],
  );

  const attention = [
    {
      key: "debt", icon: Receipt, value: `${cs}${totalDebt.toLocaleString()}`, show: totalDebt > 0,
      label: t("po.totalDebt"), sub: t("po.totalDebtSub"),
      onClick: () => navigate("/finances/income?tab=pending&range=all"),
      tone: "danger" as const,
    },
    {
      key: "unpaid", icon: Clock, value: String(unpaidCount), show: unpaidCount > 0,
      label: t("po.unpaidAppointments"), sub: t("po.unpaidAppointmentsSub"),
      onClick: () => navigate("/finances/income?tab=pending&range=all"),
      tone: "warning" as const,
    },
    {
      key: "noNext", icon: CalendarDays, value: String(clientsWithoutNext), show: clientsWithoutNext > 0,
      label: t("po.clientsWithoutNext"), sub: t("po.clientsWithoutNextSub"),
      onClick: () => navigate("/clients?filter=withoutNextSession"),
      tone: "info" as const,
    },
    {
      key: "lost", icon: XCircle, value: `${cs}${lostIncome.toLocaleString()}`, show: lostIncome > 0,
      label: t("po.lostIncome"), sub: t("po.lostIncomeSub"),
      onClick: () => navigate("/calendar"),
      tone: "muted" as const,
    },
  ].filter((a) => a.show);

  /* ── Revenue by client ──────────────────────────────────────────── */
  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients as any[]) m.set(c.id, c.name);
    return m;
  }, [clients]);

  const revenueByClient = useMemo(() => {
    const map = new Map<string, number>();
    let other = 0;
    for (const i of allIncome as any[]) {
      const raw = incomeDateOf(i);
      if (!raw || !inRange(new Date(raw), ranges.from, ranges.to)) continue;
      const amount = Number(i.amount || 0);
      const cid = i.client_id as string | null;
      if (!cid) { other += amount; continue; }
      map.set(cid, (map.get(cid) || 0) + amount);
    }
    const rows = [...map.entries()]
      .map(([id, amount]) => ({ id, name: clientNameById.get(id) || t("po.unknownClient"), amount }))
      .sort((a, b) => b.amount - a.amount);
    return { rows, other };
  }, [allIncome, ranges, clientNameById]);

  const topClients = revenueByClient.rows.slice(0, 6);
  const maxClientRevenue = topClients[0]?.amount || 1;

  const donutData = useMemo(() => {
    const top = revenueByClient.rows.slice(0, 5).map((r) => ({ name: r.name, value: r.amount }));
    const restTotal = revenueByClient.rows.slice(5).reduce((s, r) => s + r.amount, 0);
    if (restTotal > 0) top.push({ name: t("po.others"), value: restTotal });
    if (revenueByClient.other > 0) top.push({ name: t("po.otherIncome"), value: revenueByClient.other });
    return top;
  }, [revenueByClient, lang]);

  const periodLabel =
    period === "today" ? t("po.today") : period === "month" ? t("po.month") : t("po.allTime");
  const asOf = useMemo(() => {
    try { return new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" }).format(now); }
    catch { return now.toDateString(); }
  }, [lang]);
  const headerPeriod = useMemo(() => {
    if (period !== "month") return periodLabel;
    try { return new Intl.DateTimeFormat(lang, { month: "long" }).format(now); } catch { return periodLabel; }
  }, [period, lang, periodLabel]);

  /** Label of the comparison period, e.g. "July" or "yesterday". */
  const prevLabel = useMemo(() => {
    if (period === "today") return t("po.yesterday");
    if (period !== "month") return null;
    try {
      return new Intl.DateTimeFormat(lang, { month: "long" })
        .format(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    } catch { return null; }
  }, [period, lang]);

  const therapistName = ((profile as any)?.full_name || "").split(" ")[0] || "";
  const initials = ((profile as any)?.full_name || "")
    .split(" ").filter(Boolean).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("");

  return (
    <AppLayout>
      <div className="space-y-4">
        <FinanceSubnav />

        <div className="bg-card border border-border rounded-[20px] shadow-card overflow-hidden">
          {/* Header */}
          <div className="px-5 sm:px-8 pt-6 pb-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-[32px] leading-tight font-bold tracking-tight text-foreground capitalize">
                  {t("po.title", { period: headerPeriod })}
                </h1>
                <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                  {t("po.subtitle", { period: periodLabel, date: asOf })}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="inline-flex rounded-full bg-muted p-1">
                  {(["today", "month", "all"] as Period[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                        period === p
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {p === "today" ? t("po.today") : p === "month" ? t("po.month") : t("po.allTime")}
                    </button>
                  ))}
                </div>
                {therapistName && (
                  <div className="hidden xl:flex items-center gap-2.5">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {t("po.greeting", { name: therapistName })}
                    </span>
                    <span className="h-9 w-9 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
                      {initials}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="px-5 sm:px-8 pb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-[20px]" />)}
            </div>
          ) : (
            <>
              {/* Section 1 — KPIs */}
              <div className="border-t border-border px-5 sm:px-8 py-6 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
                <Kpi
                  label={t("po.totalRevenue")} value={`${cs}${revenue.toLocaleString()}`}
                  delta={pct(revenue, prevRevenue)} positiveIsGood prevLabel={prevLabel} t={t}
                />
                <Kpi
                  label={t("po.totalExpenses")} value={`${cs}${expenses.toLocaleString()}`}
                  delta={pct(expenses, prevExpenses)} positiveIsGood={false} prevLabel={prevLabel} t={t}
                />
                <Kpi
                  label={t("po.netResult")} value={`${cs}${net.toLocaleString()}`}
                  delta={pct(net, prevNet)} positiveIsGood prevLabel={prevLabel} t={t} accent
                />
              </div>

              {/* Sections 2 & 3 — Trend + Needs attention */}
              <div className="border-t border-border grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] divide-y lg:divide-y-0 lg:divide-x divide-border">
                <section className="px-5 sm:px-8 py-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h2 className="text-base font-semibold text-foreground">{t("po.healthTrend")}</h2>
                    <div className="inline-flex items-center gap-3">
                      {([6, 3, 1] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setTrendRange(r)}
                          className={cn(
                            "text-xs font-semibold transition-colors pb-0.5 border-b-2",
                            trendRange === r
                              ? "text-foreground border-foreground"
                              : "text-muted-foreground border-transparent hover:text-foreground",
                          )}
                        >
                          {r}M
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" verticalAlign="top" height={28} />
                        <Line type="monotone" dataKey="active" name={t("po.activeClients")} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="completed" name={t("po.completedSessions")} stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="cancelled" name={t("po.cancellations")} stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Mini
                      icon={Users}
                      value={String((clients as any[]).length)}
                      label={t("po.totalClients")}
                      sub={t("po.activeSuffix", { n: metrics.activeClients })}
                    />
                    <Mini
                      icon={CheckCircle2}
                      value={String(metrics.completed)}
                      label={t("po.completedSessions")}
                      sub={t("po.completionRateSuffix", { n: metrics.completionRate })}
                    />
                    <Mini
                      icon={XCircle}
                      value={String(metrics.cancelled)}
                      label={t("po.cancellations")}
                      sub={t("po.cancellationRateSuffix", { n: metrics.cancellationRate })}
                    />
                    <Mini
                      icon={Activity}
                      value={String(metrics.completed)}
                      label={t("po.sessionsConducted")}
                      sub={t("po.perSessionSuffix", { amount: `${cs}${metrics.avgRevenuePerSession.toLocaleString()}` })}
                    />
                  </div>
                </section>

                <section className="px-5 sm:px-8 py-6">
                  <h2 className="text-base font-semibold text-foreground mb-2">{t("po.needsAttention")}</h2>
                  {attention.length === 0 ? (
                    <p className="py-8 text-sm text-muted-foreground text-center">{t("po.noActionRequired")}</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {attention.map((a) => (
                        <li
                          key={a.key}
                          onClick={a.onClick}
                          className="group flex items-center gap-3 py-3.5 cursor-pointer"
                        >
                          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <a.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{a.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{a.sub}</p>
                          </div>
                          <p className="text-base font-bold tabular-nums text-primary whitespace-nowrap">{a.value}</p>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              {/* Sections 4 & 5 — Top clients + distribution */}
              <div className="border-t border-border grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] divide-y lg:divide-y-0 lg:divide-x divide-border">
                <section className="px-5 sm:px-8 py-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h2 className="text-base font-semibold text-foreground">{t("po.topClients")}</h2>
                    <button
                      onClick={() => navigate("/clients")}
                      className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1.5 hover:text-foreground"
                    >
                      {t("po.viewAllClients")} <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {topClients.length === 0 ? (
                    <p className="py-10 text-sm text-muted-foreground text-center">{t("po.noRevenue")}</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {topClients.map((c) => (
                        <li
                          key={c.id}
                          onClick={() => navigate(`/clients/${c.id}`)}
                          className="group grid grid-cols-[minmax(80px,140px)_minmax(0,1fr)_auto] items-center gap-3 cursor-pointer"
                        >
                          <span className="text-xs text-muted-foreground truncate text-right group-hover:text-foreground transition-colors">
                            {c.name}
                          </span>
                          <div className="h-4">
                            <div
                              className="h-full rounded-sm bg-primary"
                              style={{ width: `${Math.max(3, (c.amount / maxClientRevenue) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold tabular-nums text-foreground whitespace-nowrap w-16 text-right">
                            {cs}{c.amount.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="px-5 sm:px-8 py-6">
                  <h2 className="text-base font-semibold text-foreground mb-3">{t("po.incomeDistribution")}</h2>
                  {donutData.length === 0 ? (
                    <p className="py-10 text-sm text-muted-foreground text-center">{t("po.noRevenue")}</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,150px)_minmax(0,1fr)] gap-4 items-center">
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={68} paddingAngle={2}>
                              {donutData.map((_, i) => (
                                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                              formatter={(v: number) => `${cs}${Number(v).toLocaleString()}`}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <ul className="divide-y divide-border">
                          {donutData.map((d, i) => {
                            const share = revenue > 0 ? (d.value / revenue) * 100 : 0;
                            return (
                              <li key={d.name} className="flex items-center gap-2 text-xs py-1.5">
                                <span className="h-2.5 w-2.5 rounded-[3px] shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                                <span className="flex-1 truncate text-foreground">{d.name}</span>
                                <span className="tabular-nums text-muted-foreground w-12 text-right">{share.toFixed(1)}%</span>
                                <span className="font-semibold tabular-nums text-foreground w-16 text-right">{cs}{d.value.toLocaleString()}</span>
                              </li>
                            );
                          })}
                        </ul>
                        <div className="flex items-center justify-between pt-3 mt-1">
                          <span className="text-sm text-muted-foreground">{t("po.totalRevenue")}</span>
                          <span className="text-sm font-bold tabular-nums text-foreground">{cs}{revenue.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <div className="border-t border-border px-5 sm:px-8 py-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                {t("po.privacyNote")}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Kpi({ label, value, delta, positiveIsGood, prevLabel, t, accent }: {
  label: string; value: string; delta: number | null; positiveIsGood: boolean;
  prevLabel: string | null; t: (k: string, p?: any) => string; accent?: boolean;
}) {
  const good = delta === null ? null : positiveIsGood ? delta >= 0 : delta <= 0;
  const Arrow = delta !== null && delta < 0 ? TrendingDown : TrendingUp;
  return (
    <div className="px-2 sm:px-4 py-3 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn(
        "mt-1.5 text-3xl sm:text-4xl font-bold tabular-nums break-all",
        accent ? "text-primary" : "text-foreground",
      )}>
        {value}
      </p>
      <p className="mt-1.5 text-xs font-medium flex items-center justify-center gap-1.5">
        {delta === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <>
            <span className={cn(
              "inline-flex items-center gap-0.5 font-semibold",
              good ? "text-success" : "text-destructive",
            )}>
              <Arrow className="h-3.5 w-3.5" />
              {Math.abs(delta)}%
            </span>
            {prevLabel && <span className="text-muted-foreground capitalize">{t("po.vsPrev", { period: prevLabel })}</span>}
          </>
        )}
      </p>
    </div>
  );
}

function Mini({ icon: Icon, value, label, sub }: { icon: any; value: string; label: string; sub: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xl font-bold tabular-nums text-foreground leading-none">{value}</span>
      </div>
      <p className="text-[11px] text-foreground mt-1.5 leading-snug">{label}</p>
      <p className="text-[11px] text-muted-foreground leading-snug">{sub}</p>
    </div>
  );
}

