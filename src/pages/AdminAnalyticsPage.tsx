import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, BarChart3 } from "lucide-react";

const ADMIN_EMAIL = "o.gilevich@gmail.com";

type EventRow = {
  id: string;
  user_id: string | null;
  event_name: string;
  domain: string | null;
  path: string | null;
  device_type: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country: string | null;
  created_at: string;
};

// Each funnel step maps to one or more event names — events evolve over time,
// so we count all known aliases together to keep the funnel meaningful.
const FUNNEL_STEPS: { keys: string[]; label: string }[] = [
  { keys: ["website_page_view", "landing_view", "$pageview"], label: "Landing visit" },
  { keys: ["auth_page_opened"], label: "Opened auth" },
  { keys: ["registration_completed", "sign_up_completed"], label: "Registered" },
  { keys: ["login_completed"], label: "Logged in" },
  { keys: ["product_entered"], label: "Entered product" },
  { keys: ["first_client_created", "client_created"], label: "Created a client" },
  { keys: ["first_appointment_created", "session_created"], label: "Created a session" },
  { keys: ["pricing_page_viewed", "pricing_view"], label: "Viewed pricing" },
  { keys: ["stripe_checkout_opened", "stripe_checkout_started", "checkout_started"], label: "Opened checkout" },
  { keys: ["subscription_completed", "subscription_active", "checkout_completed"], label: "Subscribed" },
];

const RANGES = [
  { key: "1d", label: "Last 24h", days: 1 },
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
];

export default function AdminAnalyticsPage() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<EventRow[]>([]);
  const [allDomains, setAllDomains] = useState<string[]>([]);
  const [rangeKey, setRangeKey] = useState("7d");
  const [domainFilter, setDomainFilter] = useState<string>("all");

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  async function load() {
    setBusy(true);
    try {
      const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      let query = (supabase
        .from("user_activity_events") as any)
        .select("id,user_id,event_name,domain,path,device_type,source,utm_source,utm_medium,utm_campaign,country,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (domainFilter !== "all") {
        query = query.eq("domain", domainFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      setRows((data as EventRow[]) ?? []);
    } finally Ie { /* handled by UI state */ } finally {
      setBusy(false);
    }
  }

  async function loadDomains() {
    try {
      const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase.rpc as any)("get_distinct_domains", { since_date: since });
      if (error) {
        const { data: fallback } = await (supabase
          .from("user_activity_events") as any)
          .select("domain")
          .gte("created_at", since)
          .order("domain", { ascending: true })
          .limit(5000);
        const domains = [...new Set<string>((fallback ?? []).map((r: any) => r.domain).filter(Boolean))];
        setAllDomains(domains);
        return;
      }
      setAllDomains((data ?? []).filter(Boolean));
    } catch { /* noop */ }
  }

  useEffect(() => {
    if (isAdmin) {
      load();
      loadDomains();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, rangeKey, domainFilter]);

  const stats = useMemo(() => {
    const totals: Record<string, number> = {};
    const usersPerEvent: Record<string, Set<string>> = {};
    const byDevice: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const byPath: Record<string, number> = {};
    for (const r of rows) {
      totals[r.event_name] = (totals[r.event_name] ?? 0) + 1;
      if (r.user_id) {
        (usersPerEvent[r.event_name] ??= new Set()).add(r.user_id);
      }
      if (r.device_type) byDevice[r.device_type] = (byDevice[r.device_type] ?? 0) + 1;
      const src = r.utm_source || r.source || "direct";
      bySource[src] = (bySource[src] ?? 0) + 1;
      if (r.country) byCountry[r.country] = (byCountry[r.country] ?? 0) + 1;
      if (r.path) byPath[r.path] = (byPath[r.path] ?? 0) + 1;
    }
    const uniqueUsers = new Set(rows.map((r) => r.user_id).filter(Boolean) as string[]).size;
    return { totals, usersPerEvent, byDevice, bySource, byCountry, byPath, uniqueUsers };
  }, [rows]);

  const funnel = useMemo(() => {
    const sumStep = (keys: string[]) => {
      let count = 0;
      const users = new Set<string>();
      for (const k of keys) {
        count += stats.totals[k] ?? 0;
        stats.usersPerEvent[k]?.forEach((u) => users.add(u));
      }
      return { count, users: users.size };
    };
    const top = sumStep(FUNNEL_STEPS[0].keys).count;
    return FUNNEL_STEPS.map((s) => {
      const { count, users } = sumStep(s.keys);
      const pct = top > 0 ? Math.round((count / top) * 100) : 0;
      return { ...s, count, users, pct };
    });
  }, [stats]);

  if (loading) {
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
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={rangeKey} onValueChange={setRangeKey}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total events" value={rows.length} />
          <StatCard label="Unique users" value={stats.uniqueUsers} />
          <StatCard label="Registrations" value={stats.totals["registration_completed"] ?? 0} />
          <StatCard label="Subscriptions" value={stats.totals["subscription_completed"] ?? 0} />
        </div>

        <Card>
          <CardHeader><CardTitle>Conversion funnel</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {funnel.map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground">{s.count} events · {s.users} users · {s.pct}%</span>
                </div>
                <div className="h-2 rounded bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <BreakdownCard title="By source" data={stats.bySource} />
          <BreakdownCard title="By device" data={stats.byDevice} />
          <BreakdownCard title="By country" data={stats.byCountry} />
          <BreakdownCard title="Top pages" data={stats.byPath} />
        </div>

        <Card>
          <CardHeader><CardTitle>Recent events</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 100).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-medium text-xs">{r.event_name}</TableCell>
                    <TableCell className="text-xs">{r.path ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.utm_source || r.source || "direct"}</TableCell>
                    <TableCell className="text-xs">{r.device_type ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.user_id ? r.user_id.slice(0, 8) : "anon"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = entries[0]?.[1] ?? 1;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 && <div className="text-sm text-muted-foreground">No data</div>}
        {entries.map(([k, v]) => (
          <div key={k} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="truncate pr-2">{k}</span>
              <span className="text-muted-foreground">{v}</span>
            </div>
            <div className="h-1.5 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary/70" style={{ width: `${(v / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
