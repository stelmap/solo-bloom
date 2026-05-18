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
import { Loader2, RefreshCw, Users, UserPlus, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  provider: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
};

type SortKey = "created_at" | "last_sign_in_at" | "email";

function fmt(d: string | null) {
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

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? users.filter((u) =>
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.full_name ?? "").toLowerCase().includes(q))
      : users.slice();
    rows.sort((a, b) => {
      const va = (a as any)[sortKey] ?? "";
      const vb = (b as any)[sortKey] ?? "";
      if (va === vb) return 0;
      const cmp = va < vb ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [users, search, sortKey, sortDir]);

  const stats = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const total = users.length;
    const newWeek = users.filter((u) => now - new Date(u.created_at).getTime() < 7 * day).length;
    const active7 = users.filter((u) => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < 7 * day).length;
    const neverLogged = users.filter((u) => !u.last_sign_in_at).length;
    return { total, newWeek, active7, neverLogged };
  }, [users]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  }

  if (loading || isAdmin === null) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin" /></div></AppLayout>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-muted-foreground text-sm">All registered users, first signup & last sign-in.</p>
          </div>
          <Button onClick={load} disabled={busy} variant="outline" size="sm">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Total users" value={stats.total} />
          <StatCard icon={UserPlus} label="New (7d)" value={stats.newWeek} />
          <StatCard icon={Clock} label="Active (7d)" value={stats.active7} />
          <StatCard icon={Users} label="Never signed in" value={stats.neverLogged} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base">User list</CardTitle>
            <Input
              placeholder="Search email or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("email")}>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("created_at")}>
                    First signup {sortKey === "created_at" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("last_sign_in_at")}>
                    Last sign-in {sortKey === "last_sign_in_at" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {busy ? "Loading…" : "No users"}
                  </TableCell></TableRow>
                ) : filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                    <TableCell>{u.full_name ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{u.provider ?? "email"}</Badge></TableCell>
                    <TableCell>{fmt(u.created_at)}</TableCell>
                    <TableCell>{fmt(u.last_sign_in_at)}</TableCell>
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

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Icon className="h-4 w-4" />{label}
        </div>
        <p className="text-2xl font-bold mt-1.5">{value}</p>
      </CardContent>
    </Card>
  );
}
