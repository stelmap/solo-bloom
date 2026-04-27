import { AppLayout } from "@/components/AppLayout";
import { useDashboardStats, useProfile, useExpectedPayments } from "@/hooks/useData";
import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { formatScheduledTime } from "@/lib/timeFormat";
import {
  Users, CalendarClock, CheckCircle2, DollarSign, Hourglass,
  PlayCircle, ArrowRight, Receipt, AlertCircle, XCircle, RotateCcw,
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

const PAID_STATUSES = new Set(["paid_now", "paid_in_advance"]);
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
  const { data: expectedPayments = [] } = useExpectedPayments();
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();
  const navigate = useNavigate();
  const use12h = (profile as any)?.time_format === "12h";

  const todayAppointments: Apt[] = (stats?.todayAppointments as Apt[]) ?? [];

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

      const isCountableForPayment = apt.status !== "cancelled" && apt.status !== "rescheduled";
      if (isCountableForPayment) {
        if (PAID_STATUSES.has(apt.payment_status)) {
          paidCount++;
          amountReceived += Number(apt.price ?? 0);
        } else if (UNPAID_STATUSES.has(apt.payment_status)) {
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

  const pendingTotal = (expectedPayments as any[]).reduce((s, ep) => s + Number(ep.amount ?? 0), 0);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">{t("dashboard.loading")}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("dashboard.greeting")}</h1>
          <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
        </div>

        {/* A. Today Overview */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("ops.todayOverview")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <OverviewTile icon={Users} label={t("ops.clientsToday")} value={summary.clientCount.toString()} />
            <OverviewTile icon={CalendarClock} label={t("ops.sessionsPlanned")} value={(summary.planned + summary.completed).toString()} />
            <OverviewTile icon={CheckCircle2} label={t("ops.sessionsCompleted")} value={summary.completed.toString()} tone="success" />
            <OverviewTile icon={DollarSign} label={t("ops.paidToday")} value={`${cs}${summary.amountReceived.toLocaleString()}`} tone="success" />
            <OverviewTile icon={Hourglass} label={t("ops.remainingToday")} value={summary.remaining.toString()} tone="warning" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <OverviewTile icon={CheckCircle2} label="Done paid" value={completedPaidTotal.toString()} tone="success" />
            <OverviewTile icon={Hourglass} label="Done not paid" value={completedUnpaidTotal.toString()} tone="warning" />
            <OverviewTile icon={XCircle} label="Cancelled sessions" value={cancelledTotal.toString()} />
          </div>
        </section>

        {/* B. Now / Next */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
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

        {/* C. Today Schedule Snapshot */}
        <section className="bg-card rounded-xl border border-border p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">{t("ops.scheduleSnapshot")}</h2>
            <button
              onClick={() => navigate("/calendar")}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              {t("nav.calendar")} <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {todayAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("ops.empty")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {todayAppointments
                .slice()
                .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                .map((apt) => {
                  const isGroup = !!apt.group_session_id;
                  const typeLabel = isGroup ? t("ops.group") : t("ops.individual");
                  return (
                    <li key={apt.id} className="py-3 flex items-center gap-4">
                      <div className="text-center min-w-[56px]">
                        <p className="text-sm font-semibold text-foreground">
                          {formatScheduledTime(apt.scheduled_at, use12h)}
                        </p>
                        <p className="text-xs text-muted-foreground">{apt.duration_minutes}{t("common.min")}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {apt.clients?.name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {typeLabel} · {apt.services?.name ?? "—"}
                        </p>
                      </div>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusBadgeClass(apt.status))}>
                        {t((`status.${apt.status === "no-show" ? "noShow" : apt.status}`) as any)}
                      </span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline-flex", paymentBadgeClass(apt.payment_status))}>
                        {PAID_STATUSES.has(apt.payment_status)
                          ? t("payment.paid")
                          : apt.payment_status === "waiting_for_payment"
                          ? t("payment.waiting")
                          : apt.payment_status === "unpaid"
                          ? t("ops.unpaid")
                          : t("payment.na")}
                      </span>
                      <button
                        onClick={() => navigate(`/calendar?appointmentId=${apt.id}`)}
                        className="text-xs text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted transition-colors"
                        aria-label={t("ops.openRecord")}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>

        {/* D + E: Status & Payment summaries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <h2 className="font-semibold text-foreground mb-4">{t("ops.statusSummary")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatusPill icon={CalendarClock} label={t("status.scheduled")} value={summary.planned} />
              <StatusPill icon={CheckCircle2} label={t("status.completed")} value={summary.completed} tone="success" />
              <StatusPill icon={XCircle} label={t("status.cancelled")} value={summary.cancelled} tone="destructive" />
              <StatusPill icon={AlertCircle} label={t("status.noShow")} value={summary.noShow} tone="warning" />
              <StatusPill icon={RotateCcw} label={t("status.rescheduled")} value={summary.rescheduled} />
            </div>
          </section>

          <section className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <h2 className="font-semibold text-foreground mb-4">{t("ops.paymentSummary")}</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatusPill icon={DollarSign} label={t("payment.paid")} value={summary.paidCount} tone="success" />
              <StatusPill icon={Hourglass} label={t("ops.unpaid")} value={summary.unpaidCount} tone="warning" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{t("ops.amountReceived")}</p>
                <p className="text-lg font-semibold text-success mt-0.5">{cs}{summary.amountReceived.toLocaleString()}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{t("ops.pendingAmount")}</p>
                <p className="text-lg font-semibold text-warning mt-0.5">{cs}{(summary.amountPending + pendingTotal).toLocaleString()}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function OverviewTile({
  icon: Icon, label, value, tone,
}: { icon: any; label: string; value: string; tone?: "success" | "warning" }) {
  const toneClass =
    tone === "success" ? "text-success" :
    tone === "warning" ? "text-warning" :
    "text-foreground";
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-fade-in">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs">{label}</p>
      </div>
      <p className={cn("text-xl font-bold mt-1.5", toneClass)}>{value}</p>
    </div>
  );
}

function StatusPill({
  icon: Icon, label, value, tone,
}: { icon: any; label: string; value: number; tone?: "success" | "warning" | "destructive" }) {
  const toneClass =
    tone === "success" ? "text-success" :
    tone === "warning" ? "text-warning" :
    tone === "destructive" ? "text-destructive" :
    "text-foreground";
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs truncate">{label}</p>
      </div>
      <p className={cn("text-xl font-bold mt-0.5", toneClass)}>{value}</p>
    </div>
  );
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
  const Icon = kind === "now" ? PlayCircle : ArrowRight;
  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-4 w-4", kind === "now" ? "text-primary" : "text-muted-foreground")} />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      </div>
      {!apt ? (
        <p className="text-sm text-muted-foreground py-4">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-base font-semibold text-foreground truncate">{apt.clients?.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground truncate">
              {formatScheduledTime(apt.scheduled_at, use12h)} · {apt.services?.name ?? "—"}
              {" · "}
              {apt.group_session_id ? t("ops.group") : t("ops.individual")}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", paymentBadgeClass(apt.payment_status))}>
              {PAID_STATUSES.has(apt.payment_status)
                ? `${t("payment.paid")} · ${cs}${Number(apt.price).toFixed(0)}`
                : apt.payment_status === "waiting_for_payment"
                ? t("payment.waiting")
                : t("ops.unpaid")}
            </span>
            <button
              onClick={onOpen}
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              {openLabel} <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
