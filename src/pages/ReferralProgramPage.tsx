import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus, Users, CheckCircle2, Coins, Wallet, Target, Info, Link2, Copy, Send, Mail, Layers, Zap, Percent, Search, AlertCircle,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { referralCopy } from "@/lib/referralCopy";
import { cn } from "@/lib/utils";

const ORIGIN = "https://solo-bizz.com";

type Referral = {
  id: string; display_name: string; registered_at: string; reward_starts_at: string; reward_ends_at: string;
  commission_percent: number; reward_months: number; plan_name: string | null; status: string; earned: number;
  history: { type: string; amount: number; currency: string; date: string }[];
};
type Payout = { id: string; amount: number; currency: string; status: string; payout_method: string; requested_at: string; processed_at: string | null };
type Dashboard = {
  settings: { commission_percent: number; reward_months: number; min_payout: number };
  code: string | null; invited: number; active: number;
  balances: { earned: number; withdrawable: number; own_price: number; covered: number; remaining_to_cover: number; currency: string; plan_name: string | null; billing_period: string | null };
  referrals: Referral[]; payouts: Payout[];
};

const statusTone: Record<string, string> = {
  active: "bg-success/10 text-success", paid: "bg-success/10 text-success",
  awaiting_payment: "bg-primary/10 text-primary", pending: "bg-primary/10 text-primary", processing: "bg-primary/10 text-primary",
};

