import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import { Loader2, RefreshCw, Users, UserPlus, Clock, X, CreditCard, FileCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  provider: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  has_records?: boolean;
  last_product_activity_at?: string | null;
  visited_stripe?: boolean;
  visited_stripe_at?: string | null;
};

type SortKey =
  | "created_at"
  | "last_sign_in_at"
  | "email"
  | "has_records"
  | "visited_stripe"
  | "last_product_activity_at";

type CardFilter = "all" | "new7d" | "active7d" | "neverSignedIn";
type YesNoAll = "all" | "yes" | "no";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("last_sign_in_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [cardFilter, setCardFilter] = useState<CardFilter>("all");
  const [recordsFilter, setRecordsFilter] = useState<YesNoAll>("all");
  const [stripeFilter, setStripeFilter] = useState<YesNoAll>("all");

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(Boolean(data));
    });
  }, [user]);

  async function load() {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-list-users");
      if (error) throw error;
      setUsers((data as any).users ?? []);
    } catch (e: any) {
      toast({ title: "Failed to load users", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const stats = useMemo(() => {
    const now = Date.now();
    const total = users.length;
    const newWeek = users.filter((u) => now - new Date(u.created_at).getTime() < SEVEN_DAYS).length;
    const active7 = users.filter((u) => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < SEVEN_DAYS).length;
    const neverLogged = users.filter((u) => !u.last_sign_in_at).length;
    const withRecords = users.filter((u) => u.has_records).length;
    const visitedStripe = users.filter((u) => u.visited_stripe).length;
    return { total, newWeek, active7, neverLogged, withRecords, visitedStripe };
  }, [users]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = search.trim().toLowerCase();
    let rows = users.slice();

    // Card filter
    if (cardFilter === "new7d") {
      rows = rows.filter((u) => now - new Date(u.created_at).getTime() < SEVEN_DAYS);
    } else if (cardFilter === "active7d") {
      rows = rows.filter((u) => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < SEVEN_DAYS);
    } else if (cardFilter === "neverSignedIn") {
      rows = rows.filter((u) => !u.last_sign_in_at);
    }

    if (recordsFilter !== "all") {
      rows = rows.filter((u) => Boolean(u.has_records) === (recordsFilter === "yes"));
    }
    if (stripeFilter !== "all") {
      rows = rows.filter((u) => Boolean(u.visited_stripe) === (stripeFilter === "yes"));
    }

    if (q) {
      rows = rows.filter((u) =>
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q),
      );
    }

    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const va = (a as any)[sortKey];
      const vb = (b as any)[sortKey];
      // Push nulls/undefined to the bottom regardless of sort direction,
      // except when the user explicitly filters for "never signed in".
      const aEmpty = va === null || va === undefined || va === "" || va === false;
      const bEmpty = vb === null || vb === undefined || vb === "" || vb === false;
      if (aEmpty && !bEmpty) return 1;
      if (!aEmpty && bEmpty) return -1;
      if (aEmpty && bEmpty) return 0;
      if (va === vb) return 0;
      return va < vb ? -dir : dir;
    });
    return rows;
  }, [users, search, sortKey, sortDir, cardFilter, recordsFilter, stripeFilter]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  }

  function clearAllFilters() {
    setCardFilter("all");
    setRecordsFilter("all");
    setStripeFilter("all");
    setSearch("");
    setSortKey("last_sign_in_at");
    setSortDir("desc");
  }

  const hasActiveFilters =
    cardFilter !== "all" || recordsFilter !== "all" || stripeFilter !== "all" || search.trim() !== "";

  if (loading || isAdmin === null) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin" /></div></AppLayout>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const sortIndicator = (k: SortKey) => (sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-muted-foreground text-sm">Internal analytics: signups, activation, and Stripe funnel.</p>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button onClick={clearAllFilters} variant="ghost" size="sm">
                <X className="h-4 w-4 mr-1" /> Clear filters
              </Button>
            )}
            <Button onClick={load} disabled={busy} variant="outline" size="sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Users} label="Total users" value={stats.total}
            active={cardFilter === "all"}
            onClick={() => setCardFilter("all")}
          />
          <StatCard
            icon={UserPlus} label="New (7d)" value={stats.newWeek}
            active={cardFilter === "new7d"}
            onClick={() => setCardFilter((c) => (c === "new7d" ? "all" : "new7d"))}
          />
          <StatCard
            icon={Clock} label="Active (7d)" value={stats.active7}
            active={cardFilter === "active7d"}
            onClick={() => setCardFilter((c) => (c === "active7d" ? "all" : "active7d"))}
          />
          <StatCard
            icon={Users} label="Never signed in" value={stats.neverLogged}
            active={cardFilter === "neverSignedIn"}
            onClick={() => setCardFilter((c) => (c === "neverSignedIn" ? "all" : "neverSignedIn"))}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SmallStat icon={FileCheck} label="Created records" value={`${stats.withRecords} / ${stats.total}`} />
          <SmallStat icon={CreditCard} label="Visited Stripe" value={`${stats.visitedStripe} / ${stats.total}`} />
        </div>

        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">User list</CardTitle>
              <Input
                placeholder="Search email or name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Created records:</span>
                <Select value={recordsFilter} onValueChange={(v) => setRecordsFilter(v as YesNoAll)}>
                  <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Visited Stripe:</span>
                <Select value={stripeFilter} onValueChange={(v) => setStripeFilter(v as YesNoAll)}>
                  <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                Showing {filtered.length} of {users.length}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("email")}>Email{sortIndicator("email")}</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("created_at")}>
                    First signup{sortIndicator("created_at")}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("last_sign_in_at")}>
                    Last sign-in{sortIndicator("last_sign_in_at")}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("last_product_activity_at")}>
                    Last product activity{sortIndicator("last_product_activity_at")}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("has_records")}>
                    Created records{sortIndicator("has_records")}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("visited_stripe")}>
                    Visited Stripe{sortIndicator("visited_stripe")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {busy ? "Loading…" : "No users"}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                    <TableCell>{u.full_name ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{u.provider ?? "email"}</Badge></TableCell>
                    <TableCell>{fmt(u.created_at)}</TableCell>
                    <TableCell>{fmt(u.last_sign_in_at)}</TableCell>
                    <TableCell>{fmt(u.last_product_activity_at)}</TableCell>
                    <TableCell>
                      <Badge variant={u.has_records ? "default" : "outline"}>
                        {u.has_records ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.visited_stripe ? "default" : "outline"}>
                        {u.visited_stripe ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
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

function StatCard({
  icon: Icon, label, value, active, onClick,
}: { icon: any; label: string; value: number; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "true" : undefined}
      className={cn(
        "text-left rounded-lg border bg-card transition-all p-4 hover:border-primary/50 hover:shadow-sm",
        active && "border-primary ring-2 ring-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Icon className="h-4 w-4" />{label}
      </div>
      <p className="text-2xl font-bold mt-1.5">{value}</p>
    </button>
  );
}

function SmallStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Icon className="h-4 w-4" />{label}
        </div>
        <p className="text-xl font-semibold mt-1.5">{value}</p>
      </CardContent>
    </Card>
  );
}
