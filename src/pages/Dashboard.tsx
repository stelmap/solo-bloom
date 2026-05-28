import { AppLayout } from "@/components/AppLayout";
import { useDashboardStats, useProfile, useClients, useAppointments } from "@/hooks/useData";
import { useBookingRequests, useConfirmBookingRequest, useDeclineBookingRequest } from "@/hooks/useBookingInbox";
import { useEffect, useMemo } from "react";
import { track } from "@/lib/analytics";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { formatScheduledTime } from "@/lib/timeFormat";
import { toast } from "@/hooks/use-toast";
import {
  Users, DollarSign,
  PlayCircle, ArrowRight, XCircle, Inbox,
  UserPlus, UserCheck, UserMinus, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Activity, CheckCircle2, Clock, Wallet, Heart,
} from "lucide-react";


type Apt = {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  payment_status: string;
  price: number;
  group_session_id?: string | null;
  clients?: { name?: string } | null;
  services?: { name?: string } | null;
};

const PAID_STATUSES = new Set(["paid_now", "paid_in_advance", "paid_from_prepayment"]);
const UNPAID_STATUSES = new Set(["unpaid", "waiting_for_payment"]);

function statusBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success";
    case "confirmed":
      return "bg-primary/10 text-primary";
    case "cancelled":
      return "bg-destructive/10 text-destructive";
    case "no-show":
      return "bg-warning/10 text-warning";
    case "rescheduled":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-accent text-accent-foreground";
  }
}

