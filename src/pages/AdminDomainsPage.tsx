import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, RefreshCw, ExternalLink, CheckCircle2, XCircle, Bell, Mail,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type DomainRow = {
  host: string;
  last_state: "active" | "unreachable" | "unknown";
  last_status_code: number | null;
  last_latency_ms: number | null;
  last_error: string | null;
  last_checked_at: string;
  last_transition_at: string;
};

const KNOWN_HOSTS: { host: string; url: string; role: "redirect" | "primary" }[] = [
  { host: "solo-bizz.com", url: "https://solo-bizz.com/", role: "redirect" },
  { host: "www.solo-bizz.com", url: "https://www.solo-bizz.com/", role: "primary" },
];

const NOTIFY_EMAIL = "o.gilevich@gmail.com";

export default function AdminDomainsPage() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(Boolean(data));
    });
  }, [user]);

  async function fetchRows() {
    setLoadingRows(true);
    const { data, error } = await supabase
      .from("domain_status_checks")
      .select("*")
      .order("host", { ascending: true });
    if (error) {
      toast({ title: "Failed to load domain status", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as DomainRow[]);
    }
    setLoadingRows(false);
  }

  async function runCheckNow() {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("check-domain-status", { body: {} });
      if (error) throw error;
      toast({ title: "Check complete", description: "Latest status saved." });
      await fetchRows();
    } catch (e) {
      toast({
        title: "Check failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    if (isAdmin) fetchRows();
  }, [isAdmin]);

  if (loading || isAdmin === null) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const byHost = new Map(rows.map((r) => [r.host, r]));

  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Custom domains</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Auto-checked every 5 minutes. Status changes are emailed to{" "}
              <span className="font-mono">{NOTIFY_EMAIL}</span>.
            </p>
          </div>
          <Button onClick={runCheckNow} disabled={running} variant="outline" size="sm">
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run check now
          </Button>
        </header>

        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <Bell className="h-4 w-4 text-primary shrink-0" />
            <span>
              Alert emails are sent on <strong>state transitions only</strong> — once when a
              domain goes down (or SSL fails) and once when it recovers. No spam on steady state.
            </span>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {KNOWN_HOSTS.map((cfg) => {
            const row = byHost.get(cfg.host);
            return (
              <Card key={cfg.host}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-mono">{cfg.host}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {cfg.role === "primary"
                        ? "Primary — serves the app"
                        : "Redirects to www.solo-bizz.com"}
                    </p>
                  </div>
                  <StatusBadge state={row?.last_state ?? "unknown"} loading={loadingRows} />
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {row ? (
                    <>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div>
                          <span className="text-muted-foreground">Last checked:</span>{" "}
                          {new Date(row.last_checked_at).toLocaleString()}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last change:</span>{" "}
                          {new Date(row.last_transition_at).toLocaleString()}
                        </div>
                        {row.last_status_code !== null && (
                          <div>
                            <span className="text-muted-foreground">HTTP:</span> {row.last_status_code}
                          </div>
                        )}
                        {row.last_latency_ms !== null && (
                          <div>
                            <span className="text-muted-foreground">Latency:</span> {row.last_latency_ms} ms
                          </div>
                        )}
                      </div>
                      {row.last_error && (
                        <div className="text-destructive">
                          <span className="text-muted-foreground">Error:</span> {row.last_error}
                        </div>
                      )}
                    </>
                  ) : (
                    <div>No checks recorded yet.</div>
                  )}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <Mail className="h-3.5 w-3.5" />
                      Notifies {NOTIFY_EMAIL}
                    </span>
                    <a
                      href={cfg.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Open <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

function StatusBadge({
  state, loading,
}: { state: DomainRow["last_state"]; loading: boolean }) {
  if (loading) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading
      </Badge>
    );
  }
  if (state === "active") {
    return (
      <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30">
        <CheckCircle2 className="h-3 w-3" />
        Active
      </Badge>
    );
  }
  if (state === "unreachable") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Unreachable
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      Unknown
    </Badge>
  );
}
