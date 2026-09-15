import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/sessionGuard";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { describeError } from "@/lib/errorMessages";
import { useLanguage } from "@/i18n/LanguageContext";

type SubscriptionRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  status: string | null;
  plan_code: string | null;
  plan_name: string | null;
  billing_period: string | null;
  price: number | null;
  currency: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  paddle_subscription_id: string | null;
  paddle_customer_id: string | null;
  legacy_full_access: boolean | null;
  legacy_access_until: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

function statusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active": return "default";
    case "trialing": return "secondary";
    case "past_due": return "destructive";
    default: return "outline";
  }
}

export default function AdminSubscriptionsPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    void checkIsAdmin().then(setIsAdmin);
  }, [user]);

  async function load() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_subscriptions" as any);
      if (error) throw error;
      setRows((data as SubscriptionRow[]) ?? []);
    } catch (e: any) {
      toast({ title: t("common.error"), description: describeError(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { if (isAdmin) void load(); }, [isAdmin]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      trialing: rows.filter((r) => r.status === "trialing").length,
      renewing30: rows.filter((r) =>
        r.current_period_end &&
        new Date(r.current_period_end).getTime() - now > 0 &&
        new Date(r.current_period_end).getTime() - now < 30 * DAY).length,
      expired: rows.filter((r) =>
        r.current_period_end && new Date(r.current_period_end).getTime() < now).length,
    };
  }, [rows]);

  const plans = useMemo(
    () => Array.from(new Set(rows.map((r) => r.plan_code).filter(Boolean))) as string[],
    [rows],
  );
  const statuses = useMemo(
    () => Array.from(new Set(rows.map((r) => r.status).filter(Boolean))) as string[],
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (planFilter !== "all" && r.plan_code !== planFilter) return false;
      if (q && !(
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.full_name ?? "").toLowerCase().includes(q) ||
        (r.paddle_subscription_id ?? "").toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [rows, search, statusFilter, planFilter]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin === false) return <Navigate to="/" replace />;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Subscriptions</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total },
            { label: "Active", value: stats.active },
            { label: "Trialing", value: stats.trialing },
            { label: "Renewing in 30 days", value: stats.renewing30 },
            { label: "Expired", value: stats.expired },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search by email, name or subscription id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {plans.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Period start</TableHead>
                  <TableHead>Next renewal</TableHead>
                  <TableHead>Paddle ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {busy ? "Loading…" : "No subscriptions found"}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((r) => {
                  const end = r.current_period_end ? new Date(r.current_period_end).getTime() : null;
                  const soon = end !== null && end - Date.now() > 0 && end - Date.now() < 7 * DAY;
                  const past = end !== null && end < Date.now();
                  return (
                    <TableRow key={r.user_id}>
                      <TableCell>
                        <div className="font-medium">{r.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.email || r.user_id}</div>
                      </TableCell>
                      <TableCell>
                        <div>{r.plan_name || r.plan_code || (r.legacy_full_access ? "Legacy access" : "—")}</div>
                        {r.price != null && (
                          <div className="text-xs text-muted-foreground">
                            {r.price} {r.currency ?? ""}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(r.status)}>{r.status ?? "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.billing_period ?? "—"}</TableCell>
                      <TableCell className="text-sm">{fmtDate(r.current_period_start)}</TableCell>
                      <TableCell className="text-sm">
                        <span className={past ? "text-destructive" : soon ? "text-orange-600 font-medium" : ""}>
                          {fmtDate(r.current_period_end ?? r.legacy_access_until)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                        {r.paddle_subscription_id ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