function paymentBadgeClass(status: string) {
  if (PAID_STATUSES.has(status)) return "bg-success/10 text-success";
  if (status === "waiting_for_payment") return "bg-warning/10 text-warning";
  if (status === "unpaid") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: profile } = useProfile();
  const { data: allClients = [] } = useClients();
  const { data: allAppointments = [] } = useAppointments();
  const { t, lang } = useLanguage();
  const { symbol: cs } = useCurrency();

  // Derive "clients without next session" from the SAME data ClientsPage uses,
  // so the dashboard tile and the filtered list always match exactly.
  const clientsWithoutNextSessionCount = useMemo(() => {
    const nowIso = new Date().toISOString();
    const withFuture = new Set<string>();
    for (const a of allAppointments as any[]) {
      if (a.status !== "cancelled" && a.scheduled_at > nowIso && a.client_id) {
        withFuture.add(a.client_id);
      }
    }
    let count = 0;
    for (const c of allClients as any[]) {
      if ((c.status ?? "active") === "active" && !withFuture.has(c.id)) count++;
    }
    return count;
  }, [allClients, allAppointments]);

  // Fire once per mount. Dashboard is today-scoped, so range is fixed.
  useEffect(() => {
    track("dashboard_viewed", { range: "today", lang });
  }, [lang]);

  // Click handler for KPI widgets: emits a typed event and navigates.
  const openWidget = (widget: string, path: string) => {
    track("dashboard_widget_clicked", { widget, range: "today", lang });
    navigate(path);
  };

  const navigate = useNavigate();
  const use12h = (profile as any)?.time_format === "12h";

  const rawTodayAppointments: Apt[] = (stats?.todayAppointments as Apt[]) ?? [];

  // Deduplicate appointments: same client + same scheduled_at = one session.
  // For group sessions, all rows sharing group_session_id collapse to one session.
  // When duplicates exist, prefer the most "advanced" status:
  // completed > scheduled/confirmed > no-show > rescheduled > cancelled.
  const todayAppointments: Apt[] = useMemo(() => {
    const statusRank = (s: string) =>
      s === "completed" ? 5 :
      s === "confirmed" ? 4 :
      s === "scheduled" ? 4 :
      s === "no-show" ? 3 :
      s === "rescheduled" ? 2 :
      s === "cancelled" ? 1 : 0;
    const map = new Map<string, Apt>();
    for (const apt of rawTodayAppointments) {
      const key = apt.group_session_id
        ? `g:${apt.group_session_id}`
        : `c:${(apt as any).client_id ?? ""}@${apt.scheduled_at}`;
      const existing = map.get(key);
      if (!existing || statusRank(apt.status) > statusRank(existing.status)) {
        map.set(key, apt);
      }
    }
    return Array.from(map.values());
  }, [rawTodayAppointments]);

  const summary = useMemo(() => {
    const now = Date.now();
    let planned = 0, completed = 0, cancelled = 0, noShow = 0, rescheduled = 0;
    let paidCount = 0, unpaidCount = 0;
    let amountReceived = 0, amountPending = 0;
    const clientIds = new Set<string>();
    let current: Apt | null = null;
    let next: Apt | null = null;

    for (const apt of todayAppointments) {
      clientIds.add((apt as any).client_id);
      const start = new Date(apt.scheduled_at).getTime();
      const end = start + (apt.duration_minutes ?? 60) * 60_000;

      switch (apt.status) {
        case "completed": completed++; break;
        case "cancelled": cancelled++; break;
        case "no-show": noShow++; break;
        case "rescheduled": rescheduled++; break;
        default: planned++;
      }

      // Only completed sessions can be counted as paid/unpaid for money totals.
      // Planned/confirmed/cancelled/no-show/rescheduled sessions are not payable yet.
      if (apt.status === "completed") {
        if (PAID_STATUSES.has(apt.payment_status)) {
          paidCount++;
          amountReceived += Number(apt.price ?? 0);
        } else if (UNPAID_STATUSES.has(apt.payment_status) || apt.payment_status === "partially_paid") {
          unpaidCount++;
          amountPending += Number(apt.price ?? 0);
        }
      }

      // Now / Next
      if (start <= now && now < end && apt.status !== "cancelled") {
        if (!current) current = apt;
      } else if (start > now && apt.status !== "cancelled") {
        if (!next || start < new Date(next.scheduled_at).getTime()) next = apt;
      }
    }

    const remaining = Math.max(planned, 0);
    return {
      planned, completed, cancelled, noShow, rescheduled,
      paidCount, unpaidCount, amountReceived, amountPending,
      clientCount: clientIds.size,
      remaining,
      current, next,
    };
  }, [todayAppointments]);

  const completedPaidTotal = todayAppointments.filter(
    (apt) => apt.status === "completed" && PAID_STATUSES.has(apt.payment_status),
  ).length;
  const cancelledTotal = todayAppointments.filter((apt) => apt.status === "cancelled").length;
  const completedUnpaidTotal = todayAppointments.filter(
    (apt) => apt.status === "completed" && UNPAID_STATUSES.has(apt.payment_status),
  ).length;
  // Expected revenue today = sum of price of today's payable (non-cancelled)
  // sessions. This represents what is expected to come in today regardless of
  // current payment status. The detail view (today's schedule) lists exactly
  // these sessions so totals reconcile.
  const expectedRevenueToday = todayAppointments
    .filter((apt) => apt.status !== "cancelled")
    .reduce((s, apt) => s + Number(apt.price ?? 0), 0);



  const todayLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang, {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      }).format(new Date());
    } catch {
      return new Date().toDateString();
    }
  }, [lang]);

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header — clean business style */}
        <div className="bg-card border border-border rounded-[20px] px-6 sm:px-8 py-6 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                {t("dashboard.greeting")}
              </h1>
              <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">{t("dashboard.subtitle")}</p>
            </div>
            <div className="self-start sm:self-auto inline-flex items-center gap-2 bg-muted border border-border px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {todayLabel}
            </div>
          </div>
        </div>

        {/* Booking Requests Attention */}
        <BookingAttention navigate={navigate} t={t} use12h={use12h} />

        {/* A. Monthly Overview */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            {t("ops.monthlyOverview")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <OverviewTile icon={Users} label={t("ops.activeClientsThisMonth")} value={String(stats?.activeClientsThisMonth ?? 0)} trend={trendPct(stats?.activeClientsThisMonth ?? 0, (stats as any)?.prevActiveClients ?? 0)} trendLabel={t("dash.vsLastMonth")} active onClick={() => openWidget("active_clients_this_month", "/clients?filter=activeThisMonth")} />
            <OverviewTile icon={UserPlus} label={t("ops.newClientsThisMonth")} value={String(stats?.newClientsThisMonth ?? 0)} trend={trendPct(stats?.newClientsThisMonth ?? 0, (stats as any)?.prevNewClients ?? 0)} trendLabel={t("dash.vsLastMonth")} onClick={() => openWidget("new_clients_this_month", "/clients?filter=newThisMonth")} />
            <OverviewTile icon={UserCheck} label={t("ops.completedTherapyThisMonth")} value={String(stats?.completedTherapyThisMonth ?? 0)} trend={trendPct(stats?.completedTherapyThisMonth ?? 0, (stats as any)?.prevCompletedTherapy ?? 0)} trendLabel={t("dash.vsLastMonth")} onClick={() => openWidget("completed_therapy_this_month", "/clients?filter=completedThisMonth")} />
            <OverviewTile icon={UserMinus} label={t("ops.droppedTherapyThisMonth")} value={String(stats?.droppedTherapyThisMonth ?? 0)} trend={trendPct(stats?.droppedTherapyThisMonth ?? 0, (stats as any)?.prevDroppedTherapy ?? 0, true)} trendLabel={t("dash.vsLastMonth")} onClick={() => openWidget("dropped_therapy_this_month", "/clients?filter=droppedThisMonth")} />
            <OverviewTile icon={XCircle} label={t("ops.cancelledSessionsThisMonth")} value={String((stats as any)?.cancelledSessionsThisMonth ?? 0)} trend={trendPct(stats?.cancelledSessionsThisMonth ?? 0, (stats as any)?.prevCancelled ?? 0, true)} trendLabel={t("dash.vsLastMonth")} />
          </div>
        </section>

        {/* A2. Monthly Financial Risk */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            {t("dash.financialRisk")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MoneyTile label={t("ops.lostIncomeCancellations")} value={`${cs}${Number((stats as any)?.lostIncomeThisMonth ?? 0).toLocaleString()}`} tone={Number((stats as any)?.lostIncomeThisMonth ?? 0) > 0 ? "warning" : "muted"} />
            <MoneyTile label={t("ops.monthlyExpensesTotal")} value={`${cs}${Number(stats?.monthlyExpenses ?? 0).toLocaleString()}`} onClick={() => openWidget("monthly_expenses", "/finances/expenses")} />
            <MoneyTile label={t("ops.unpaidSessionsCount")} value={String((stats as any)?.unpaidSessionsCount ?? 0)} tone={((stats as any)?.unpaidSessionsCount ?? 0) > 0 ? "warning" : "muted"} onClick={() => openWidget("unpaid_sessions", "/finances/income?tab=pending&range=all")} />

            <MoneyTile label={t("ops.clientsWithoutNextSession")} value={String((stats as any)?.clientsWithoutNextSession ?? 0)} tone={((stats as any)?.clientsWithoutNextSession ?? 0) > 0 ? "warning" : "muted"} onClick={() => openWidget("clients_without_next_session", "/clients?filter=withoutNextSession")} />
          </div>
        </section>

        {/* B. Daily Overview - Activity | Money */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            {t("ops.todayOverview")}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT: Today's Activity (3 metrics) */}
            <div className="bg-card border border-border rounded-[20px] p-4 sm:p-6 shadow-card min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 mb-4 sm:mb-5">
                <PlayCircle className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {t("ops.todaysActivity")}
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <StatCell label={t("ops.clientsToday")} value={summary.clientCount.toString()} />
                <StatCell label={t("ops.sessionsPlanned")} value={(summary.planned + summary.completed).toString()} />
                <StatCell label={t("ops.cancelledSessions")} value={cancelledTotal.toString()} tone={cancelledTotal > 0 ? "warning" : "muted"} />
              </div>
            </div>

            {/* RIGHT: Today's Money (3 metrics) */}
            <div className="bg-card border border-border rounded-[20px] p-4 sm:p-6 shadow-card flex flex-col min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 mb-4 sm:mb-5">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-muted-foreground">
                <MoneyTile label={t("ops.expectedRevenueToday")} value={`${cs}${expectedRevenueToday.toLocaleString()}`} onClick={() => openWidget("expected_revenue_today", "/calendar")} />

                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1">
                <MoneyTile label={t("ops.paidToday")} value={`${cs}${Number(stats?.todayIncome ?? 0).toLocaleString()}`} tone="success" onClick={() => openWidget("paid_today", "/finances/income?range=today&tab=income")} />
                <MoneyTile label={t("ops.expectedRevenueToday")} value={`${cs}${expectedRevenueToday.toLocaleString()}`} onClick={() => openWidget("expected_revenue_today", "/finances/income?range=today&tab=income")} />
                <MoneyTile label={t("ops.todayDebt")} value={`${cs}${Number((stats as any)?.todayDebt ?? 0).toLocaleString()}`} tone={Number((stats as any)?.todayDebt ?? 0) > 0 ? "warning" : "muted"} onClick={() => openWidget("today_debt", "/finances/income?range=today&tab=pending")} />
              </div>
              <div className="mt-4 bg-gradient-dark text-secondary-foreground rounded-2xl px-4 sm:px-5 py-3 sm:py-4 flex justify-between items-center gap-2 min-w-0">
                <span className="text-xs font-semibold opacity-80 shrink-0">{t("ops.totalDebt")}</span>
                <span className="text-xl sm:text-2xl font-bold text-primary tabular-nums break-all text-right">{cs}{Number(stats?.outstandingBalance ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>


        {/* C. Now / Next */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            {t("ops.nowNext")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NowNextCard
              kind="now"
              title={t("ops.now")}
              apt={summary.current}
              emptyText={t("ops.noCurrent")}
              cs={cs}
              use12h={use12h}
              onOpen={() => summary.current && navigate(`/calendar?appointmentId=${summary.current.id}`)}
              openLabel={t("ops.openRecord")}
              t={t}
            />
            <NowNextCard
              kind="next"
              title={t("ops.next")}
              apt={summary.next}
              emptyText={t("ops.noNext")}
              cs={cs}
              use12h={use12h}
              onOpen={() => summary.next && navigate(`/calendar?appointmentId=${summary.next.id}`)}
              openLabel={t("ops.openRecord")}
              t={t}
            />
          </div>
        </section>

        {/* D. Today Schedule Snapshot */}
        <section className="bg-card rounded-[20px] border border-border shadow-card overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{t("ops.scheduleSnapshot")}</h2>
            <button
              onClick={() => navigate("/calendar")}
              className="text-xs font-semibold inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-muted text-foreground hover:bg-muted/70 transition-colors"
            >
              {t("nav.calendar")} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {todayAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">{t("ops.empty")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {todayAppointments
                .slice()
                .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                .map((apt) => {
                  const isGroup = !!apt.group_session_id;
                  const typeLabel = isGroup ? t("ops.group") : t("ops.individual");
                  const now = Date.now();
                  const start = new Date(apt.scheduled_at).getTime();
                  const end = start + (apt.duration_minutes ?? 60) * 60_000;
                  const isLive = start <= now && now < end && apt.status !== "cancelled";
                  const accent =
                    apt.status === "completed" ? "bg-success" :
                    apt.status === "cancelled" ? "bg-destructive/40" :
                    isLive ? "bg-primary" :
                    "bg-border";
                  return (
                    <li
                      key={apt.id}
                      className={cn(
                        "group flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors",
                        isLive ? "bg-primary-soft" : "hover:bg-muted/50",
                      )}
                      onClick={() => navigate(`/calendar?appointmentId=${apt.id}`)}
                    >
                      <div className="min-w-[64px]">
                        <p className={cn("text-sm font-semibold tabular-nums", isLive ? "text-primary" : "text-foreground")}>
                          {formatScheduledTime(apt.scheduled_at, use12h)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {apt.duration_minutes}{t("common.min")}
                        </p>
                      </div>
                      <div className={cn("self-stretch w-[3px] rounded-full", accent)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {apt.clients?.name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {typeLabel} · {apt.services?.name ?? "—"}
                        </p>
                      </div>
                      {isLive ? (
                        <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-primary-foreground items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
                          {t("ops.now")}
                        </span>
                      ) : (
                        <span className={cn("hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full", statusBadgeClass(apt.status))}>
                          {t((`status.${apt.status === "no-show" ? "noShow" : apt.status}`) as any)}
                        </span>
                      )}
                      <span className={cn("hidden md:inline-flex text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full", paymentBadgeClass(apt.payment_status))}>
                        {PAID_STATUSES.has(apt.payment_status)
                          ? t("payment.paid")
                          : apt.payment_status === "waiting_for_payment"
                          ? t("payment.waiting")
                          : apt.payment_status === "unpaid"
                          ? t("ops.unpaid")
                          : t("payment.na")}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </li>
                  );
                })}
            </ul>
          )}
        </section>

        {/* E. Practice Health (all-time) */}
        <PracticeHealth stats={stats} t={t} cs={cs} />

      </div>
    </AppLayout>
  );
}

function trendPct(curr: number, prev: number, inverse = false): { dir: "up" | "down" | "flat"; pct: number; positive: boolean } {
  if (!prev && !curr) return { dir: "flat", pct: 0, positive: true };
  if (!prev) return { dir: "up", pct: 100, positive: !inverse };
  const diff = curr - prev;
  if (diff === 0) return { dir: "flat", pct: 0, positive: true };
  const pct = Math.round((diff / prev) * 100);
  const dir = diff > 0 ? "up" : "down";
  const positive = inverse ? diff < 0 : diff > 0;
  return { dir, pct: Math.abs(pct), positive };
}

function TrendBadge({ trend, label }: { trend: ReturnType<typeof trendPct>; label?: string }) {
  const Icon = trend.dir === "up" ? TrendingUp : trend.dir === "down" ? TrendingDown : Minus;
  const tone = trend.dir === "flat"
    ? "text-muted-foreground"
    : trend.positive ? "text-success" : "text-destructive";
  const sign = trend.dir === "up" ? "+" : trend.dir === "down" ? "-" : "";
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold leading-none mt-1.5", tone)}>
      <Icon className="h-3 w-3" />
      <span className="tabular-nums">{sign}{trend.pct}%</span>
      {label && <span className="text-muted-foreground font-medium ml-0.5 truncate">{label}</span>}
    </span>
  );
}

function BookingAttention({ navigate, t, use12h }: { navigate: (p: string) => void; t: (k: any, p?: any) => string; use12h: boolean }) {
  const { data: rows = [] } = useBookingRequests();
  const pending = useMemo(() => rows.filter(r => r.status === "pending" || r.status === "needs_linking"), [rows]);
  const confirm = useConfirmBookingRequest();
  const decline = useDeclineBookingRequest();

  if (!pending.length) {
    return (
      <section className="bg-card border border-border rounded-[20px] px-6 py-5 shadow-card flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
          <Inbox className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t("dash.bookingEmpty")}</p>
      </section>
    );
  }
  const top = pending.slice(0, 5);
  const headerLabel = pending.length === 1
    ? t("dash.bookingAttention", { count: pending.length })
    : t("dash.bookingAttention_plural", { count: pending.length });

  return (
    <section className="bg-card border border-warning/30 rounded-[20px] shadow-card overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-warning/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-warning/15 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <p className="text-sm font-semibold text-foreground">{headerLabel}</p>
        </div>
        {pending.length > 5 && (
          <button
            onClick={() => navigate("/booking-inbox")}
            className="text-xs font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70 transition-colors"
          >
            {t("dash.viewAllRequests")} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <ul className="divide-y divide-border">
        {top.map((r) => {
          const name = `${r.first_name}${r.last_name ? " " + r.last_name : ""}`.trim();
          return (
            <li key={r.id} className="px-6 py-3.5 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{name || r.email}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatScheduledTime(r.requested_slot_at, use12h)} · {new Date(r.requested_slot_at).toLocaleDateString()} · {r.duration_minutes}{t("common.min")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!r.client_id) { navigate("/booking-inbox"); return; }
                    try { await confirm.mutateAsync({ id: r.id, client_id: r.client_id }); toast({ title: "OK" }); }
                    catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-success/10 text-success hover:bg-success/20 inline-flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t("booking.confirm") || "Підтвердити"}
                </button>
                <button
                  onClick={async () => {
                    try { await decline.mutateAsync({ id: r.id }); }
                    catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 inline-flex items-center gap-1"
                >
                  <XCircle className="h-3.5 w-3.5" /> {t("booking.decline") || "Відхилити"}
                </button>
                <button
                  onClick={() => navigate("/booking-inbox")}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-border hover:bg-muted inline-flex items-center gap-1"
                >
                  {t("booking.open") || "Відкрити"} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PracticeHealth({ stats, t, cs }: { stats: any; t: (k: any, p?: any) => string; cs: string }) {
  const total = Number(stats?.totalClients ?? 0);
  const active = Number(stats?.activeClientsTotal ?? 0);
  const completed = Number(stats?.completedClientsTotal ?? 0);
  const avgMonths = Number(stats?.avgTherapyMonths ?? 0);
  const completionRate = Number(stats?.completionRate ?? 0);
  const cancellationRate = Number(stats?.cancellationRate ?? 0);
  const conducted = Number(stats?.conductedSessions ?? 0);
  const sessionCost = Number(stats?.sessionCost ?? 0);

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Heart className="h-4 w-4 text-primary" />
        {t("ops.practiceHealth")}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <HealthTile icon={Users} label={t("ops.totalClients")} value={String(total)} sub={t("ops.clientsActiveCompletedSub", { active, completed })} />
        <HealthTile icon={Clock} label={t("ops.avgTherapyDuration")} value={avgMonths > 0 ? `${avgMonths.toFixed(1)} ${t("ops.monthsShort")}` : "—"} />
        <HealthTile icon={CheckCircle2} label={t("ops.completionRate")} value={`${completionRate}%`} />
        <HealthTile icon={XCircle} label={t("ops.cancellationRate")} value={`${cancellationRate}%`} />
        <HealthTile icon={Activity} label={t("ops.conductedSessions")} value={String(conducted)} />
        <HealthTile icon={Wallet} label={t("ops.sessionCost")} value={`${cs}${sessionCost.toFixed(0)}`} sub={t("ops.perSession")} />
      </div>
    </section>
  );
}

function HealthTile({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-[18px] p-3 sm:p-5 shadow-card flex flex-col items-center text-center min-h-[120px] sm:min-h-[140px] justify-center overflow-hidden min-w-0">
      <div className="p-1.5 sm:p-2 rounded-lg bg-muted text-muted-foreground mb-2 sm:mb-3">
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>
      <p className="text-2xl sm:text-3xl font-bold leading-none tabular-nums text-foreground break-all">{value}</p>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 leading-snug break-words">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70 mt-1 leading-snug break-words">{sub}</p>}
    </div>
  );
}




function StatCell({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "muted" }) {
  const toneClass =
    tone === "success" ? "text-success" :
    tone === "warning" ? "text-warning" :
    tone === "muted" ? "text-muted-foreground/60" :
    "text-foreground";
  return (
    <div className="bg-muted/40 border border-border rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center text-center min-h-[100px] sm:min-h-[110px] overflow-hidden min-w-0">
      <p className={cn("text-2xl sm:text-4xl font-bold leading-none tabular-nums break-all", toneClass)}>{value}</p>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-2.5 leading-snug break-words">{label}</p>
    </div>
  );
}

function MoneyTile({
  label, value, tone, onClick,
}: { label: string; value: string; tone?: "success" | "warning" | "muted"; onClick?: () => void }) {
  const toneClass =
    tone === "success" ? "text-success" :
    tone === "warning" ? "text-warning" :
    tone === "muted" ? "text-muted-foreground/60" :
    "text-foreground";
  const inner = (
    <div className="flex flex-col items-center justify-center text-center h-full min-w-0">
      <p className={cn("text-lg sm:text-2xl md:text-3xl font-bold tabular-nums break-all w-full", toneClass)}>{value}</p>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2 leading-snug break-words">{label}</p>
    </div>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="bg-muted/40 border border-border rounded-2xl p-3 sm:p-4 min-h-[100px] sm:min-h-[110px] overflow-hidden min-w-0 hover:border-primary-border hover:bg-card transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${label}: ${value}`}
      >
        {inner}
      </button>
    );
  }
  return <div className="bg-muted/40 border border-border rounded-2xl p-3 sm:p-4 min-h-[100px] sm:min-h-[110px] overflow-hidden min-w-0">{inner}</div>;
}


function OverviewTile({
  icon: Icon, label, value, active, onClick, trend, trendLabel,
}: { icon: any; label: string; value: string; active?: boolean; onClick?: () => void; trend?: { dir: "up" | "down" | "flat"; pct: number; positive: boolean }; trendLabel?: string }) {
  const base = cn(
    "relative rounded-[18px] p-3 sm:p-5 text-center w-full block transition-all border flex flex-col items-center justify-between min-h-[140px] sm:min-h-[170px] overflow-hidden min-w-0",
    active
      ? "bg-primary-soft border-primary shadow-glow"
      : "bg-card border-border shadow-card",
  );
  const interactive = onClick
    ? "cursor-pointer hover:border-primary-border hover:shadow-elegant focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background group"
    : "";
  const content = (
    <>
      <div className="w-full flex items-center justify-between">
        <div className={cn(
          "p-1.5 sm:p-2 rounded-lg",
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        {onClick && (
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        )}
      </div>
      <p className={cn("text-3xl sm:text-5xl font-extrabold leading-none tabular-nums my-2 break-all", active ? "text-primary" : "text-foreground")}>{value}</p>
      <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug w-full break-words">{label}</p>
      {trend && <TrendBadge trend={trend} label={trendLabel} />}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, interactive)} aria-label={`${label}: ${value}. View details`}>
        {content}
      </button>
    );
  }
  return <div className={base} aria-disabled="true">{content}</div>;
}



function NowNextCard({
  kind, title, apt, emptyText, cs, use12h, onOpen, openLabel, t,
}: {
  kind: "now" | "next";
  title: string;
  apt: Apt | null;
  emptyText: string;
  cs: string;
  use12h: boolean;
  onOpen: () => void;
  openLabel: string;
  t: (k: any, p?: any) => string;
}) {
  const isNow = kind === "now";
  const isPaid = apt && PAID_STATUSES.has(apt.payment_status);
  return (
    <div
      className={cn(
        "rounded-[20px] p-6 sm:p-7 flex flex-col min-h-[180px] border",
        isNow
          ? "bg-gradient-dark text-secondary-foreground border-secondary shadow-elegant"
          : "bg-card border-border text-foreground shadow-card",
      )}
    >
      <div className="flex items-center gap-2 mb-5">
        {isNow ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">{title}</p>
          </>
        ) : (
          <>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{title}</p>
          </>
        )}
      </div>
      {!apt ? (
        <p className={cn("text-sm py-4", isNow ? "text-secondary-foreground/60" : "text-muted-foreground")}>{emptyText}</p>
      ) : (
        <div className="flex-1 flex flex-col justify-between gap-5">
          <div>
            <p className="text-2xl sm:text-3xl font-semibold leading-tight truncate">
              {apt.clients?.name ?? "—"}
            </p>
            <p className={cn("text-sm mt-1.5 truncate", isNow ? "text-secondary-foreground/60" : "text-muted-foreground")}>
              {formatScheduledTime(apt.scheduled_at, use12h)} · {apt.services?.name ?? "—"} · {apt.group_session_id ? t("ops.group") : t("ops.individual")}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className={cn(
              "text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5",
              isPaid ? (isNow ? "text-primary" : "text-success") : "text-warning",
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", isPaid ? "bg-success" : "bg-warning")} />
              {PAID_STATUSES.has(apt.payment_status)
                ? `${t("payment.paid")} · ${cs}${Number(apt.price).toFixed(0)}`
                : apt.payment_status === "waiting_for_payment"
                ? t("payment.waiting")
                : t("ops.unpaid")}
            </span>
            <button
              onClick={onOpen}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all",
                isNow
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border text-foreground hover:bg-muted",
              )}
            >
              {openLabel} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

