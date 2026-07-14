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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, RefreshCw, Users, UserPlus, Clock, X, CreditCard, FileCheck, ShieldOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { allowedActions, statusBadgeVariant, statusLabel, type LifecycleAction, type LifecycleStatus } from "@/lib/userLifecycle";

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
  lifecycle_status?: LifecycleStatus;
  planned_deletion_date?: string | null;
  deactivation_email_sent_at?: string | null;
};

type SortKey =
  | "created_at"
  | "last_sign_in_at"
  | "email"
  | "has_records"
  | "visited_stripe"
  | "last_product_activity_at"
  | "lifecycle_status";

type CardFilter = "all" | "new7d" | "active7d" | "neverSignedIn";
type YesNoAll = "all" | "yes" | "no";
type LifecycleFilter = "all" | LifecycleStatus;

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const ACTION_LABEL: Record<LifecycleAction, string> = {
  deactivate: "Deactivate & notify",
  cancel_deactivation: "Cancel deactivation",
  resend_email: "Resend warning email",
  cancel_deletion: "Cancel deletion",
  delete_permanently: "Delete permanently",
  send_warning_email_uk: "Send warning email — Ukrainian",
  send_warning_email_en: "Send warning email — English",
};

function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


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
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("all");
  const [dialogUser, setDialogUser] = useState<AdminUser | null>(null);
  const [dialogAction, setDialogAction] = useState<LifecycleAction | null>(null);
  const [dialogConfirm, setDialogConfirm] = useState("");
  const [dialogBusy, setDialogBusy] = useState(false);

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
    const pending = users.filter((u) => u.lifecycle_status === "deactivation_pending").length;
    const ready = users.filter((u) => u.lifecycle_status === "ready_for_deletion").length;
    return { total, newWeek, active7, neverLogged, withRecords, visitedStripe, pending, ready };
  }, [users]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = search.trim().toLowerCase();
    let rows = users.slice();

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
    if (lifecycleFilter !== "all") {
      rows = rows.filter((u) => (u.lifecycle_status ?? "active") === lifecycleFilter);
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
      const aEmpty = va === null || va === undefined || va === "" || va === false;
      const bEmpty = vb === null || vb === undefined || vb === "" || vb === false;
      if (aEmpty && !bEmpty) return 1;
      if (!aEmpty && bEmpty) return -1;
      if (aEmpty && bEmpty) return 0;
      if (va === vb) return 0;
      return va < vb ? -dir : dir;
    });
    return rows;
  }, [users, search, sortKey, sortDir, cardFilter, recordsFilter, stripeFilter, lifecycleFilter]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  }

  function clearAllFilters() {
    setCardFilter("all");
    setRecordsFilter("all");
    setStripeFilter("all");
    setLifecycleFilter("all");
    setSearch("");
    setSortKey("last_sign_in_at");
    setSortDir("desc");
  }

  const hasActiveFilters =
    cardFilter !== "all" || recordsFilter !== "all" || stripeFilter !== "all" ||
    lifecycleFilter !== "all" || search.trim() !== "";

  async function runAction() {
    if (!dialogUser || !dialogAction) return;
    setDialogBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-lifecycle-action", {
        body: {
          action: dialogAction,
          user_id: dialogUser.id,
          confirmation: dialogAction === "delete_permanently" ? dialogConfirm : undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const isWarning = dialogAction === "send_warning_email_uk" || dialogAction === "send_warning_email_en";
      toast({
        title: isWarning ? "Email sent" : "Done",
        description: isWarning
          ? `Warning email was successfully sent to ${dialogUser.email}.`
          : ACTION_LABEL[dialogAction],
      });
      setDialogUser(null);
      setDialogAction(null);
      setDialogConfirm("");
      await load();
    } catch (e: any) {
      toast({ title: "Action failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setDialogBusy(false);
    }
  }


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
            <p className="text-muted-foreground text-sm">Internal analytics: signups, activation, Stripe funnel, and account lifecycle.</p>
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
          <StatCard icon={Users} label="Total users" value={stats.total}
            active={cardFilter === "all"} onClick={() => setCardFilter("all")} />
          <StatCard icon={UserPlus} label="New (7d)" value={stats.newWeek}
            active={cardFilter === "new7d"} onClick={() => setCardFilter((c) => (c === "new7d" ? "all" : "new7d"))} />
          <StatCard icon={Clock} label="Active (7d)" value={stats.active7}
            active={cardFilter === "active7d"} onClick={() => setCardFilter((c) => (c === "active7d" ? "all" : "active7d"))} />
          <StatCard icon={Users} label="Never signed in" value={stats.neverLogged}
            active={cardFilter === "neverSignedIn"} onClick={() => setCardFilter((c) => (c === "neverSignedIn" ? "all" : "neverSignedIn"))} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SmallStat icon={FileCheck} label="Created records" value={`${stats.withRecords} / ${stats.total}`} />
          <SmallStat icon={CreditCard} label="Visited Stripe" value={`${stats.visitedStripe} / ${stats.total}`} />
          <SmallStat icon={ShieldOff} label="Deactivation pending" value={String(stats.pending)} />
          <SmallStat icon={ShieldOff} label="Ready for deletion" value={String(stats.ready)} />
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
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Lifecycle:</span>
                <Select value={lifecycleFilter} onValueChange={(v) => setLifecycleFilter(v as LifecycleFilter)}>
                  <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="deactivation_pending">Deactivation pending</SelectItem>
                    <SelectItem value="ready_for_deletion">Ready for deletion</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
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
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("lifecycle_status")}>
                    Lifecycle{sortIndicator("lifecycle_status")}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("created_at")}>
                    First signup{sortIndicator("created_at")}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("last_sign_in_at")}>
                    Last sign-in{sortIndicator("last_sign_in_at")}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("last_product_activity_at")}>
                    Last activity{sortIndicator("last_product_activity_at")}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("has_records")}>
                    Records{sortIndicator("has_records")}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("visited_stripe")}>
                    Stripe{sortIndicator("visited_stripe")}
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {busy ? "Loading…" : "No users"}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((u) => {
                  const status = (u.lifecycle_status ?? "active") as LifecycleStatus;
                  const actions = allowedActions(status);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                      <TableCell>{u.full_name ?? "—"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={statusBadgeVariant(status)}>{statusLabel(status)}</Badge>
                          {u.planned_deletion_date && status !== "active" && status !== "deleted" && (
                            <div className="text-xs text-muted-foreground">
                              Deletion: {new Date(u.planned_deletion_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </TableCell>
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
                      <TableCell className="text-right">
                        {(() => {
                          const twoMonthsMs = 60 * 24 * 60 * 60 * 1000;
                          const recentlyLoggedIn = Boolean(
                            u.last_sign_in_at && (Date.now() - new Date(u.last_sign_in_at).getTime()) < twoMonthsMs
                          );
                          const isProtected = recentlyLoggedIn && Boolean(u.has_records);
                          const blockedFor = new Set<LifecycleAction>(
                            isProtected ? ["deactivate", "delete_permanently"] : []
                          );
                          const usable = actions.filter((a) => !blockedFor.has(a));
                          if (actions.length === 0) {
                            return <span className="text-xs text-muted-foreground">—</span>;
                          }
                          if (usable.length === 0) {
                            return (
                              <span
                                className="text-xs text-muted-foreground"
                                title="Protected: signed in within the last 2 months and has active records"
                              >
                                Protected
                              </span>
                            );
                          }
                          return (
                            <Select
                              value=""
                              onValueChange={(v) => {
                                setDialogUser(u);
                                setDialogAction(v as LifecycleAction);
                                setDialogConfirm("");
                              }}
                            >
                              <SelectTrigger className="h-8 w-[170px] ml-auto">
                                <SelectValue placeholder="Action…" />
                              </SelectTrigger>
                              <SelectContent>
                                {usable.map((a) => (
                                  <SelectItem key={a} value={a}>{ACTION_LABEL[a]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!dialogUser && !!dialogAction} onOpenChange={(o) => {
        if (!o) { setDialogUser(null); setDialogAction(null); setDialogConfirm(""); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogAction ? ACTION_LABEL[dialogAction] : ""}</DialogTitle>
            <DialogDescription>
              {dialogUser?.email} · {dialogUser ? statusLabel((dialogUser.lifecycle_status ?? "active") as LifecycleStatus) : ""}
            </DialogDescription>
          </DialogHeader>

          {dialogAction === "deactivate" && (
            <p className="text-sm text-muted-foreground">
              The user will receive a warning email and their account will be permanently deleted in 7 days
              unless they sign in. Signing in during that window cancels the deletion automatically.
            </p>
          )}
          {dialogAction === "cancel_deactivation" && (
            <p className="text-sm text-muted-foreground">Restore this user to active status.</p>
          )}
          {dialogAction === "resend_email" && (
            <p className="text-sm text-muted-foreground">Resend the deactivation warning email to this user.</p>
          )}
          {dialogAction === "cancel_deletion" && (
            <p className="text-sm text-muted-foreground">
              This user's grace period expired. Cancelling deletion restores their account to active.
            </p>
          )}
          {dialogAction === "delete_permanently" && (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                This permanently deletes the auth account and all owned records. This action cannot be undone.
              </p>
              <Input
                placeholder='Type "DELETE" to confirm'
                value={dialogConfirm}
                onChange={(e) => setDialogConfirm(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogUser(null); setDialogAction(null); }}>
              Cancel
            </Button>
            <Button
              variant={dialogAction === "delete_permanently" ? "destructive" : "default"}
              disabled={dialogBusy || (dialogAction === "delete_permanently" && dialogConfirm !== "DELETE")}
              onClick={runAction}
            >
              {dialogBusy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
