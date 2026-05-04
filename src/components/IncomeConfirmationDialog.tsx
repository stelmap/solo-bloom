import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useToast } from "@/hooks/use-toast";
import { useClientAppointments, useSaveIncomeConfirmation } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatScheduledTime } from "@/lib/timeFormat";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  clientName?: string;
  use12h?: boolean;
  existingIncome?: any | null;
}

type FilterKey = "unpaid" | "partial" | "future" | "all" | "cancelled_billable";

export function IncomeConfirmationDialog({ open, onOpenChange, clientId, clientName, use12h = false, existingIncome }: Props) {
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();
  const { toast } = useToast();
  const save = useSaveIncomeConfirmation();
  const { data: appointments = [] } = useClientAppointments(clientId);

  const today = new Date().toISOString().split("T")[0];
  const isEdit = !!existingIncome?.id;

  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState("cash");
  const [status, setStatus] = useState<"confirmed" | "draft" | "cancelled">("confirmed");
  const [comment, setComment] = useState("");
  const [filter, setFilter] = useState<FilterKey>("unpaid");
  const [allocs, setAllocs] = useState<Record<string, string>>({});
  const [confirmUnlinked, setConfirmUnlinked] = useState(false);

  const [existingAllocByApt, setExistingAllocByApt] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!open || !clientId) return;
    (async () => {
      const aptIds = (appointments as any[]).map((a) => a.id);
      if (aptIds.length === 0) { setExistingAllocByApt({}); return; }
      const { data } = await (supabase as any)
        .from("income_session_allocations")
        .select("appointment_id, allocated_amount, income_id")
        .in("appointment_id", aptIds);
      const map: Record<string, number> = {};
      for (const row of (data ?? []) as any[]) {
        if (existingIncome?.id && row.income_id === existingIncome.id) continue;
        map[row.appointment_id] = (map[row.appointment_id] || 0) + Number(row.allocated_amount || 0);
      }
      setExistingAllocByApt(map);
    })();
  }, [open, clientId, appointments.length, existingIncome?.id]);

  useEffect(() => {
    if (!open) return;
    if (isEdit && existingIncome) {
      setAmount(String(existingIncome.amount ?? ""));
      setDate(existingIncome.date ?? today);
      setMethod(existingIncome.payment_method ?? "cash");
      setStatus((existingIncome.status as any) ?? "confirmed");
      setComment(existingIncome.comment ?? "");
      (async () => {
        const { data } = await (supabase as any)
          .from("income_session_allocations")
          .select("appointment_id, allocated_amount")
          .eq("income_id", existingIncome.id);
        const map: Record<string, string> = {};
        for (const r of (data ?? []) as any[]) {
          map[r.appointment_id] = String(r.allocated_amount);
        }
        setAllocs(map);
      })();
    } else {
      setAmount("");
      setDate(today);
      setMethod("cash");
      setStatus("confirmed");
      setComment("");
      setAllocs({});
    }
    setConfirmUnlinked(false);
    setFilter("unpaid");
  }, [open, existingIncome?.id]);

  const PAYMENT_METHODS = [
    { value: "cash", label: t("method.cashLabel") },
    { value: "card", label: t("method.cardLabel") },
    { value: "bank_transfer", label: t("method.bankTransferLabel") },
  ];

  const enrichedAppointments = useMemo(() => {
    return (appointments as any[]).map((a) => {
      const price = Number(a.price || 0);
      const otherPaid = existingAllocByApt[a.id] || 0;
      const remaining = Math.max(price - otherPaid, 0);
      return { ...a, _price: price, _otherPaid: otherPaid, _remaining: remaining };
    });
  }, [appointments, existingAllocByApt]);

  const filteredAppointments = useMemo(() => {
    const now = new Date();
    return enrichedAppointments.filter((a: any) => {
      const isFuture = new Date(a.scheduled_at) > now && (a.status === "scheduled" || a.status === "confirmed" || a.status === "reminder_sent");
      const isCancelled = a.status === "cancelled" || a.status === "no-show";
      switch (filter) {
        case "unpaid":
          return !isCancelled && a._remaining > 0 && a._otherPaid === 0;
        case "partial":
          return !isCancelled && a._otherPaid > 0 && a._remaining > 0;
        case "future":
          return isFuture;
        case "cancelled_billable":
          return isCancelled && a._remaining > 0;
        case "all":
        default:
          return true;
      }
    }).sort((a: any, b: any) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  }, [enrichedAppointments, filter]);

  const allocSum = useMemo(() => Object.values(allocs).reduce((s, v) => s + (Number(v) || 0), 0), [allocs]);
  const numAmount = Number(amount) || 0;
  const remainder = Math.max(numAmount - allocSum, 0);
  const linkedCount = Object.values(allocs).filter((v) => Number(v) > 0).length;
  const isUnlinked = linkedCount === 0;
  const allocOver = allocSum > numAmount + 0.001;

  const toggleApt = (apt: any, checked: boolean) => {
    setAllocs((prev) => {
      const next = { ...prev };
      if (checked) {
        const leftover = Math.max(numAmount - Object.values(next).reduce((s, v) => s + (Number(v) || 0), 0), 0);
        const allocate = Math.min(apt._remaining, leftover);
        next[apt.id] = String(allocate > 0 ? allocate : apt._remaining);
      } else {
        delete next[apt.id];
      }
      return next;
    });
  };

  const updateAlloc = (aptId: string, value: string) => {
    setAllocs((prev) => ({ ...prev, [aptId]: value }));
  };

  const autoAllocate = () => {
    let leftover = numAmount;
    const next: Record<string, string> = {};
    for (const a of filteredAppointments) {
      if (leftover <= 0) break;
      if (a._remaining <= 0) continue;
      const take = Math.min(a._remaining, leftover);
      next[a.id] = String(Number(take.toFixed(2)));
      leftover -= take;
    }
    setAllocs(next);
  };

  const handleSave = async () => {
    if (!numAmount) {
      toast({ title: t("incomeConfirm.amountRequired"), variant: "destructive" });
      return;
    }
    if (allocOver) {
      toast({ title: t("incomeConfirm.allocExceeds"), variant: "destructive" });
      return;
    }
    if (isUnlinked && !confirmUnlinked) {
      toast({ title: t("incomeConfirm.unlinkedWarning"), variant: "destructive" });
      setConfirmUnlinked(true);
      return;
    }
    try {
      await save.mutateAsync({
        income_id: existingIncome?.id,
        client_id: clientId,
        amount: numAmount,
        date,
        payment_method: method,
        status,
        comment: comment.trim() || undefined,
        allocations: Object.entries(allocs)
          .map(([appointment_id, v]) => ({ appointment_id, allocated_amount: Number(v) || 0 }))
          .filter((a) => a.allocated_amount > 0),
      });
      toast({ title: t("incomeConfirm.saved") });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle>{isEdit ? t("incomeConfirm.editTitle") : t("incomeConfirm.title")}</DialogTitle>
          {clientName && <DialogDescription>{clientName}</DialogDescription>}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("incomeConfirm.amount")} *</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("incomeConfirm.date")} *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("incomeConfirm.method")}</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("incomeConfirm.status")} *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">{t("incomeConfirm.statusConfirmed")}</SelectItem>
                  <SelectItem value="draft">{t("incomeConfirm.statusDraft")}</SelectItem>
                  <SelectItem value="cancelled">{t("incomeConfirm.statusCancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("incomeConfirm.comment")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></Label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} className="min-h-[60px]" />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold">{t("incomeConfirm.linkedSessions")}</h4>
              <p className="text-xs text-muted-foreground">{t("incomeConfirm.linkedDescription")}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                { k: "unpaid", l: t("incomeConfirm.filterUnpaid") },
                { k: "partial", l: t("incomeConfirm.filterPartial") },
                { k: "future", l: t("incomeConfirm.filterFuture") },
                { k: "cancelled_billable", l: t("incomeConfirm.filterCancelledBillable") },
                { k: "all", l: t("incomeConfirm.filterAll") },
              ] as { k: FilterKey; l: string }[]).map((f) => (
                <Button key={f.k} type="button" size="sm"
                  variant={filter === f.k ? "default" : "outline"}
                  onClick={() => setFilter(f.k)}>
                  {f.l}
                </Button>
              ))}
              <div className="ml-auto">
                <Button type="button" size="sm" variant="ghost" onClick={autoAllocate} disabled={!numAmount}>
                  {t("incomeConfirm.autoAllocate")}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border divide-y divide-border max-h-[320px] overflow-y-auto">
              {filteredAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">—</p>
              ) : filteredAppointments.map((a: any) => {
                const checked = !!allocs[a.id] && Number(allocs[a.id]) > 0;
                const isCancelled = a.status === "cancelled" || a.status === "no-show";
                return (
                  <div key={a.id} className={cn("flex items-center gap-3 p-3", checked && "bg-primary/5")}>
                    <Checkbox checked={checked} onCheckedChange={(v) => toggleApt(a, !!v)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{format(new Date(a.scheduled_at), "MMM d, yyyy")}</span>
                        <span className="text-muted-foreground">{formatScheduledTime(a.scheduled_at, use12h)}</span>
                        <span className="text-muted-foreground truncate">· {a.services?.name || "—"}</span>
                        {isCancelled && <Badge variant="outline" className="text-[10px]">{a.status}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {cs}{a._price.toFixed(2)} · {t("incomeConfirm.alreadyPaid")}: {cs}{a._otherPaid.toFixed(2)} · {t("incomeConfirm.remaining")}: {cs}{a._remaining.toFixed(2)}
                      </div>
                    </div>
                    {checked && (
                      <Input
                        type="number" step="0.01" min="0"
                        className="w-24 h-8 text-sm"
                        value={allocs[a.id] || ""}
                        onChange={(e) => updateAlloc(a.id, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("incomeConfirm.allocated")}</span>
                <span className={cn("font-medium", allocOver && "text-destructive")}>{cs}{allocSum.toFixed(2)} / {cs}{numAmount.toFixed(2)}</span>
              </div>
              {linkedCount > 0 && (
                <div className="text-xs text-muted-foreground">{t("incomeConfirm.coversN", { count: String(linkedCount) })}</div>
              )}
              {remainder > 0 && status === "confirmed" && (
                <div className="text-xs text-success">{t("incomeConfirm.prepayLine", { amount: `${cs}${remainder.toFixed(2)}` })}</div>
              )}
            </div>

            {isUnlinked && numAmount > 0 && (
              <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 flex gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <p>{t("incomeConfirm.unlinkedWarning")}</p>
                  {confirmUnlinked && <p className="mt-1 text-xs text-muted-foreground">{t("incomeConfirm.confirmUnlinked")} ✓</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 py-4 border-t border-border bg-background shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={save.isPending || allocOver}>
            {save.isPending ? t("common.saving") : (isUnlinked && numAmount > 0 && !confirmUnlinked ? t("incomeConfirm.confirmUnlinked") : t("common.save"))}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
