import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, BarChart3 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

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
  session_id: string | null;
  anonymous_id: string | null;
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

// Escape CSV cell to prevent formula injection (=, +, -, @, tab, CR).
const csvCell = (v: unknown): string => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
};

type ConversionStep = {
  label: string;
  count: number;
  overallPct: number;
  stepPct: number;
  drop: number;
};

const exportConversionCsv = (steps: ConversionStep[]) => {
  const header = ["Step", "Label", "Visitors", "Step %", "Overall %", "Dropped from previous"];
  const rows = steps.map((s, i) => [
    i + 1,
    s.label,
    s.count,
    i === 0 ? "" : `${s.stepPct}%`,
    i === 0 ? "" : `${s.overallPct}%`,
    i === 0 ? "" : s.drop,
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `conversion-funnel-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

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
        .select("id,user_id,event_name,domain,path,device_type,source,utm_source,utm_medium,utm_campaign,country,session_id,anonymous_id,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (domainFilter !== "all") {
        query = query.eq("domain", domainFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      setRows((data as EventRow[]) ?? []);
    } finally {
      setBusy(false);
    }
  }

  async function loadDomains() {
    // Always include known production/preview domains so they're selectable
    // in the filter even before any events have been recorded for them.
    const KNOWN_DOMAINS = [
      "solo-bizz.com",
      "www.solo-bizz.com",
      "solo-bizz.lovable.app",
      "solo-bizz-app.lovable.app",
      "preview--solo-bizz.lovable.app",
    ];
    try {
      const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      let dbDomains: string[] = [];
      const { data, error } = await (supabase.rpc as any)("get_distinct_domains", { since_date: since });
      if (error) {
        const { data: fallback } = await (supabase
          .from("user_activity_events") as any)
          .select("domain")
          .gte("created_at", since)
          .order("domain", { ascending: true })
          .limit(5000);
        dbDomains = [...new Set<string>((fallback ?? []).map((r: any) => r.domain).filter(Boolean))];
      } else {
        dbDomains = (data ?? []).filter(Boolean);
      }
      const merged = [...new Set<string>([...KNOWN_DOMAINS, ...dbDomains])].sort();
      setAllDomains(merged);
    } catch {
      setAllDomains(KNOWN_DOMAINS);
    }
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
    const byDomain: Record<string, number> = {};
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
      if (r.domain) byDomain[r.domain] = (byDomain[r.domain] ?? 0) + 1;
    }
    const uniqueUsers = new Set(rows.map((r) => r.user_id).filter(Boolean) as string[]).size;
    return { totals, usersPerEvent, byDevice, bySource, byCountry, byPath, byDomain, uniqueUsers };
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

  // Focused Landing → Auth → Subscription conversion, using UNIQUE visitors
  // (session_id / anonymous_id / user_id) rather than raw event counts so
  // multiple events per visitor don't inflate the numbers.
  const conversion = useMemo(() => {
    const LANDING = new Set(["website_page_view", "landing_view", "$pageview"]);
    const AUTH = new Set(["auth_page_opened"]);
    const REG = new Set(["registration_completed", "sign_up_completed"]);
    const CHECKOUT = new Set(["stripe_checkout_opened", "checkout_started"]);
    const SUB = new Set(["subscription_completed", "subscription_active", "checkout_completed"]);

    const bucket = (set: Set<string>) => {
      const ids = new Set<string>();
      for (const r of rows) {
        if (!set.has(r.event_name)) continue;
        const key = r.user_id || r.session_id || r.anonymous_id;
        if (key) ids.add(key);
      }
      return ids;
    };
    const landing = bucket(LANDING);
    const auth = bucket(AUTH);
    const reg = bucket(REG);
    const checkout = bucket(CHECKOUT);
    const sub = bucket(SUB);

    const steps = [
      { label: "Landing visit", count: landing.size },
      { label: "Opened auth", count: auth.size },
      { label: "Registered", count: reg.size },
      { label: "Opened checkout", count: checkout.size },
      { label: "Subscribed", count: sub.size },
    ];
    const top = steps[0].count || 0;
    return steps.map((s, i) => {
      const prev = i === 0 ? s.count : steps[i - 1].count;
      const overallPct = top > 0 ? Math.round((s.count / top) * 1000) / 10 : 0;
      const stepPct = prev > 0 ? Math.round((s.count / prev) * 1000) / 10 : 0;
      const drop = prev > 0 ? Math.max(prev - s.count, 0) : 0;
      return { ...s, overallPct, stepPct, drop };
    });
  }, [rows]);

  // Web-traffic style metrics computed from raw event rows.
  // A "visit" = a unique session_id (falls back to anonymous_id, then user_id).
  // A "page view" = any event with a path (we don't have $pageview-only data,
  // so every persisted event counts as one interaction with a page).
  const webTraffic = useMemo(() => {
    const visitorKey = (r: EventRow) => r.session_id || r.anonymous_id || r.user_id || r.id;
    const sessions = new Map<string, { ts: number[]; paths: Set<string>; source: string; device: string | null; country: string | null; domain: string | null }>();
    const pageViewRows = rows.filter((r) => !!r.path);
    for (const r of rows) {
      const k = visitorKey(r);
      let s = sessions.get(k);
      if (!s) {
        s = { ts: [], paths: new Set(), source: r.utm_source || r.source || "direct", device: r.device_type, country: r.country, domain: r.domain };
        sessions.set(k, s);
      }
      s.ts.push(new Date(r.created_at).getTime());
      if (r.path) s.paths.add(r.path);
    }
    const visitors = sessions.size;
    const pageViews = pageViewRows.length;
    const viewsPerVisit = visitors > 0 ? pageViews / visitors : 0;
    let durSum = 0;
    let durCount = 0;
    let bounces = 0;
    for (const s of sessions.values()) {
      if (s.ts.length > 1) {
        const min = Math.min(...s.ts);
        const max = Math.max(...s.ts);
        durSum += (max - min) / 1000;
        durCount += 1;
      }
      if (s.paths.size <= 1) bounces += 1;
    }
    const avgDuration = durCount > 0 ? durSum / durCount : 0;
    const bounceRate = visitors > 0 ? (bounces / visitors) * 100 : 0;

    // Daily trend by visitor
    const byDay = new Map<string, Set<string>>();
    for (const r of rows) {
      const day = r.created_at.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, new Set());
      byDay.get(day)!.add(visitorKey(r));
    }
    const trend = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, set]) => ({ day, visitors: set.size }));

    // Source / Page / Device / Country counted by unique visitors
    const accum = (pick: (r: EventRow) => string | null | undefined) => {
      const m = new Map<string, Set<string>>();
      for (const r of rows) {
        const key = pick(r);
        if (!key) continue;
        if (!m.has(key)) m.set(key, new Set());
        m.get(key)!.add(visitorKey(r));
      }
      const out: Record<string, number> = {};
      for (const [k, set] of m) out[k] = set.size;
      return out;
    };

    // Avg time on page: for each session, sort events chronologically; dwell
    // time on path P = timestamp of the next event in the same session minus
    // this event's timestamp. Gaps over 30 min are treated as session breaks
    // (the user walked away) and don't contribute — this keeps averages honest.
    const SESSION_GAP_MS = 30 * 60 * 1000;
    const pageTime = new Map<string, { total: number; count: number }>();
    const sessionEvents = new Map<string, EventRow[]>();
    for (const r of rows) {
      const k = visitorKey(r);
      if (!sessionEvents.has(k)) sessionEvents.set(k, []);
      sessionEvents.get(k)!.push(r);
    }
    for (const evs of sessionEvents.values()) {
      evs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      for (let i = 0; i < evs.length - 1; i++) {
        const cur = evs[i];
        if (!cur.path) continue;
        const dt = new Date(evs[i + 1].created_at).getTime() - new Date(cur.created_at).getTime();
        if (dt <= 0 || dt > SESSION_GAP_MS) continue;
        const bucket = pageTime.get(cur.path) ?? { total: 0, count: 0 };
        bucket.total += dt / 1000;
        bucket.count += 1;
        pageTime.set(cur.path, bucket);
      }
    }
    const avgTimeByPage: Record<string, number> = {};
    for (const [path, { total, count }] of pageTime) {
      if (count > 0) avgTimeByPage[path] = total / count;
    }

    return {
      visitors,
      pageViews,
      viewsPerVisit,
      avgDuration,
      bounceRate,
      trend,
      bySource: accum((r) => r.utm_source || r.source || "direct"),
      byPage: accum((r) => r.path),
      byDevice: accum((r) => r.device_type),
      byCountry: accum((r) => r.country),
      avgTimeByPage,
    };
  }, [rows]);


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
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All domains" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All domains</SelectItem>
                {allDomains.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="web">Web traffic</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total events" value={rows.length} />
              <StatCard label="Unique users" value={stats.uniqueUsers} />
              <StatCard label="Registrations" value={stats.totals["registration_completed"] ?? 0} />
              <StatCard label="Subscriptions" value={stats.totals["subscription_completed"] ?? 0} />
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>Landing → Auth → Subscription</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Unique visitors per step. Step % = conversion from previous step.
                      Overall % = share of landing visitors that reached the step.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportConversionCsv(conversion)}>
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {conversion.map((s, i) => (
                  <div key={s.label} className="space-y-1">
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-medium">{i + 1}. {s.label}</span>
                      <span className="text-muted-foreground">
                        {s.count.toLocaleString()} visitors
                        {i > 0 && <> · step {s.stepPct}% · overall {s.overallPct}%</>}
                        {i > 0 && s.drop > 0 && (
                          <span className="text-destructive"> · -{s.drop.toLocaleString()} dropped</span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 rounded bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${s.overallPct}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>


            <Card>
              <CardHeader><CardTitle>Detailed funnel (all events)</CardTitle></CardHeader>
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
              <BreakdownCard title="By domain" data={stats.byDomain} />
              <BreakdownCard title="By source" data={stats.bySource} />
              <BreakdownCard title="By device" data={stats.byDevice} />
              <BreakdownCard title="By country" data={stats.byCountry} />
              <BreakdownCard title="Top pages" data={stats.byPath} secondary={webTraffic.avgTimeByPage} secondaryFormat={formatDuration} secondaryLabel="avg time" />
            </div>

          </TabsContent>

          <TabsContent value="web" className="space-y-6">
            <WebTrafficPanel data={webTraffic} />
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader><CardTitle>Recent events</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Domain</TableHead>
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
                    <TableCell className="text-xs">{r.domain ?? "—"}</TableCell>
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

type WebTrafficData = {
  visitors: number;
  pageViews: number;
  viewsPerVisit: number;
  avgDuration: number;
  bounceRate: number;
  trend: { day: string; visitors: number }[];
  bySource: Record<string, number>;
  byPage: Record<string, number>;
  byDevice: Record<string, number>;
  byCountry: Record<string, number>;
};

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function compactNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

function WebTrafficPanel({ data }: { data: WebTrafficData }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Web traffic</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCell label="Visitors" value={compactNumber(data.visitors)} highlight />
            <MetricCell label="Page views" value={compactNumber(data.pageViews)} />
            <MetricCell label="Views per visit" value={data.viewsPerVisit.toFixed(2)} />
            <MetricCell label="Visit duration" value={formatDuration(data.avgDuration)} />
            <MetricCell label="Bounce rate" value={`${Math.round(data.bounceRate)}%`} />
          </div>
          <div className="h-72 w-full">
            {data.trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No traffic in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#visitorsFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Traffic breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            <BreakdownTable title="Source" header="Visitors" data={data.bySource} />
            <BreakdownTable title="Page" header="Visitors" data={data.byPage} />
            <BreakdownTable title="Device" header="Visitors" data={data.byDevice} />
            <BreakdownTable title="Country" header="Visitors" data={data.byCountry} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${highlight ? "bg-muted/60" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function BreakdownTable({ title, header, data }: { title: string; header: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = entries[0]?.[1] ?? 1;
  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between px-3 py-2 border-b text-xs">
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground">{header}</span>
      </div>
      <div className="p-2 space-y-1">
        {entries.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">No data</div>}
        {entries.map(([k, v]) => (
          <div key={k} className="relative rounded px-2 py-1.5 overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${(v / max) * 100}%` }} />
            <div className="relative flex items-center justify-between text-xs">
              <span className="truncate pr-2">{k}</span>
              <span className="text-muted-foreground tabular-nums">{compactNumber(v)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
