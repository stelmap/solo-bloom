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
  Clock, CalendarDays, XCircle, Users,
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

  return (
    <AppLayout>
      <div className="space-y-5">
        <FinanceSubnav />

        {/* Header */}
        <div className="bg-card border border-border rounded-[20px] px-5 sm:px-7 py-5 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground capitalize">
                {t("po.title", { period: headerPeriod })}
              </h1>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                {t("po.subtitle", { period: periodLabel, date: asOf })}
              </p>
            </div>
            <div className="inline-flex rounded-full bg-muted p-1 self-start">
              {(["today", "month", "all"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                    period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p === "today" ? t("po.today") : p === "month" ? t("po.month") : t("po.allTime")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-[20px]" />)}
          </div>
        ) : (
          <>
            {/* Section 1 — KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Kpi
                label={t("po.totalRevenue")} value={`${cs}${revenue.toLocaleString()}`}
                icon={TrendingUp} delta={pct(revenue, prevRevenue)} positiveIsGood
              />
              <Kpi
                label={t("po.totalExpenses")} value={`${cs}${expenses.toLocaleString()}`}
                icon={TrendingDown} delta={pct(expenses, prevExpenses)} positiveIsGood={false}
              />
              <Kpi
                label={t("po.netResult")} value={`${cs}${net.toLocaleString()}`}
                icon={Wallet} delta={pct(net, prevNet)} positiveIsGood
              />
            </div>

            {/* Section 2 — Practice health trend */}
            <section className="bg-card border border-border rounded-[20px] shadow-card px-5 sm:px-6 py-5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h2 className="text-base font-semibold text-foreground">{t("po.healthTrend")}</h2>
                <div className="inline-flex rounded-full bg-muted p-1">
                  {([1, 3, 6] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setTrendRange(r)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                        trendRange === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {r}M
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="active" name={t("po.activeClients")} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="completed" name={t("po.completedSessions")} stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="cancelled" name={t("po.cancellations")} stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Mini label={t("po.totalClients")} value={String((clients as any[]).length)} />
                <Mini label={t("po.activeClients")} value={String(metrics.activeClients)} />
                <Mini label={t("po.completedSessions")} value={String(metrics.completed)} />
                <Mini label={t("po.completionRate")} value={`${metrics.completionRate}%`} />
                <Mini label={t("po.cancellations")} value={String(metrics.cancelled)} />
                <Mini label={t("po.cancellationRate")} value={`${metrics.cancellationRate}%`} />
                <Mini label={t("po.sessionsConducted")} value={String(metrics.completed)} />
                <Mini label={t("po.avgRevenuePerSession")} value={`${cs}${metrics.avgRevenuePerSession.toLocaleString()}`} />
                <Mini
                  label={t("po.avgTherapyDuration")}
                  value={metrics.avgTherapyMonths > 0 ? `${metrics.avgTherapyMonths.toFixed(1)} ${t("po.monthsShort")}` : "—"}
                />
              </div>
            </section>

            {/* Section 3 — Needs attention */}
            <section className="bg-card border border-border rounded-[20px] shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">{t("po.needsAttention")}</h2>
                {attention.length > 0 && (
                  <span className="text-[11px] font-bold h-5 min-w-5 px-1.5 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center">
                    {attention.length}
                  </span>
                )}
              </div>
              {attention.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground text-center">{t("po.noActionRequired")}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {attention.map((a) => (
                    <li
                      key={a.key}
                      onClick={a.onClick}
                      className="group flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                        a.tone === "warning" && "bg-warning/15 text-warning",
                        a.tone === "danger" && "bg-destructive/10 text-destructive",
                        a.tone === "info" && "bg-primary/10 text-primary",
                        a.tone === "muted" && "bg-muted text-muted-foreground",
                      )}>
                        <a.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{a.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.sub}</p>
                      </div>
                      <p className="text-base font-bold tabular-nums text-foreground whitespace-nowrap">{a.value}</p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Sections 4 & 5 — Top clients + distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-4 items-start">
              <section className="bg-card border border-border rounded-[20px] shadow-card overflow-hidden">
                <div className="px-5 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-foreground">{t("po.topClients")}</h2>
                  <button
                    onClick={() => navigate("/clients")}
                    className="text-xs font-semibold text-primary inline-flex items-center gap-1.5 hover:opacity-80"
                  >
                    {t("po.viewAllClients")} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                {topClients.length === 0 ? (
                  <p className="px-5 py-10 text-sm text-muted-foreground text-center">{t("po.noRevenue")}</p>
                ) : (
                  <ul className="px-5 sm:px-6 py-4 space-y-3.5">
                    {topClients.map((c) => {
                      const share = revenue > 0 ? Math.round((c.amount / revenue) * 100) : 0;
                      return (
                        <li key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className="cursor-pointer group">
                          <div className="flex items-baseline justify-between gap-3 mb-1.5">
                            <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {c.name}
                            </span>
                            <span className="text-sm font-bold tabular-nums text-foreground whitespace-nowrap">
                              {cs}{c.amount.toLocaleString()}
                              <span className="ml-2 text-xs font-medium text-muted-foreground">{share}%</span>
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.max(4, (c.amount / maxClientRevenue) * 100)}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="bg-card border border-border rounded-[20px] shadow-card px-5 sm:px-6 py-5">
                <h2 className="text-base font-semibold text-foreground mb-3">{t("po.incomeDistribution")}</h2>
                {donutData.length === 0 ? (
                  <p className="py-10 text-sm text-muted-foreground text-center">{t("po.noRevenue")}</p>
                ) : (
                  <>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
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
                    <ul className="mt-3 space-y-2">
                      {donutData.map((d, i) => {
                        const share = revenue > 0 ? Math.round((d.value / revenue) * 100) : 0;
                        return (
                          <li key={d.name} className="flex items-center gap-2 text-xs">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                            <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
                            <span className="font-semibold tabular-nums text-foreground">{cs}{d.value.toLocaleString()}</span>
                            <span className="tabular-nums text-muted-foreground w-9 text-right">{share}%</span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function Kpi({ label, value, icon: Icon, delta, positiveIsGood }: {
  label: string; value: string; icon: any; delta: number | null; positiveIsGood: boolean;
}) {
  const good = delta === null ? null : positiveIsGood ? delta >= 0 : delta <= 0;
  return (
    <div className="bg-card border border-border rounded-[20px] shadow-card px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground break-all">{value}</p>
      <p className={cn(
        "mt-1 text-xs font-medium",
        good === null && "text-muted-foreground",
        good === true && "text-success",
        good === false && "text-destructive",
      )}>
        {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}%`}
      </p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 px-3 py-3">
      <p className="text-lg font-bold tabular-nums text-foreground leading-none break-all">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{label}</p>
    </div>
  );
}
