import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Users, UserPlus, UserCheck, UserMinus, XCircle,
  Clock, DollarSign, Percent, CalendarDays, Wallet, FileSignature,
  Receipt, Info, ChevronRight, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useAppointments } from "@/hooks/useData";

const PAID_STATUSES = new Set(["paid_now", "paid_in_advance", "paid_from_prepayment"]);

type Props = {
  stats: any;
  clientsWithoutNextSessionCount: number;
  onOpenWidget: (widget: string, path: string) => void;
};

export function MonthDashboard({ stats, clientsWithoutNextSessionCount, onOpenWidget }: Props) {
  const { t, lang } = useLanguage();
  const { symbol: cs } = useCurrency();
  const navigate = useNavigate();
  const { data: allAppointments = [] } = useAppointments();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const monthLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(now);
    } catch {
      return now.toDateString();
    }
  }, [lang]);

  const rangeLabel = useMemo(() => {
    try {
      const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "long" });
      return `${fmt.format(monthStart)} – ${fmt.format(monthEnd)}`;
    } catch {
      return "";
    }
  }, [lang]);

  const monthApts = useMemo(() => {
    const from = monthStart.getTime();
    const to = monthEnd.getTime();
    return (allAppointments as any[]).filter((a) => {
      const ts = new Date(a.scheduled_at).getTime();
      return ts >= from && ts <= to;
    });
  }, [allAppointments]);

  const derived = useMemo(() => {
    let conducted = 0, planned = 0, cancelled = 0, hours = 0;
    let receivedFromSessions = 0;
    const unpaid: any[] = [];
    const clientIds = new Set<string>();
    for (const a of monthApts) {
      if (a.client_id) clientIds.add(a.client_id);
      if (a.status === "cancelled") { cancelled++; continue; }
      if (a.status === "completed") {
        conducted++;
        hours += Number(a.duration_minutes ?? 60) / 60;
        if (PAID_STATUSES.has(a.payment_status)) receivedFromSessions += Number(a.price ?? 0);
        else unpaid.push(a);
      } else {
        planned++;
      }
    }
    const unpaidTotal = unpaid.reduce((s, a) => s + Number(a.price ?? 0), 0);
    return {
      conducted, planned, cancelled, hours,
      receivedFromSessions, unpaid, unpaidTotal,
      clientCount: clientIds.size,
      totalSessions: conducted + planned,
    };
  }, [monthApts]);

  const income = Number(stats?.monthlyIncome ?? 0);
  const expectedIncome = income + derived.unpaidTotal;
  const goal = Math.max(expectedIncome, income, 1);
  const capacity = Number(stats?.maxMonthlyCapacity ?? 0);
  const occupancy = capacity > 0 ? Math.round((derived.totalSessions / capacity) * 100) : 0;
  const progress = goal > 0 ? Math.min(100, Math.round((income / goal) * 100)) : 0;

  const attention = [
    {
      key: "unpaid",
      icon: Clock,
      show: derived.unpaid.length > 0,
      title: t("dashm.unpaidSessions", { count: derived.unpaid.length }),
      sub: `${t("dashm.totalAmount")}: ${cs}${derived.unpaidTotal.toLocaleString()}`,
      onClick: () => onOpenWidget("unpaid_sessions", "/finances/income?tab=pending&range=all"),
      tone: "warning" as const,
    },
    {
      key: "debt",
      icon: Receipt,
      show: Number(stats?.outstandingBalance ?? 0) > 0,
      title: `${t("ops.totalDebt")}: ${cs}${Number(stats?.outstandingBalance ?? 0).toLocaleString()}`,
      sub: t("dashm.debtSub"),
      onClick: () => onOpenWidget("total_debt", "/finances/income?tab=pending&range=all"),
      tone: "danger" as const,
    },
    {
      key: "noNext",
      icon: CalendarDays,
      show: clientsWithoutNextSessionCount > 0,
      title: t("dashm.clientsWithoutNext", { count: clientsWithoutNextSessionCount }),
      sub: t("dashm.clientsWithoutNextSub"),
      onClick: () => onOpenWidget("clients_without_next_session", "/clients?filter=withoutNextSession"),
      tone: "info" as const,
    },
    {
      key: "lost",
      icon: FileSignature,
      show: Number(stats?.lostIncomeThisMonth ?? 0) > 0,
      title: `${t("ops.lostIncomeCancellations")}: ${cs}${Number(stats?.lostIncomeThisMonth ?? 0).toLocaleString()}`,
      sub: t("dashm.lostSub", { count: Number(stats?.cancelledSessionsThisMonth ?? 0) }),
      onClick: () => onOpenWidget("lost_income", "/calendar"),
      tone: "muted" as const,
    },
  ].filter((a) => a.show);

  const rows = [
    { icon: Users, label: t("ops.activeClientsThisMonth"), value: String(stats?.activeClientsThisMonth ?? 0), sub: t("dashm.activeSub"), path: "/clients?filter=activeThisMonth" },
    { icon: UserPlus, label: t("ops.newClientsThisMonth"), value: String(stats?.newClientsThisMonth ?? 0), sub: t("dashm.newSub"), path: "/clients?filter=newThisMonth" },
    { icon: UserCheck, label: t("ops.completedTherapyThisMonth"), value: String(stats?.completedTherapyThisMonth ?? 0), sub: t("dashm.completedSub"), path: "/clients?filter=completedThisMonth" },
    { icon: UserMinus, label: t("ops.droppedTherapyThisMonth"), value: String(stats?.droppedTherapyThisMonth ?? 0), sub: t("dashm.droppedSub"), path: "/clients?filter=droppedThisMonth" },
    { icon: XCircle, label: t("ops.cancelledSessionsThisMonth"), value: String(stats?.cancelledSessionsThisMonth ?? 0), sub: t("dashm.cancelledSub"), path: "/calendar" },
    { icon: Wallet, label: t("ops.monthlyExpensesTotal"), value: `${cs}${Number(stats?.monthlyExpenses ?? 0).toLocaleString()}`, sub: t("dashm.expensesSub"), path: "/finances/expenses" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-card border border-border rounded-[20px] px-5 sm:px-7 py-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground capitalize">
              {monthLabel}
            </h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">{t("dashm.subtitle")}</p>
          </div>
          <button
            onClick={() => navigate("/finances")}
            className="self-start sm:self-auto inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {t("dashm.openFinances")} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-4 items-start">
        {/* Left — month breakdown */}
        <section className="bg-card border border-border rounded-[20px] shadow-card overflow-hidden">
          <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-border">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate">{t("ops.monthlyOverview")}</h2>
              <span className="hidden sm:inline-flex text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                {rangeLabel}
              </span>
            </div>
            <button
              onClick={() => navigate("/calendar")}
              className="text-xs font-semibold text-primary inline-flex items-center gap-1.5 whitespace-nowrap hover:opacity-80"
            >
              {t("nav.calendar")} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li
                key={r.label}
                onClick={() => navigate(r.path)}
                className="group flex items-center gap-4 px-5 sm:px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <r.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{r.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.sub}</p>
                </div>
                <p className="text-lg font-bold tabular-nums text-foreground whitespace-nowrap">{r.value}</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </li>
            ))}
          </ul>
          <div className="px-5 sm:px-6 py-3.5 bg-muted/40 border-t border-border flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-2">
              <Info className="h-3.5 w-3.5" />
              {t("dashm.sessionsSummary", { conducted: derived.conducted, planned: derived.planned })}
            </span>
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {derived.totalSessions}
            </span>
          </div>
        </section>

        {/* Right — attention + unpaid */}
        <div className="space-y-4">
          <section className="bg-card border border-border rounded-[20px] shadow-card overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-2 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">{t("dashm.needsAttention")}</h2>
              {attention.length > 0 && (
                <span className="text-[11px] font-bold h-5 min-w-5 px-1.5 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center">
                  {attention.length}
                </span>
              )}
            </div>
            {attention.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">{t("dashm.allClear")}</p>
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
                      <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.sub}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-card border border-border rounded-[20px] shadow-card overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between gap-2 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">{t("dashm.recentUnpaid")}</h2>
              <button
                onClick={() => navigate("/finances/income?tab=pending&range=all")}
                className="text-xs font-semibold text-primary inline-flex items-center gap-1.5 hover:opacity-80 whitespace-nowrap"
              >
                {t("dashm.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {derived.unpaid.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">{t("dashm.noUnpaid")}</p>
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {derived.unpaid
                    .slice()
                    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
                    .slice(0, 4)
                    .map((a) => (
                      <li
                        key={a.id}
                        onClick={() => navigate(`/calendar?appointmentId=${a.id}`)}
                        className="flex items-start gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {a.clients?.name ?? a.group_sessions?.groups?.name ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {a.services?.name ?? "—"} ·{" "}
                            {new Intl.DateTimeFormat(lang, { day: "2-digit", month: "2-digit" }).format(new Date(a.scheduled_at))}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold tabular-nums text-foreground">
                            {cs}{Number(a.price ?? 0).toLocaleString()}
                          </p>
                          <span className="inline-flex mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-destructive/30 text-destructive">
                            {t("ops.unpaid")}
                          </span>
                        </div>
                      </li>
                    ))}
                </ul>
                <div className="px-5 py-3.5 border-t border-border flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{t("dashm.totalDue")}</span>
                  <span className="text-lg font-bold tabular-nums text-foreground">
                    {cs}{derived.unpaidTotal.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* Bottom — practice + income */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-4 items-start">
        <section className="bg-card border border-border rounded-[20px] shadow-card px-5 sm:px-6 py-5">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <h2 className="text-base font-semibold text-foreground">{t("dashm.practiceThisMonth")}</h2>
            <span className="text-xs text-muted-foreground">{rangeLabel}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatTile icon={CalendarDays} tone="info" value={String(derived.conducted)} label={t("dashm.sessions")} sub={t("dashm.ofPlanned", { count: derived.totalSessions })} />
            <StatTile icon={Users} tone="info" value={String(derived.clientCount)} label={t("dashm.clients")} sub={t("dashm.activeShort")} />
            <StatTile icon={Clock} tone="info" value={`${derived.hours.toFixed(1)} ${t("dashm.hoursShort")}`} label={t("dashm.therapy")} sub={t("dashm.conductedShort")} />
            <StatTile icon={DollarSign} tone="success" value={`${cs}${income.toLocaleString()}`} label={t("dashm.income")} sub={t("dashm.received")} />
            <StatTile icon={Percent} tone="warning" value={`${occupancy}%`} label={t("dashm.occupancy")} sub={t("dashm.thisMonthShort")} />
          </div>
        </section>

        <section className="bg-card border border-border rounded-[20px] shadow-card px-5 sm:px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground inline-flex items-center gap-1.5">
                {t("dashm.incomeThisMonth")} <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </h2>
              <p className="text-xs text-muted-foreground mt-1">{rangeLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-foreground">{cs}{expectedIncome.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{t("dashm.expectedIncome")}</p>
            </div>
          </div>
          <div className="mt-5">
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground tabular-nums">
              <span>{cs}0</span>
              <span className="font-semibold text-foreground">{cs}{income.toLocaleString()}</span>
              <span>{cs}{expectedIncome.toLocaleString()}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground text-right">{t("dashm.monthGoal")}</p>
          </div>
          {derived.unpaidTotal > 0 && (
            <p className="mt-4 text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-warning" />
              {t("dashm.pendingHint", { amount: `${cs}${derived.unpaidTotal.toLocaleString()}` })}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, value, label, sub, tone }: {
  icon: any; value: string; label: string; sub?: string;
  tone: "info" | "success" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-4 flex flex-col items-center text-center min-w-0">
      <div className={cn(
        "h-9 w-9 rounded-full flex items-center justify-center mb-2",
        tone === "info" && "bg-primary/10 text-primary",
        tone === "success" && "bg-success/10 text-success",
        tone === "warning" && "bg-warning/15 text-warning",
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-bold tabular-nums text-foreground leading-none break-all">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-2 leading-snug break-words">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground leading-snug break-words">{sub}</p>}
    </div>
  );
}
