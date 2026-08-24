import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ChevronLeft, ChevronRight, CalendarDays, Bell, Clock,
  Receipt, FileSignature, Users, DollarSign, Percent, BarChart3, Info, AlertCircle,
  CheckCircle2, CalendarClock, Wallet, Briefcase, Link2, UserPlus, Check, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useAppointments, useAllIncome, useProfile, useClients, useServices, useWorkingSchedule } from "@/hooks/useData";
import { useBookingLink } from "@/hooks/usePracticeProfile";
import { toast } from "@/hooks/use-toast";
import { formatScheduledTime } from "@/lib/timeFormat";
import { useNeedsAttention } from "@/hooks/useNeedsAttention";

const PAID_STATUSES = new Set(["paid_now", "paid_in_advance", "paid_from_prepayment"]);


type Props = {
  stats: any;
  clientsWithoutNextSessionCount: number;
  onOpenWidget: (widget: string, path: string) => void;
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/** Today's date (YYYY-MM-DD) in the therapist's configured timezone. */
function todayInTimezone(tz?: string | null) {
  try {
    if (tz) {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      }).format(new Date());
      return parts; // en-CA gives YYYY-MM-DD
    }
  } catch {
    /* fall through */
  }
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Current minutes-since-midnight in the therapist's timezone. */
function nowMinutesInTimezone(tz?: string | null) {
  const d = new Date();
  try {
    if (tz) {
      const f = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(d);
      const [h, m] = f.split(":").map(Number);
      return h * 60 + m;
    }
  } catch {
    /* fall through */
  }
  return d.getHours() * 60 + d.getMinutes();
}

