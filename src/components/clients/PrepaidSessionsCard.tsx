import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Plus, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { describeError } from "@/lib/errorMessages";
import { cn } from "@/lib/utils";
import { PREPAID_LEDGER_KEY, usePrepaidLedger } from "@/hooks/usePrepaidSessions";
import { prepaidCopy, summarizePrepaid, type PrepaidStatus } from "@/lib/prepaidSessions";

export const prepaidBadgeClass: Record<PrepaidStatus, string> = {
  none: "bg-muted text-muted-foreground",
  ok: "bg-success/10 text-success",
  low: "bg-primary/10 text-primary border-primary/40",
  empty: "bg-destructive/10 text-destructive border-destructive/40",
};

export function invalidatePrepaid(qc: ReturnType<typeof useQueryClient>) {
  [PREPAID_LEDGER_KEY, "clients", "client", "appointments", "income", "client-credit-balance", "client-allocations", "client-debt"]
    .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function PrepaidSessionsCard({ client }: { client: any }) {
  const { lang } = useLanguage();
  const P = prepaidCopy(lang);
  const { symbol } = useCurrency();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: ledger = [] } = usePrepaidLedger();
  const rows = useMemo(() => ledger.filter((r) => r.client_id === client.id), [ledger, client.id]);
  const summary = summarizePrepaid(rows).get(client.id) ?? { balance: 0, hasTopups: false, status: "none" as PrepaidStatus };
  const [mode, setMode] = useState<boolean>(!!client.prepaid_sessions_mode);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [sessions, setSessions] = useState("");
  const [incomeId, setIncomeId] = useState<string>("new");
  const [busy, setBusy] = useState(false);

  const linked = new Set(rows.filter((r) => r.kind === "topup").map((r) => r.income_id));
  const { data: payments = [] } = useQuery({
    queryKey: ["prepaid-candidate-payments", client.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("income")
        .select("id, amount, date")
        .eq("client_id", client.id)
        .eq("status", "confirmed")
        .is("appointment_id", null)
        .neq("source", "prepayment_withdrawal")
        .order("date", { ascending: false })
        .limit(30);
      return (data ?? []) as { id: string; amount: number; date: string }[];
    },
  });
  const candidates = payments.filter((p) => !linked.has(p.id));

  const toggle = async (v: boolean) => {
    setMode(v);
    const { error } = await (supabase as any).from("clients").update({ prepaid_sessions_mode: v }).eq("id", client.id);
    if (error) {
      setMode(!v);
      toast({ title: describeError(error), variant: "destructive" });
      return;
    }
    invalidatePrepaid(qc);
  };

  const submit = async () => {
    const n = parseInt(sessions, 10);
    const amt = Number(amount);
    if (!Number.isInteger(n) || n < 1 || n > 500 || (incomeId === "new" && !(amt > 0))) {
      toast({ title: `${P.amount} / ${P.sessions}`, variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("add_prepaid_sessions", {
      p_client_id: client.id,
      p_sessions: n,
      p_amount: incomeId === "new" ? amt : null,
      p_income_id: incomeId === "new" ? null : incomeId,
    });
    setBusy(false);
    if (error) {
      toast({ title: describeError(error), variant: "destructive" });
      return;
    }
    toast({ title: P.left.replace("{n}", String(data)) });
    setOpen(false); setAmount(""); setSessions(""); setIncomeId("new");
    invalidatePrepaid(qc);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" />{P.mode}</h3>
          <p className="text-xs text-muted-foreground mt-1">{P.modeHint}</p>
        </div>
        <Switch checked={mode} onCheckedChange={toggle} aria-label={P.mode} />
      </div>

      {mode && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{P.available}</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{summary.balance}</p>
            </div>
            <Badge variant="outline" className={cn("ml-1", prepaidBadgeClass[summary.status])}>{P[summary.status]}</Badge>
            <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />{P.add}</Button>
          </div>

          {rows.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">{P.history}</p>
              <ul className="max-h-56 overflow-y-auto divide-y divide-border rounded-lg border border-border">
                {rows.map((r) => (
                  <li key={r.id} className={cn("flex items-center justify-between px-3 py-2 text-sm", r.reversed_at && "opacity-50 line-through")}>
                    <span>{format(new Date(r.created_at), "dd.MM.yyyy")} · {r.kind === "topup" ? P.topup : P.use}{r.reversed_at ? ` (${P.reversed})` : ""}</span>
                    <span className={cn("font-semibold tabular-nums", r.kind === "topup" ? "text-success" : "text-foreground")}>
                      {r.kind === "topup" ? `+${r.sessions} · ${symbol}${Number(r.amount).toFixed(0)}` : `−${r.sessions}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{P.add}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {candidates.length > 0 && (
              <div className="space-y-1.5">
                <Label>{P.existing}</Label>
                <Select value={incomeId} onValueChange={setIncomeId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">{P.newPayment}</SelectItem>
                    {candidates.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.date} · {symbol}{Number(p.amount).toFixed(2)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {incomeId === "new" && (
              <div className="space-y-1.5">
                <Label>{P.amount} *</Label>
                <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{P.sessions} *</Label>
              <Input type="number" min="1" max="500" step="1" value={sessions} onChange={(e) => setSessions(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{P.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
