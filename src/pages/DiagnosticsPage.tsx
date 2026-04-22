import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  getDiagnostics,
  subscribeDiagnostics,
  trackDiagnosticPing,
  type AnalyticsDiagnostics,
} from "@/lib/analytics";

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleTimeString()} (${Math.max(0, Math.round((Date.now() - d.getTime()) / 1000))}s ago)`;
}

export default function DiagnosticsPage() {
  const [diag, setDiag] = useState<AnalyticsDiagnostics>(() => getDiagnostics());
  const [, force] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = subscribeDiagnostics(() => setDiag(getDiagnostics()));
    // Re-render every second so "X seconds ago" stays fresh.
    const tick = setInterval(() => force((n) => n + 1), 1000);
    return () => {
      unsub();
      clearInterval(tick);
    };
  }, []);

  const sendPing = () => {
    const { name, at } = trackDiagnosticPing();
    toast({
      title: diag.enabled ? "Ping sent to PostHog" : "Ping recorded locally only",
      description: diag.enabled
        ? `Event "${name}" dispatched at ${new Date(at).toLocaleTimeString()}.`
        : "Analytics is disabled on this host (dev/preview). The event was counted locally but not sent.",
    });
  };

  const eventEntries = Object.entries(diag.countsByEvent).sort((a, b) => b[1] - a[1]);

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Analytics Diagnostics</h1>
          <p className="text-sm text-muted-foreground">
            Live view of PostHog event delivery for this browser session. Counters reset on page reload.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Status">
              {diag.enabled ? (
                <Badge>Enabled — sending to PostHog</Badge>
              ) : (
                <Badge variant="secondary">Disabled (non-production host)</Badge>
              )}
            </Row>
            <Row label="Initialized">{diag.initialized ? "Yes" : "No"}</Row>
            <Row label="Host">
              <code className="text-xs">{diag.host || "—"}</code>
            </Row>
            <Row label="Distinct ID">
              <code className="text-xs break-all">{diag.distinctId ?? "—"}</code>
            </Row>
            <Row label="Session ID">
              <code className="text-xs break-all">{diag.sessionId ?? "—"}</code>
            </Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Event Activity</CardTitle>
            <Button size="sm" onClick={sendPing}>Send test event</Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Total events fired">{diag.totalEvents}</Row>
            <Row label="Last event">
              {diag.lastEvent ? (
                <span>
                  <code className="text-xs">{diag.lastEvent.name}</code> · {formatTime(diag.lastEvent.at)}
                </span>
              ) : (
                "—"
              )}
            </Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Counts by event</CardTitle>
          </CardHeader>
          <CardContent>
            {eventEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet this session. Click "Send test event" above.</p>
            ) : (
              <ul className="text-sm divide-y divide-border">
                {eventEntries.map(([name, count]) => (
                  <li key={name} className="flex items-center justify-between py-2">
                    <code className="text-xs">{name}</code>
                    <span className="font-mono">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent events (last 25)</CardTitle>
          </CardHeader>
          <CardContent>
            {diag.recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing captured yet.</p>
            ) : (
              <ul className="text-sm space-y-2">
                {diag.recentEvents.map((e, i) => (
                  <li key={`${e.at}-${i}`} className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-0">
                    <div className="min-w-0">
                      <code className="text-xs">{e.name}</code>
                      {e.props?.source_page ? (
                        <div className="text-xs text-muted-foreground truncate">
                          on {String(e.props.source_page)}
                        </div>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(e.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Tip: events still appear here even when analytics is disabled (dev/preview). To verify delivery to PostHog, open this page on{" "}
          <code>solo-bizz-app.lovable.app</code> or <code>solo-bizz.com</code>, click <em>Send test event</em>, then check the PostHog Live events view.
        </p>
      </div>
    </AppLayout>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
