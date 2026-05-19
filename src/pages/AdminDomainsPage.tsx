import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ExternalLink, CheckCircle2, XCircle } from "lucide-react";

type DomainKey = "apex" | "www";

type DomainStatus = {
  key: DomainKey;
  host: string;
  url: string;
  role: "redirect" | "primary";
  state: "checking" | "active" | "unreachable";
  latencyMs?: number;
  checkedAt?: string;
};

const DOMAINS: Omit<DomainStatus, "state">[] = [
  { key: "apex", host: "solo-bizz.com", url: "https://solo-bizz.com/", role: "redirect" },
  { key: "www", host: "www.solo-bizz.com", url: "https://www.solo-bizz.com/", role: "primary" },
];

async function probe(url: string): Promise<{ ok: boolean; ms: number }> {
  const started = performance.now();
  try {
    // no-cors: cross-origin probe, opaque response. Resolves iff the host
    // accepted the TCP+TLS handshake and returned any HTTP response.
    await fetch(url, { method: "GET", mode: "no-cors", cache: "no-store", redirect: "follow" });
    return { ok: true, ms: Math.round(performance.now() - started) };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - started) };
  }
}

export default function AdminDomainsPage() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<DomainStatus[]>(
    DOMAINS.map((d) => ({ ...d, state: "checking" }))
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(Boolean(data));
    });
  }, [user]);

  async function runChecks() {
    setBusy(true);
    setRows((prev) => prev.map((r) => ({ ...r, state: "checking" })));
    const results = await Promise.all(
      DOMAINS.map(async (d) => {
        const { ok, ms } = await probe(d.url);
        return {
          ...d,
          state: ok ? ("active" as const) : ("unreachable" as const),
          latencyMs: ms,
          checkedAt: new Date().toISOString(),
        };
      })
    );
    setRows(results);
    setBusy(false);
  }

  useEffect(() => {
    if (isAdmin) runChecks();
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

  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Custom domains</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live status of the apex and www hosts for solo-bizz.com.
            </p>
          </div>
          <Button onClick={runChecks} disabled={busy} variant="outline" size="sm">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Re-check
          </Button>
        </header>

        <div className="grid gap-4">
          {rows.map((row) => (
            <Card key={row.key}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base font-mono">{row.host}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {row.role === "primary" ? "Primary — serves the app" : "Redirects to www.solo-bizz.com"}
                  </p>
                </div>
                <StatusBadge state={row.state} />
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="space-y-0.5">
                  <div>
                    Last checked:{" "}
                    {row.checkedAt ? new Date(row.checkedAt).toLocaleTimeString() : "—"}
                  </div>
                  {typeof row.latencyMs === "number" && (
                    <div>Round-trip: {row.latencyMs} ms</div>
                  )}
                </div>
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Note: browsers return opaque responses for cross-origin probes, so this check
          confirms the host is reachable and serving traffic. For exact HTTP status and
          redirect headers, run the <code className="font-mono">apex-redirect</code> e2e spec
          against production DNS.
        </p>
      </div>
    </AppLayout>
  );
}

function StatusBadge({ state }: { state: DomainStatus["state"] }) {
  if (state === "checking") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking
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
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      Unreachable
    </Badge>
  );
}
