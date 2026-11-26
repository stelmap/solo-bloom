import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { groupFormText } from "@/i18n/groupFormText";

export function GroupMeetingsSection({ group, sessions, membersCount, onAttendance }: {
  group: any; sessions: any[]; membersCount: number; onAttendance: (groupSessionId: string) => void;
}) {
  const { t, lang } = useLanguage();
  const gf = groupFormText(lang);
  const navigate = useNavigate();
  const { symbol: cs } = useCurrency();
  return (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold flex-1">{t("groups.sessions")} ({sessions.length})</h2>
            <Button size="sm" disabled={group.lifecycle_status !== "active" || membersCount === 0} onClick={() => navigate(`/calendar?new=1&groupId=${group.id}`)}>
              <Plus className="h-4 w-4 mr-1" />{gf.addSession}
            </Button>
          </div>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">{t("groups.noSessions")}</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((gs: any) => {
                const apt = gs.appointments;
                if (!apt) return null;
                const dateStr = format(new Date(apt.scheduled_at), "dd.MM.yyyy HH:mm");
                return (
                  <div key={gs.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{apt.services?.name || t("groups.session")} — {dateStr}</p>
                      <p className="text-xs text-muted-foreground">{apt.duration_minutes} {t("common.minutes")} · {cs}{Number(apt.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={apt.status === "completed" ? "default" : "secondary"} className="text-xs">
                        {apt.status}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => onAttendance(gs.id)}>
                        {t("groups.attendance")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
  );
}