/** Wall-clock minutes of a stored appointment (stored as UTC wall clock). */
function aptMinutes(iso: string) {
  const d = new Date(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function UnifiedDashboard({ stats, clientsWithoutNextSessionCount, onOpenWidget }: Props) {
  const { t, lang } = useLanguage();
  const { symbol: cs } = useCurrency();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: allAppointments = [] } = useAppointments();
  const { data: allClients = [] } = useClients();
  const { data: services = [] } = useServices();
  const { data: workingSchedule = [] } = useWorkingSchedule();
  const { data: bookingLink } = useBookingLink();

  // ---- Setup / empty-state flags (presentation only) ----
  const hasClients = (allClients as any[]).length > 0;
  const hasServices = (services as any[]).length > 0;
  const hasWorkingHours = (workingSchedule as any[]).some((d: any) => d.is_working);
  const bookingHandle = ((bookingLink as any)?.slug || (bookingLink as any)?.token || "") as string;
  const bookingUrl = bookingHandle ? `${window.location.origin}/book/${bookingHandle}` : "";

  const shareBookingLink = () => {
    if (!bookingUrl) {
      navigate("/settings/practice");
      return;
    }
    navigator.clipboard?.writeText(bookingUrl).then(
      () => toast({ title: t("dashe.linkCopied"), description: bookingUrl }),
      () => navigate("/settings/practice"),
    );
  };



  const [monthOffset, setMonthOffset] = useState(0);
  const use12h = (profile as any)?.time_format === "12h";
  const tz = (profile as any)?.timezone as string | undefined;

  const base = new Date();
  const monthStart = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const monthEnd = new Date(base.getFullYear(), base.getMonth() + monthOffset + 1, 0);
  const monthKey = `${monthStart.getFullYear()}-${pad(monthStart.getMonth() + 1)}`;
  const isCurrentMonth = monthOffset === 0;

  const monthLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(monthStart);
    } catch {
      return monthStart.toDateString();
    }
  }, [lang, monthKey]);

  const rangeLabel = useMemo(() => {
    try {
      const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "long" });
      return `${fmt.format(monthStart)} – ${fmt.format(monthEnd)}`;
    } catch {
      return "";
    }
  }, [lang, monthKey]);

  const { data: monthIncomeRows = [] } = useAllIncome(
    `${monthKey}-01`,
    `${monthKey}-${pad(monthEnd.getDate())}`,
  );

  // ---- Today's schedule (therapist local timezone) ----
  const todayKey = todayInTimezone(tz);
  const nowMin = nowMinutesInTimezone(tz);

  const todayLabel = useMemo(() => {
    try {
      const [y, m, d] = todayKey.split("-").map(Number);
      return new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long" })
        .format(new Date(y, m - 1, d));
    } catch {
      return todayKey;
    }
  }, [lang, todayKey]);

  const todaySessions = useMemo(() => {
    const rows = (allAppointments as any[]).filter(
      (a) => String(a.scheduled_at).slice(0, 10) === todayKey && a.status !== "cancelled",
    );
    const map = new Map<string, any>();
    for (const a of rows) {
      const key = a.group_session_id ? `g:${a.group_session_id}` : `c:${a.client_id ?? ""}@${a.scheduled_at}`;
      if (!map.has(key)) map.set(key, a);
    }
    return Array.from(map.values()).sort((a, b) => aptMinutes(a.scheduled_at) - aptMinutes(b.scheduled_at));
  }, [allAppointments, todayKey]);

  const nextSession = useMemo(() => {
    return todaySessions.find(
      (a) => a.status !== "completed" && aptMinutes(a.scheduled_at) + Number(a.duration_minutes ?? 60) > nowMin,
    );
  }, [todaySessions, nowMin]);

  // ---- Month aggregates ----
  const monthApts = useMemo(() => {
    return (allAppointments as any[]).filter((a) => String(a.scheduled_at).slice(0, 7) === monthKey);
  }, [allAppointments, monthKey]);

  const derived = useMemo(() => {
    let conducted = 0, planned = 0, cancelled = 0, hours = 0, lostIncome = 0;
    const unpaid: any[] = [];
    const clientIds = new Set<string>();
    for (const a of monthApts) {
      if (a.client_id) clientIds.add(a.client_id);
      if (a.status === "cancelled") {
        cancelled++;
        if (!PAID_STATUSES.has(a.payment_status)) lostIncome += Number(a.price ?? 0);
        continue;
      }
      if (a.status === "completed") {
        conducted++;
        hours += Number(a.duration_minutes ?? 60) / 60;
        if (!PAID_STATUSES.has(a.payment_status)) unpaid.push(a);
      } else {
        planned++;
      }
    }
    const unpaidTotal = unpaid.reduce((s, a) => s + Number(a.price ?? 0), 0);
    return {
      conducted, planned, cancelled, hours, lostIncome, unpaid, unpaidTotal,
      clientCount: clientIds.size,
      totalSessions: conducted + planned,
    };
  }, [monthApts]);

  const income = useMemo(
    () => (monthIncomeRows as any[]).reduce((s, r) => s + Number(r.amount ?? 0), 0),
    [monthIncomeRows],
  );
  const expectedIncome = income + derived.unpaidTotal;
  const goal = Math.max(expectedIncome, income, 1);
  const progress = Math.min(100, Math.round((income / goal) * 100));
  const capacity = Number(stats?.maxMonthlyCapacity ?? 0);
  const occupancy = capacity > 0 ? Math.round((derived.totalSessions / capacity) * 100) : 0;
  const totalDebt = Number(stats?.outstandingBalance ?? 0);

  const { items: attentionItems } = useNeedsAttention(monthKey);
  const attention = attentionItems.map((a) => ({
    ...a,
    onClick: () => onOpenWidget(a.widget, a.path),
  }));

  // Setup suggestions shown when there is nothing urgent — only incomplete steps.
  const setupSuggestions = [
    { key: "hours", show: !hasWorkingHours, icon: Clock, title: t("dashe.setupHours"), sub: t("dashe.setupHoursSub"), path: "/settings/practice" },
    { key: "service", show: !hasServices, icon: Briefcase, title: t("dashe.setupService"), sub: t("dashe.setupServiceSub"), path: "/services" },
    { key: "clients", show: !hasClients, icon: UserPlus, title: t("dashe.setupClients"), sub: t("dashe.setupClientsSub"), path: "/clients" },
  ].filter((s) => s.show);

  const onboardingSteps = [
    { key: "client", done: hasClients, icon: Users, title: t("dashe.onbStep1"), sub: t("dashe.onbStep1Sub"), path: "/clients" },
    { key: "service", done: hasServices, icon: Briefcase, title: t("dashe.onbStep2"), sub: t("dashe.onbStep2Sub"), path: "/services" },
    { key: "booking", done: !!bookingHandle && hasClients, icon: Link2, title: t("dashe.onbStep3"), sub: t("dashe.onbStep3Sub"), path: "/settings/practice" },
  ];
  const showOnboarding = onboardingSteps.some((s) => !s.done);



  const recentUnpaid = derived.unpaid
    .slice()
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Month header */}
      <div className="bg-card border border-border rounded-[20px] px-5 sm:px-7 py-5 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              aria-label={t("common.previous")}
              onClick={() => setMonthOffset((v) => v - 1)}
              className="h-10 w-10 rounded-xl border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground capitalize truncate">
                {monthLabel}
              </h1>
              <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">{t("dashu.subtitle")}</p>
            </div>
            <button
              type="button"
              aria-label={t("common.next")}
              onClick={() => setMonthOffset((v) => v + 1)}
              className="h-10 w-10 rounded-xl border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={() => navigate("/finances")}
            className="self-start sm:self-auto inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {t("dashm.openFinances")} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-4 items-start">
        {/* Left column — independent height */}
        <div className="flex flex-col gap-4 min-w-0">
        {/* Left — Today's Schedule */}
        <section className="bg-card border border-border rounded-[20px] shadow-card overflow-hidden">
          <div className="px-5 sm:px-6 py-4 flex items-center gap-3 border-b border-border">
            <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{t("dashu.todaysSchedule")}</h2>
          </div>

          <div className="px-5 sm:px-6 pt-5 pb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xl font-bold text-foreground capitalize">{todayLabel}</p>
              <p className="text-sm text-muted-foreground">{t("dashu.todaysSessions")}</p>
            </div>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t("dashu.tzNote")}
            </p>
          </div>

          <ul className="px-5 sm:px-6 pb-4">
            {todaySessions.length === 0 && (
              <li className="py-8 flex flex-col items-center text-center gap-3">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CalendarDays className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground">{t("dashe.noSessionsTitle")}</p>
                  <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{t("dashe.noSessionsDesc")}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-1">
                  <button
                    onClick={() => navigate("/calendar")}
                    className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    {t("dashe.openCalendar")}
                  </button>
                  <button
                    onClick={shareBookingLink}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    <Link2 className="h-4 w-4" />
                    {t("dashe.shareBooking")}
                  </button>
                </div>
              </li>
            )}

            {todaySessions.map((a) => {
              const isNext = nextSession?.id === a.id;
              const isPaid = PAID_STATUSES.has(a.payment_status);
              const name = a.clients?.name ?? a.group_sessions?.groups?.name ?? "—";
              const meta = `${a.services?.name ?? "—"} · ${a.duration_minutes ?? 60} ${t("common.min")}`;
              return (
                <li key={a.id} className="flex gap-4">
                  <div className="w-14 shrink-0 pt-4 text-sm font-semibold tabular-nums text-foreground">
                    {formatScheduledTime(a.scheduled_at, use12h)}
                  </div>
                  <div className="relative flex flex-col items-center shrink-0">
                    <span className="absolute top-0 bottom-0 w-px bg-border" />
                    <span
                      className={cn(
                        "relative mt-[22px] h-2.5 w-2.5 rounded-full",
                        isNext ? "bg-primary" : isPaid ? "bg-success" : "bg-muted-foreground/40",
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0 py-2">
                    {isNext ? (
                      <div className="rounded-2xl border border-primary/40 bg-primary-soft px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/15 text-primary">
                            {t("dashu.next")}
                          </span>
                          <p className="mt-1.5 text-base font-bold text-foreground truncate">{name}</p>
                          <p className="text-xs text-muted-foreground truncate">{meta}</p>
                          <span
                            className={cn(
                              "inline-flex mt-2 text-[11px] font-semibold px-2.5 py-1 rounded-full",
                              isPaid ? "bg-success/15 text-success" : "bg-card border border-border text-muted-foreground",
                            )}
                          >
                            {isPaid ? t("payment.paid") : t("ops.unpaid")}
                          </span>
                        </div>
                        <button
                          onClick={() => navigate(`/calendar?appointmentId=${a.id}`)}
                          className="shrink-0 rounded-xl bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                          {t("dashu.openSession")}
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => navigate(`/calendar?appointmentId=${a.id}`)}
                        className="flex items-center gap-3 py-2 pr-1 cursor-pointer border-b border-border/70 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                          <p className="text-xs text-muted-foreground truncate">{meta}</p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-[11px] font-semibold px-3 py-1 rounded-full",
                            isPaid ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {isPaid ? t("payment.paid") : t("ops.unpaid")}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {todaySessions.length === 0 ? (
            <div className="px-5 sm:px-6 py-3.5 border-t border-border text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t("dashu.tzNote")}
            </div>
          ) : todaySessions.length <= 2 ? (
            <div className="px-5 sm:px-6 py-4 border-t border-border flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarClock className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{t("dashe.openTimeTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("dashe.openTimeSub")}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  onClick={() => navigate("/calendar")}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  {t("dashe.openCalendar")}
                </button>
                <button
                  onClick={shareBookingLink}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  {t("dashe.shareBooking")}
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 sm:px-6 py-4 border-t border-border flex gap-4">
              <span className="w-14 shrink-0 text-sm text-muted-foreground">—</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{t("dashu.noMore")}</p>
                <p className="text-xs text-muted-foreground">{t("dashu.noMoreSub")}</p>
              </div>
            </div>
          )}

        </section>

        <section className="bg-card border border-border rounded-[20px] shadow-card px-5 sm:px-6 py-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground">{t("dashm.practiceThisMonth")}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatTile icon={CalendarDays} tone="info" value={String(derived.conducted)} label={t("dashm.sessions")} sub={t("dashm.ofPlanned", { count: derived.totalSessions })} />
            <StatTile icon={Users} tone="info" value={String(derived.clientCount)} label={t("dashm.clients")} sub={t("dashm.activeShort")} />
            <StatTile icon={Clock} tone="info" value={`${derived.hours.toFixed(1)} ${t("dashm.hoursShort")}`} label={t("dashm.therapy")} sub={t("dashm.conductedShort")} />
            <StatTile icon={DollarSign} tone="success" value={`${cs}${income.toLocaleString()}`} label={t("dashm.income")} sub={t("dashm.received")} />
            <StatTile icon={Percent} tone="warning" value={`${occupancy}%`} label={t("dashm.occupancy")} sub={t("dashm.thisMonthShort")} />
          </div>
          {derived.totalSessions === 0 && derived.clientCount === 0 && income === 0 && (
            <p className="mt-4 text-xs text-muted-foreground text-center">{t("dashe.practiceHint")}</p>
          )}
        </section>


        <div className="px-2 py-2 text-xs text-muted-foreground space-y-1">
          <p className="inline-flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {t("dashu.paidNote1")}
          </p>
          <p className="pl-5">{t("dashu.paidNote2")}</p>
        </div>
        </div>

        {/* Right — finance widgets */}
        <div className="space-y-4">
          <section className="bg-card border border-border rounded-[20px] shadow-card overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3 border-b border-border">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                {t("dashm.needsAttention")}*
                {attention.length > 0 && (
                  <span className="ml-2 tabular-nums text-muted-foreground">{attention.length}</span>
                )}
              </h2>
            </div>
            {attention.length === 0 ? (
              <div>
                <div className="m-4 rounded-2xl border border-success/30 bg-success/10 px-4 py-4 flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{t("dashe.allCaughtUp")}</p>
                    <p className="text-xs text-muted-foreground">{t("dashe.allCaughtUpSub")}</p>
                  </div>
                </div>
                {setupSuggestions.length > 0 && (
                  <ul className="divide-y divide-border border-t border-border">
                    {setupSuggestions.map((s) => (
                      <li
                        key={s.key}
                        onClick={() => navigate(s.path)}
                        className="group flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <s.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{s.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.sub}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

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
              <h2 className="text-base font-semibold text-foreground">{t("dashm.recentUnpaid")}*</h2>
              <button
                onClick={() => onOpenWidget("recent_unpaid_view_all", "/finances/income?tab=pending&range=all")}
                className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:opacity-80 whitespace-nowrap"
              >
                {t("dashm.viewAll")} *
              </button>
            </div>
            {recentUnpaid.length === 0 ? (
              <div className="px-5 py-6 flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
                  <Wallet className="h-6 w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{t("dashe.noUnpaidTitle")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("dashe.noUnpaidSub")}</p>
                </div>
              </div>

            ) : (
              <>
                <ul className="divide-y divide-border">
                  {recentUnpaid.map((a) => (
                    <li
                      key={a.id}
                      onClick={() => navigate(`/calendar?appointmentId=${a.id}`)}
                      className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/50 transition-colors"
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
                      <p className="text-sm font-bold tabular-nums text-foreground shrink-0">
                        {cs}{Number(a.price ?? 0).toLocaleString()}
                      </p>
                      <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-destructive/30 text-destructive">
                        {t("ops.unpaid")}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="px-5 py-3.5 border-t border-border flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{t("dashm.totalDue")}</span>
                  <span className="text-base font-bold tabular-nums text-foreground">
                    {cs}{derived.unpaidTotal.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </section>

          <section className="bg-card border border-border rounded-[20px] shadow-card px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                  <DollarSign className="h-4 w-4 text-success" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-foreground truncate">{t("dashm.incomeThisMonth")}</h2>
                  <p className="text-xs text-muted-foreground truncate">{rangeLabel}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
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
              <p className="mt-1 text-xs text-muted-foreground text-right">{t("dashm.monthGoal")}</p>
            </div>
            {income === 0 && expectedIncome === 0 && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-warning" />
                  {t("dashe.noFinance")}
                </p>
                <button
                  onClick={() => navigate("/finances")}
                  className="self-start rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  {t("dashm.openFinances")}
                </button>
              </div>
            )}
            {derived.unpaidTotal > 0 && (
              <p className="mt-4 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-warning" />
                {t("dashm.pendingHint", { amount: `${cs}${derived.unpaidTotal.toLocaleString()}` })}
              </p>
            )}

          </section>
        </div>
      </div>


      {/* Onboarding — hidden once setup is complete */}
      {showOnboarding && (
        <section className="bg-card border border-border rounded-[20px] shadow-card px-5 sm:px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex items-center gap-3 lg:w-72 shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">{t("dashe.onbTitle")}</h2>
                <p className="text-xs text-muted-foreground">{t("dashe.onbSub")}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 min-w-0">
              {onboardingSteps.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => navigate(s.path)}
                  className="group flex items-center gap-3 rounded-2xl border border-border px-3 py-3 text-left hover:bg-muted/50 transition-colors min-w-0"
                >
                  <span className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    s.done ? "bg-success/15 text-success" : "bg-primary/10 text-primary",
                  )}>
                    {s.done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-semibold truncate", s.done ? "text-muted-foreground line-through" : "text-foreground")}>
                      {s.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{s.sub}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
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
