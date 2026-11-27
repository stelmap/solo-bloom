import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarDays, Clock, Plus, ChevronLeft, ChevronRight, AlertTriangle, Sparkles, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useProfile } from "@/hooks/useData";
import { groupFormText } from "@/i18n/groupFormText";
import { groupTabsText } from "@/i18n/groupTabsText";
import { practiceClock } from "@/lib/calendarClock";
import { splitMeetings, paginate, isOverdue, STATUS_KEY } from "@/lib/groupMeetings";
import { cn } from "@/lib/utils";

export function GroupMeetingsSection({ group, sessions, membersCount, onAttendance }: {
  group: any; sessions: any[]; membersCount: number; onAttendance: (groupSessionId: string) => void;
}) {
  const { t, lang } = useLanguage();
  const gf = groupFormText(lang);
  const gt = groupTabsText(lang);
  const navigate = useNavigate();
  const { symbol: cs } = useCurrency();
  const { data: profile } = useProfile();
  const [instant, setInstant] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setInstant(Date.now()), 15_000); return () => window.clearInterval(timer); }, []);
  const clock = practiceClock(profile?.timezone, instant);
  const now = clock.wallClockMs;
  const { upcoming, history } = useMemo(() => splitMeetings(sessions, now), [sessions, now]);
  const [view, setView] = useState<"upcoming" | "history">("upcoming");
  const [page, setPage] = useState(1);
  const pg = paginate(history, page);
  const addDisabled = group.lifecycle_status !== "active" || membersCount === 0;
  const fmt = (iso: string) => new Intl.DateTimeFormat(lang, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const statusLabel = (s: string) => (STATUS_KEY[s] ? t(STATUS_KEY[s]) : s);
  const addBtn = (
    <Button size="sm" disabled={addDisabled} onClick={() => navigate(`/calendar?new=1&groupId=${group.id}`)}>
      <Plus className="h-4 w-4 mr-1" />{gf.addSession}
    </Button>
  );

  const row = (gs: any, withAttendance: boolean) => {
    const apt = gs.appointments;
    const overdue = isOverdue(gs, now);
    return (
      <div key={gs.id} className="flex flex-wrap items-center gap-3 py-3 border-b border-border last:border-0">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><CalendarDays className="h-5 w-5" /></div>
        <div className="flex-1 min-w-[180px]">
          <p className="text-sm font-semibold text-foreground">{apt.scheduled_at.slice(0, 10) === clock.dateKey && <span className="text-primary mr-2">{t("calendar.today")}</span>}{fmt(apt.scheduled_at)}</p>
          <p className="text-xs text-muted-foreground">{apt.services?.name || t("groups.session")} · {cs}{Number(apt.price).toFixed(2)}</p>
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />{apt.duration_minutes} {t("common.minutes")}</span>
        <Badge variant={apt.status === "completed" ? "default" : "secondary"} className="text-xs">{statusLabel(apt.status)}</Badge>
        {overdue && <Badge variant="outline" className="text-xs text-warning border-warning/40"><AlertTriangle className="h-3 w-3 mr-1" />{gt.overdue}</Badge>}
        <div className="flex items-center gap-2">
          {withAttendance && <Button variant="outline" size="sm" onClick={() => onAttendance(gs.id)}>{t("groups.attendance")}</Button>}
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate(`/calendar?appointmentId=${apt.id}`)}>
            <Calendar className="h-4 w-4 mr-1" />{gt.openCalendar}
          </Button>
        </div>
      </div>
    );
  };

  if (sessions.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold">{gt.upcoming}</h2>
        <div className="text-center py-6 space-y-3">
          <div className="relative mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <CalendarDays className="h-8 w-8" />
            <Sparkles className="absolute -top-2 -right-3 h-4 w-4" />
          </div>
          <h3 className="text-lg font-semibold">{gt.noMeetings}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{gt.noMeetingsHint}</p>
          <div className="flex justify-center items-center gap-3 flex-wrap">
            {addBtn}
            <Button size="sm" variant="ghost" className="text-primary" onClick={() => navigate("/calendar")}><ExternalLink className="h-4 w-4 mr-1" />{gt.openCalendarAll}</Button>
          </div>
        </div>
      </div>
    );
  }

  const tabBtn = (v: "upcoming" | "history", label: string, n: number) => (
    <button type="button" onClick={() => setView(v)}
      className={cn("px-3 py-1.5 text-sm rounded-md transition-colors", view === v ? "bg-background shadow-sm font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}>
      {label} ({n})
    </button>
  );

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="inline-flex rounded-lg bg-muted p-1 flex-1 sm:flex-none">
          {tabBtn("upcoming", gt.upcoming, upcoming.length)}
          {tabBtn("history", gt.history, history.length)}
        </div>
        <div className="ml-auto">{addBtn}</div>
      </div>
      {view === "upcoming" ? (
        upcoming.length === 0 ? (
          <div className="text-center py-6 space-y-1">
            <p className="font-medium">{gt.noUpcoming}</p>
            {history.length > 0 && <button type="button" className="text-sm text-primary hover:underline" onClick={() => setView("history")}>{gt.noUpcomingHint}</button>}
          </div>
        ) : <div>{upcoming.map(gs => row(gs, true))}</div>
      ) : history.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{gt.noHistory}</p>
      ) : (
        <>
          <div>{pg.items.map(gs => row(gs, true))}</div>
          {pg.pages > 1 && (
            <div className="flex items-center justify-between pt-3">
              <Button variant="outline" size="sm" disabled={pg.page <= 1} onClick={() => setPage(pg.page - 1)}><ChevronLeft className="h-4 w-4 mr-1" />{gt.prev}</Button>
              <span className="text-xs text-muted-foreground">{gt.pageOf.replace("{p}", String(pg.page)).replace("{n}", String(pg.pages))}</span>
              <Button variant="outline" size="sm" disabled={pg.page >= pg.pages} onClick={() => setPage(pg.page + 1)}>{gt.next}<ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
