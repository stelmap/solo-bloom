import { AppLayout } from "@/components/AppLayout";
import { BackButton } from "@/components/BackButton";
import { useDashboardStats, useClients, useAppointments } from "@/hooks/useData";
import { useEffect, useMemo } from "react";
import { track } from "@/lib/analytics";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNavigate } from "react-router-dom";
import { UnifiedDashboard } from "@/components/dashboard/UnifiedDashboard";

export default function Dashboard() {
  const { data: stats } = useDashboardStats();
  const { data: allClients = [] } = useClients();
  const { data: allAppointments = [] } = useAppointments();
  const { lang } = useLanguage();
  const navigate = useNavigate();

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

  useEffect(() => {
    track("dashboard_viewed", { range: "month", lang });
    track("dashboard_opened", { lang });
  }, [lang]);

  const openWidget = (widget: string, path: string) => {
    track("dashboard_widget_clicked", { widget, range: "month", lang });
    navigate(path);
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <BackButton />
        <UnifiedDashboard
          stats={stats}
          clientsWithoutNextSessionCount={clientsWithoutNextSessionCount}
          onOpenWidget={openWidget}
        />
      </div>
    </AppLayout>
  );
}