export default function ReferralProgramPage() {
  const { lang } = useLanguage();
  const c = referralCopy[lang] ?? referralCopy.uk;
  const { toast } = useToast();
  const qc = useQueryClient();
  const locale = { uk: "uk-UA", en: "en-GB", ru: "ru-RU", pl: "pl-PL", fr: "fr-FR" }[lang] ?? "uk-UA";

  const q = useQuery({
    queryKey: ["referral-dashboard"],
    queryFn: async () => {
      const { error: codeErr } = await supabase.rpc("get_my_referral_code");
      if (codeErr) throw codeErr;
      const { data, error } = await supabase.rpc("get_my_referral_dashboard");
      if (error) throw error;
      return data as unknown as Dashboard;
    },
  });
  const d = q.data;
  const cur = d?.balances.currency ?? "EUR";
  const money = (v: number, currency = cur) => new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: Number(v) % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(Number(v) || 0);
  const date = (v: string) => new Date(v).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  const url = d?.code ? `${ORIGIN}/?ref=${d.code}` : "";

  const [inviteOpen, setInviteOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [selected, setSelected] = useState<Referral | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<"date" | "earned">("date");
  const [page, setPage] = useState(0);
  const PAGE = 10;

  const copyText = async (text: string, msg: string) => {
    try { await navigator.clipboard.writeText(text); toast({ title: msg }); } catch { /* ignore */ }
  };

  const rows = useMemo(() => {
    let r = d?.referrals ?? [];
    if (search.trim()) r = r.filter((x) => x.display_name.toLowerCase().includes(search.trim().toLowerCase()));
    if (statusFilter !== "all") r = r.filter((x) => x.status === statusFilter);
    return [...r].sort((a, b) => sort === "earned" ? Number(b.earned) - Number(a.earned) : b.registered_at.localeCompare(a.registered_at));
  }, [d, search, statusFilter, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE);

  const cancelPayout = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("cancel_referral_payout", { p_id: id }); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["referral-dashboard"] }),
  });

  const b = d?.balances;
  const pct = b && b.own_price > 0 ? Math.round((b.covered / b.own_price) * 100) : 0;
  const canPayout = !!b && b.withdrawable > 0 && b.withdrawable >= (d?.settings.min_payout ?? 0);
  const periodLabel = (bp: string | null) => (bp ? c.perPeriod[bp] ?? bp : "");

  const kpis = [
    { icon: Users, label: c.invited, tip: c.invitedTip, value: d?.invited ?? 0, tone: "bg-accent text-accent-foreground" },
    { icon: CheckCircle2, label: c.active, tip: c.activeTip, value: d?.active ?? 0, tone: "bg-success/10 text-success" },
    { icon: Coins, label: c.earned, tip: c.earnedTip, value: money(b?.earned ?? 0), tone: "bg-primary/10 text-primary" },
    { icon: Wallet, label: c.withdrawable, tip: c.withdrawableTip, value: money(b?.withdrawable ?? 0), tone: "bg-success/10 text-success" },
    { icon: Target, label: c.toCover, tip: c.toCoverTip, value: money(b?.remaining_to_cover ?? 0), tone: "bg-primary/10 text-primary" },
  ];
  const stepIcons = [Link2, UserPlus, Link2, Percent];
  const card = "rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm";

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
          <header className="flex items-start gap-3">
            <UserPlus className="mt-1 h-7 w-7 shrink-0 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{c.title}</h1>
              <p className="text-muted-foreground">{c.subtitle}</p>
            </div>
          </header>

          {q.isError ? (
            <div className={cn(card, "flex flex-col items-center gap-3 py-10 text-center")}>
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p>{c.error}</p>
              <Button variant="outline" onClick={() => q.refetch()}>{c.retry}</Button>
            </div>
          ) : (
            <>
              <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {kpis.map((k) => (
                  <Tooltip key={k.label}>
                    <TooltipTrigger asChild>
                      <div className={cn(card, "flex cursor-help items-start gap-3")} tabIndex={0}>
                        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", k.tone)}><k.icon className="h-5 w-5" /></span>
                        <div className="min-w-0">
                          <p className="text-sm text-muted-foreground">{k.label}</p>
                          {q.isLoading ? <Skeleton className="mt-1 h-7 w-16" /> : <p className="text-2xl font-bold text-foreground">{k.value}</p>}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">{k.tip}</TooltipContent>
                  </Tooltip>
                ))}
              </section>

              <div className="flex gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p><strong>{c.rulesLead}</strong> {d ? c.rules(String(Number(d.settings.commission_percent)), d.settings.reward_months) : "…"}</p>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                <section className={card}>
                  <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Link2 className="h-5 w-5 text-primary" />{c.myLink}</h2>
                  <div className="flex gap-2">
                    <Input readOnly value={url} aria-label={c.myLink} className="font-mono text-sm" />
                    <Button variant="outline" disabled={!url} onClick={() => copyText(url, c.copied)}><Copy className="mr-1 h-4 w-4" />{c.copy}</Button>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button disabled={!url} onClick={() => setInviteOpen(true)}><Send className="mr-1 h-4 w-4" />{c.invite}</Button>
                    <span className="ml-1 text-sm text-muted-foreground">{c.share}</span>
                    <Button variant="outline" size="sm" asChild disabled={!url}>
                      <a href={`mailto:?subject=${encodeURIComponent("Solo .Bizz")}&body=${encodeURIComponent(c.inviteText(url))}`}><Mail className="mr-1 h-4 w-4" />Email</a>
                    </Button>
                    <Button variant="outline" size="sm" asChild disabled={!url}>
                      <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(c.inviteText("").trim())}`} target="_blank" rel="noopener noreferrer"><Send className="mr-1 h-4 w-4" />Telegram</a>
                    </Button>
                    <Button variant="outline" size="sm" disabled={!url} onClick={() => copyText(url, c.copied)}><Copy className="mr-1 h-4 w-4" />{c.copy}</Button>
                  </div>
                </section>

                <section className={card}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-lg font-semibold"><Layers className="h-5 w-5 text-primary" />{c.coverage}</h2>
                    {b && b.own_price > 0 && (
                      <span className="rounded-lg border border-border bg-muted px-2 py-1 text-xs">{c.tariff} {b.plan_name ?? ""} — {money(b.own_price)}/{periodLabel(b.billing_period)}</span>
                    )}
                  </div>
                  {q.isLoading || !b ? <Skeleton className="h-16 w-full" /> : b.own_price > 0 ? (
                    <>
                      <p className="mb-2">{c.covered(money(b.covered), money(b.own_price))}</p>
                      <div className="h-6 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                        <div className="flex h-full items-center justify-end rounded-full bg-primary pr-2 text-xs font-semibold text-primary-foreground transition-all" style={{ width: `${Math.max(pct, pct > 0 ? 12 : 0)}%` }}>{pct > 0 ? `${pct}%` : ""}</div>
                      </div>
                      <p className="mt-2 text-sm">
                        {b.earned <= 0 ? c.noEarnings : b.remaining_to_cover > 0 ? `${c.remaining}: ${money(b.remaining_to_cover)}` : <span className="text-success">{c.fullyCovered}</span>}
                      </p>
                      {b.withdrawable > 0 && <p className="mt-1 text-sm font-medium text-success">{c.surplus}: {money(b.withdrawable)}</p>}
                    </>
                  ) : <p className="text-sm text-muted-foreground">{b.earned > 0 ? c.noSubscription : c.noEarnings}</p>}
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Info className="h-4 w-4" />{c.coverageNote}</p>
                </section>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
                <div className="min-w-0 space-y-5">
                  <section className={card}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5 text-primary" />{c.referrals}</h2>
                      <div className="flex flex-wrap gap-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder={c.search} className="h-9 w-40 pl-8" />
                        </div>
                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{c.allStatuses}</SelectItem>
                            {Object.entries(c.status).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={sort} onValueChange={(v) => setSort(v as "date" | "earned")}>
                          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="date">{c.sortDate}</SelectItem><SelectItem value="earned">{c.sortEarned}</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    {q.isLoading ? <Skeleton className="h-24 w-full" /> : rows.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">{c.noReferrals}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                          <thead className="bg-muted text-left text-xs text-muted-foreground">
                            <tr>{[c.colUser, c.colDate, c.colStatus, c.colPlan, c.colEarned, c.colPeriod].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {pageRows.map((r) => (
                              <tr key={r.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50" onClick={() => setSelected(r)}>
                                <td className="px-3 py-2 font-medium">{r.display_name}</td>
                                <td className="px-3 py-2">{date(r.registered_at)}</td>
                                <td className="px-3 py-2"><span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs", statusTone[r.status] ?? "bg-muted text-muted-foreground")}>{c.status[r.status] ?? r.status}</span></td>
                                <td className="px-3 py-2">{r.plan_name ?? "—"}</td>
                                <td className="px-3 py-2 font-semibold">{money(r.earned)}</td>
                                <td className="px-3 py-2 text-xs">{date(r.reward_starts_at)} – {date(r.reward_ends_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {pages > 1 && (
                          <div className="mt-3 flex justify-end gap-2">
                            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</Button>
                            <span className="self-center text-sm">{page + 1} / {pages}</span>
                            <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>›</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  <section className={card}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="flex items-center gap-2 text-lg font-semibold"><Wallet className="h-5 w-5 text-primary" />{c.payouts}</h2>
                      <Button disabled={!canPayout} onClick={() => setPayoutOpen(true)}><Wallet className="mr-1 h-4 w-4" />{c.requestPayout}{b && b.withdrawable > 0 ? ` (${money(b.withdrawable)})` : ""}</Button>
                    </div>
                    {d && b && b.withdrawable > 0 && !canPayout && <p className="mb-2 text-xs text-muted-foreground">{c.minPayout(money(d.settings.min_payout))}</p>}
                    {(d?.payouts.length ?? 0) === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">{c.noPayouts}</p> : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-sm">
                          <thead className="bg-muted text-left text-xs text-muted-foreground">
                            <tr><th className="px-3 py-2 font-medium">{c.colDate}</th><th className="px-3 py-2 font-medium">{c.colAmount}</th><th className="px-3 py-2 font-medium">{c.colStatus}</th><th className="px-3 py-2 font-medium">{c.colMethod}</th><th /></tr>
                          </thead>
                          <tbody>
                            {d!.payouts.map((p) => (
                              <tr key={p.id} className="border-b border-border last:border-0">
                                <td className="px-3 py-2">{date(p.processed_at ?? p.requested_at)}</td>
                                <td className="px-3 py-2 font-semibold">{money(p.amount, p.currency)}</td>
                                <td className="px-3 py-2"><span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs", statusTone[p.status] ?? "bg-muted text-muted-foreground")}>{c.payoutStatus[p.status] ?? p.status}</span></td>
                                <td className="px-3 py-2">{c.method[p.payout_method] ?? p.payout_method}</td>
                                <td className="px-3 py-2 text-right">{p.status === "pending" && <Button size="sm" variant="ghost" onClick={() => cancelPayout.mutate(p.id)}>{c.cancelRequest}</Button>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">{c.payoutNote}</p>
                  </section>
                </div>

                <aside className={cn(card, "h-fit")}>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Zap className="h-5 w-5 text-primary" />{c.how}</h2>
                  <ol className="space-y-4">
                    {c.steps.map(([title, text], i) => {
                      const Icon = stepIcons[i];
                      return (
                        <li key={title} className="flex gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
                          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
                          <div><p className="font-semibold">{title}</p><p className="text-sm text-muted-foreground">{text}</p></div>
                        </li>
                      );
                    })}
                  </ol>
                </aside>
              </div>
            </>
          )}
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{c.inviteTitle}</DialogTitle></DialogHeader>
            <Textarea readOnly rows={5} value={c.inviteText(url)} />
            <DialogFooter><Button onClick={() => copyText(c.inviteText(url), c.messageCopied)}><Copy className="mr-1 h-4 w-4" />{c.copyMessage}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {d && b && <PayoutDialog open={payoutOpen} onOpenChange={setPayoutOpen} available={b.withdrawable} min={d.settings.min_payout} money={money} c={c} />}

        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent>
            {selected && (
              <>
                <SheetHeader><SheetTitle>{c.details}: {selected.display_name}</SheetTitle></SheetHeader>
                <dl className="mt-4 space-y-2 text-sm">
                  {[
                    [c.colDate, date(selected.registered_at)],
                    [c.colStatus, c.status[selected.status] ?? selected.status],
                    [c.percent, `${Number(selected.commission_percent)}%`],
                    [c.rewardPeriod, `${date(selected.reward_starts_at)} – ${date(selected.reward_ends_at)} (${selected.reward_months})`],
                    [c.remainingEligibility, `${Math.max(0, Math.ceil((+new Date(selected.reward_ends_at) - Date.now()) / 86400000))} ${c.days}`],
                    [c.colEarned, money(selected.earned)],
                  ].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
                </dl>
                <h3 className="mb-2 mt-6 font-semibold">{c.history}</h3>
                {selected.history.length === 0 ? <p className="text-sm text-muted-foreground">{c.noHistory}</p> : (
                  <ul className="space-y-2 text-sm">
                    {selected.history.map((h, i) => (
                      <li key={i} className="flex justify-between"><span>{date(h.date)} · {c.entry[h.type] ?? h.type}</span><span className={cn("font-medium", Number(h.amount) < 0 ? "text-destructive" : "text-success")}>{money(h.amount, h.currency)}</span></li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </SheetContent>
        </Sheet>
      </TooltipProvider>
    </AppLayout>
  );
}

function PayoutDialog({ open, onOpenChange, available, min, money, c }: {
  open: boolean; onOpenChange: (o: boolean) => void; available: number; min: number; money: (v: number) => string; c: (typeof referralCopy)["uk"];
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_card");
  const [details, setDetails] = useState("");
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("request_referral_payout", { p_amount: Number(amount.replace(",", ".")), p_method: method, p_details: details });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: c.payoutCreated });
      onOpenChange(false); setAmount(""); setDetails("");
      qc.invalidateQueries({ queryKey: ["referral-dashboard"] });
    },
    onError: (e: any) => {
      const key = Object.keys(c.errors).find((k) => String(e?.message ?? "").includes(k));
      toast({ title: key ? c.errors[key] : c.error, variant: "destructive" });
    },
  });
  const n = Number(amount.replace(",", "."));
  const valid = n > 0 && n <= available && n >= min && details.trim().length >= 4;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{c.requestPayout}</DialogTitle></DialogHeader>
        <p className="text-sm">{c.available}: <strong>{money(available)}</strong></p>
        <p className="text-xs text-muted-foreground">{c.minPayout(money(min))}</p>
        <div className="space-y-3">
          <div><Label htmlFor="ref-amount">{c.amount}</Label><Input id="ref-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(available)} /></div>
          <div>
            <Label>{c.colMethod}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(c.method).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="ref-details">{c.details2}</Label><Input id="ref-details" value={details} maxLength={200} onChange={(e) => setDetails(e.target.value)} autoComplete="off" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{c.cancel}</Button>
          <Button disabled={!valid || m.isPending} onClick={() => m.mutate()}>{c.submit}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
