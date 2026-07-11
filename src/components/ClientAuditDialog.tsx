import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isRealSession, isCancelled } from "@/lib/paymentClassifiers";
import { Loader2, RefreshCw } from "lucide-react";

type UISnapshot = {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  prepaidSessions: number;
  awaitingSessions: number;
  paidSessions: number;
  supervisionSessions: number;
  totalPaid: number;
};

type Row = {
  label: string;
  db: string | number;
  ui: string | number;
  match: boolean;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  ui: UISnapshot;
  currencySymbol: string;
}

export function ClientAuditDialog({ open, onOpenChange, clientId, ui, currencySymbol }: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [extra, setExtra] = useState<{ orphanScheduled: number; allocationsTotal: number; incomeCount: number } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [aptRes, supRes, incRes, allocRes] = await Promise.all([
        supabase.from("appointments").select("id,status,payment_status,scheduled_at,price").eq("client_id", clientId),
        supabase.from("supervisions").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("income").select("id,amount,status").eq("client_id", clientId),
        supabase.from("income_session_allocations").select("amount,income_id,income:income_id(client_id,status)"),
      ]);
      if (aptRes.error) throw aptRes.error;
      if (supRes.error) throw supRes.error;
      if (incRes.error) throw incRes.error;
      if (allocRes.error) throw allocRes.error;

      const apts = (aptRes.data ?? []) as any[];
      const now = Date.now();
      const real = apts.filter(isRealSession);
      const cancelled = real.filter(isCancelled).length;
      const completed = real.filter((a) => a.status === "completed").length;
      const prepaid = apts.filter((a) => a.payment_status === "paid_in_advance").length;
      const paid = apts.filter((a) =>
        ["paid_now", "paid_in_advance", "paid_from_prepayment"].includes(String(a.payment_status)),
      ).length;
      const awaiting = apts.filter(
        (a) =>
          a.status === "completed" &&
          ["unpaid", "waiting_for_payment", "partially_paid", "partially_paid_from_prepayment"].includes(String(a.payment_status)),
      ).length;
      const orphanScheduled = apts.filter(
        (a) => ["scheduled", "confirmed", "reminder_sent"].includes(String(a.status)) && a.scheduled_at && new Date(a.scheduled_at).getTime() < now,
      ).length;

      const income = (incRes.data ?? []) as any[];
      const totalPaidDb = income
        .filter((i) => (i.status ?? "confirmed") === "confirmed")
        .reduce((s, i) => s + Number(i.amount || 0), 0);
      const supervisionDb = supRes.count ?? 0;

      const allocationsTotal = ((allocRes.data ?? []) as any[])
        .filter((r) => r.income?.client_id === clientId && (r.income?.status ?? "confirmed") === "confirmed")
        .reduce((s, r) => s + Number(r.amount || 0), 0);

      const money = (n: number) => `${currencySymbol}${n.toFixed(2)}`;

      const next: Row[] = [
        { label: "Total sessions (real)", db: real.length, ui: ui.totalSessions, match: real.length === ui.totalSessions },
        { label: "Completed", db: completed, ui: ui.completedSessions, match: completed === ui.completedSessions },
        { label: "Cancelled", db: cancelled, ui: ui.cancelledSessions, match: cancelled === ui.cancelledSessions },
        { label: "Prepaid (paid_in_advance)", db: prepaid, ui: ui.prepaidSessions, match: prepaid === ui.prepaidSessions },
        { label: "Paid (all paid_* statuses)", db: paid, ui: ui.paidSessions, match: paid === ui.paidSessions },
        { label: "Awaiting payment", db: awaiting, ui: ui.awaitingSessions, match: awaiting === ui.awaitingSessions },
        { label: "Supervision sessions", db: supervisionDb, ui: ui.supervisionSessions, match: supervisionDb === ui.supervisionSessions },
        { label: "Total paid (confirmed income)", db: money(totalPaidDb), ui: money(ui.totalPaid), match: Math.abs(totalPaidDb - ui.totalPaid) < 0.01 },
      ];
      setRows(next);
      setExtra({ orphanScheduled, allocationsTotal, incomeCount: income.length });
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientId]);

  const mismatchCount = rows.filter((r) => !r.match).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Full audit — DB vs UI
            {!loading && rows.length > 0 && (
              <Badge variant={mismatchCount === 0 ? "secondary" : "destructive"}>
                {mismatchCount === 0 ? "All match" : `${mismatchCount} mismatch`}
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading audit…
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Metric</th>
                    <th className="text-right px-3 py-2 font-medium">DB</th>
                    <th className="text-right px-3 py-2 font-medium">UI</th>
                    <th className="text-right px-3 py-2 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="border-t border-border">
                      <td className="px-3 py-2">{r.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.db}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.ui}</td>
                      <td className="px-3 py-2 text-right">
                        {r.match ? (
                          <Badge variant="secondary" className="bg-success/15 text-success">Match</Badge>
                        ) : (
                          <Badge variant="destructive">Mismatch</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {extra && (
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div className="rounded border border-border px-3 py-2">
                  <div className="text-foreground text-sm font-medium">{extra.orphanScheduled}</div>
                  Past-scheduled orphans
                </div>
                <div className="rounded border border-border px-3 py-2">
                  <div className="text-foreground text-sm font-medium">{currencySymbol}{extra.allocationsTotal.toFixed(2)}</div>
                  Allocated payments
                </div>
                <div className="rounded border border-border px-3 py-2">
                  <div className="text-foreground text-sm font-medium">{extra.incomeCount}</div>
                  Income rows (all statuses)
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              DB = fresh direct query. UI = values currently rendered on this page. Mismatch indicates counter logic drift or stale cache — reload the page and re-run if needed.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
