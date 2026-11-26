import type React from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Copy, Inbox, Mail, ArrowRightLeft, Search, ChevronLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { groupApplicationsText } from "@/i18n/groupApplicationsText";
import { APPLICATION_FILTERS, filterApplications, countByStatus, allowedDecisions, type ApplicationFilter } from "@/lib/groupApplications";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { groupsText, groupSignupUrl } from "@/i18n/groupsExtra";
import { describeError } from "@/lib/errorMessages";
import { useGroups, useGroupRegistrations, useDecideRegistration, useTransferRegistrations, useUpdateGroup } from "@/hooks/useGroups";
import { format } from "date-fns";

export type GroupSettingsForm = {
  group_type: string; participant_instructions: string; capacity: string; price_amount: string; bill_absent: boolean;
};
export const settingsFromGroup = (g: any): GroupSettingsForm => ({
  group_type: g?.group_type ?? "regular",
  participant_instructions: g?.participant_instructions ?? "",
  capacity: g?.capacity ? String(g.capacity) : "",
  price_amount: g?.price_amount != null ? String(g.price_amount) : "",
  bill_absent: g?.bill_absent ?? false,
});
export const settingsToPatch = (f: GroupSettingsForm) => {
  const cap = parseInt(f.capacity, 10);
  const price = parseFloat(f.price_amount.replace(",", "."));
  return {
    group_type: f.group_type,
    participant_instructions: f.participant_instructions.trim() || null,
    capacity: Number.isFinite(cap) && cap > 0 ? cap : null,
    price_amount: Number.isFinite(price) && price >= 0 ? price : null,
    bill_absent: f.bill_absent,
  };
};

export function GroupSettingsFields({ value, onChange }: { value: GroupSettingsForm; onChange: (f: GroupSettingsForm) => void }) {
  const { lang } = useLanguage();
  const g = groupsText(lang);
  const set = (p: Partial<GroupSettingsForm>) => onChange({ ...value, ...p });
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{g.type}</Label>
        <Select value={value.group_type} onValueChange={v => set({ group_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="regular">{g.regular}</SelectItem>
            <SelectItem value="supervision">{g.supervision}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{g.capacity}</Label>
          <Input inputMode="numeric" value={value.capacity} onChange={e => set({ capacity: e.target.value.replace(/\D/g, "") })} />
          <p className="text-xs text-muted-foreground">{g.capacityHint}</p>
        </div>
        <div className="space-y-2">
          <Label>{g.price}</Label>
          <Input inputMode="decimal" value={value.price_amount} onChange={e => set({ price_amount: e.target.value.replace(/[^\d.,]/g, "") })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{g.instructions}</Label>
        <Textarea rows={3} maxLength={2000} value={value.participant_instructions} onChange={e => set({ participant_instructions: e.target.value })} />
        <p className="text-xs text-muted-foreground">{g.instructionsHint}</p>
      </div>
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-3">
        <div>
          <p className="text-sm">{g.absencePolicy}</p>
          <p className="text-xs text-muted-foreground">{value.bill_absent ? g.chargeAbsent : g.noChargeAbsent}</p>
        </div>
        <Switch checked={value.bill_absent} onCheckedChange={v => set({ bill_absent: v })} />
      </div>
    </div>
  );
}

export function GroupPublicationCard({ group, actions }: { group: any; actions?: React.ReactNode }) {
  const { lang } = useLanguage();
  const g = groupsText(lang);
  const { toast } = useToast();
  const update = useUpdateGroup();
  const published = group.publication_status === "published";
  const url = groupSignupUrl(group.registration_token, lang);
  const disabled = group.lifecycle_status !== "active";
  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{g.publication}</h2>
          <Badge variant={published ? "default" : "secondary"}>{published ? g.published : g.unpublished}</Badge>
        </div>
        <div className="flex gap-2 flex-wrap">{actions}
        <Button size="sm" variant={published ? "outline" : "default"} disabled={disabled || update.isPending}
          onClick={() => update.mutate({ id: group.id, publication_status: published ? "unpublished" : "published" },
            { onError: (e: any) => toast({ title: describeError(e.message), variant: "destructive" }) })}>
          {published ? g.unpublish : g.publish}
        </Button></div>
      </div>
      <p className="text-sm text-muted-foreground">{g.publishHint}</p>
      {published && (
        <div className="flex gap-2">
          <Input readOnly value={url} className="text-xs" />
          <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(url); toast({ title: g.linkCopied }); }}>
            <Copy className="h-4 w-4 mr-1" />{g.copyLink}
          </Button>
        </div>
      )}
    </div>
  );
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default", confirmed: "secondary", rejected: "destructive", waitlisted: "outline", transferred: "outline",
};

export function GroupRegistrationsCard({ group, onOpenForm }: { group: any; onOpenForm?: () => void }) {
  const { lang } = useLanguage();
  const g = groupsText(lang);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: regs = [], isLoading } = useGroupRegistrations(group.id);
  const { data: groups = [] } = useGroups();
  const decide = useDecideRegistration();
  const transfer = useTransferRegistrations();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notify, setNotify] = useState(true);
  const [transferOpen, setTransferOpen] = useState(false);
  const [target, setTarget] = useState("new");
  const [newName, setNewName] = useState("");
  const targets = useMemo(() => groups.filter((x: any) => x.id !== group.id && x.lifecycle_status === "active"), [groups, group.id]);

  const doTransfer = async () => {
    try {
      const id = await transfer.mutateAsync({ ids: [...selected], targetGroupId: target === "new" ? null : target, newName: newName || `${group.name} (${g.copyOf})` });
      toast({ title: g.transferred_ok });
      setTransferOpen(false); setSelected(new Set());
      navigate(`/groups/${id}`);
    } catch (e: any) { toast({ title: describeError(e.message), variant: "destructive" }); }
  };

  const movable = (r: any) => r.status === "waitlisted" || r.status === "pending";
  const a = groupApplicationsText(lang);
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<ApplicationFilter>("all");
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const counts = useMemo(() => countByStatus(regs), [regs]);
  const visible = useMemo(() => filterApplications(regs, filter, query, order), [regs, filter, query, order]);
  const active = regs.find((r: any) => r.id === activeId) ?? null;
  const published = group.publication_status === "published";
  const fmt = (iso: string) => format(new Date(iso), "dd.MM.yyyy HH:mm");
  const runAct = async (id: string, d: "confirm" | "reject" | "waitlist") => {
    setActionError(null);
    try { await decide.mutateAsync({ id, decision: d }); } catch (e: any) { setActionError(describeError(e.message?.includes("GROUP_FULL") ? g.groupFull : e.message)); return; }
    if (d === "confirm") window.__lovableEvents?.track?.("project.group_application_confirmed", {});
    else if (d === "reject") window.__lovableEvents?.track?.("project.group_application_rejected", {});
    else window.__lovableEvents?.track?.("project.group_application_waitlisted", { source: "manual" });
    if (notify) {
      try { await supabase.functions.invoke("send-group-email", { body: { kind: "decision", registrationId: id, language: lang } }); }
      catch (e: any) { toast({ title: describeError(e.message), variant: "destructive" }); }
    }
  };

  const details = active && (
    <div className="space-y-4">
      {isMobile && <Button variant="ghost" size="sm" onClick={() => setActiveId(null)}><ChevronLeft className="h-4 w-4 mr-1" />{a.back}</Button>}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-semibold break-words">{active.person_name}</h3>
          <Badge variant={STATUS_VARIANT[active.status]} className="text-xs">{(g as any)[active.status] ?? active.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground break-all">{active.email}</p>
        <p className="text-xs text-muted-foreground mt-1">{a.submitted}: {fmt(active.submitted_at)}</p>
      </div>
      {active.phone && <div><p className="text-xs text-muted-foreground">{a.phone}</p><p className="text-sm">{active.phone}</p></div>}
      {active.message && <div><p className="text-xs text-muted-foreground">{a.message}</p><p className="text-sm whitespace-pre-line">{active.message}</p></div>}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{a.answers}</p>
        {Array.isArray(active.answers) && active.answers.some((x: any) => x.value) ? active.answers.filter((x: any) => x.value).map((x: any) => (
          <div key={x.id} className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{x.label}</p>
            <p className="text-sm whitespace-pre-line">{x.type === "checkbox" ? "✓" : String(x.value)}</p>
          </div>
        )) : <p className="text-sm text-muted-foreground">{a.noAnswers}</p>}
      </div>
      {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
      {allowedDecisions(active.status).length > 0 && (
        <div className="flex gap-2 flex-wrap pt-2 border-t border-border">
          {allowedDecisions(active.status).map(d => (
            <Button key={d} size="sm" disabled={decide.isPending}
              variant={d === "confirm" ? "default" : d === "waitlist" ? "outline" : "ghost"}
              className={d === "reject" ? "text-destructive" : undefined}
              onClick={() => runAct(active.id, d)}>
              {decide.isPending ? a.processing : d === "confirm" ? g.confirm : d === "waitlist" ? g.toWaitlist : g.reject}
            </Button>
          ))}
        </div>
      )}
    </div>
  );

  const list = (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {APPLICATION_FILTERS.map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="h-8" onClick={() => setFilter(f)}>
            {f === "all" ? a.all : (g as any)[f]} ({counts[f]})
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={a.search} value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <Select value={order} onValueChange={v => setOrder(v as "newest" | "oldest")}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="newest">{a.newest}</SelectItem><SelectItem value="oldest">{a.oldest}</SelectItem></SelectContent>
        </Select>
      </div>
      {visible.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">{a.noResults}</p> : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {visible.map((r: any) => (
            <div key={r.id} className={cn("flex items-center gap-3 p-3 cursor-pointer transition-colors", activeId === r.id ? "bg-primary/10" : "hover:bg-muted/40")}
              onClick={() => { setActiveId(r.id); setActionError(null); }}>
              <Checkbox disabled={!movable(r)} checked={selected.has(r.id)} onClick={e => e.stopPropagation()}
                onCheckedChange={v => setSelected(s => { const n = new Set(s); v ? n.add(r.id) : n.delete(r.id); return n; })} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{r.person_name}</p>
                <p className="text-xs text-muted-foreground truncate">{r.email} · {fmt(r.submitted_at)}</p>
              </div>
              <Badge variant={STATUS_VARIANT[r.status]} className="text-xs shrink-0">{(g as any)[r.status] ?? r.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{g.registrations}</h2>
          <Badge variant="secondary">{a.total}: {regs.length}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={notify} onCheckedChange={v => setNotify(!!v)} />{g.emailDecision}
          </label>
          <Button size="sm" variant="outline" disabled={selected.size === 0} onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="h-4 w-4 mr-1" />{g.transfer} ({selected.size})
          </Button>
        </div>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground text-center py-6">…</p> : regs.length === 0 ? (
        <div className="text-center py-8 space-y-3">
          <Inbox className="h-8 w-8 mx-auto text-primary" />
          <p className="font-medium">{g.noRegistrations}</p>
          <p className="text-sm text-muted-foreground">{a.shareHint}</p>
          {published
            ? <Button size="sm" onClick={async () => { await navigator.clipboard.writeText(groupSignupUrl(group.registration_token, lang)); toast({ title: g.linkCopied }); }}><Copy className="h-4 w-4 mr-1" />{g.copyLink}</Button>
            : onOpenForm && <Button size="sm" variant="outline" onClick={onOpenForm}><Globe className="h-4 w-4 mr-1" />{a.openForm}</Button>}
        </div>
      ) : isMobile ? (active ? details : list) : (
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5">
          {list}
          <div className="rounded-lg border border-border p-4 min-h-[200px]">
            {details || <p className="text-sm text-muted-foreground text-center py-10">{a.selectHint}</p>}
          </div>
        </div>
      )}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{g.transferTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{g.targetGroup}</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{g.newCopy}</SelectItem>
                  {targets.map((x: any) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {target === "new" && (
              <div className="space-y-2">
                <Label>{g.newName}</Label>
                <Input value={newName} placeholder={`${group.name} (${g.copyOf})`} maxLength={100} onChange={e => setNewName(e.target.value)} />
              </div>
            )}
            <Button className="w-full" disabled={transfer.isPending} onClick={doTransfer}>{g.transfer} ({selected.size})</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function GroupMessageDialog({ groupId, open, onOpenChange }: { groupId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { lang } = useLanguage();
  const g = groupsText(lang);
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const linkOk = !link || /^https:\/\/\S+$/i.test(link.trim());
  const send = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-group-email", { body: { kind: "message", groupId, subject, message, link: link.trim() || undefined, language: lang } });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: g.sentCount(data?.sent ?? 0) });
      setSubject(""); setMessage(""); setLink(""); onOpenChange(false);
    } catch (e: any) { toast({ title: describeError(e.message), variant: "destructive" }); }
    finally { setSending(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-4 w-4" />{g.sendMessage}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>{g.subject}</Label><Input maxLength={150} value={subject} onChange={e => setSubject(e.target.value)} /></div>
          <div className="space-y-2"><Label>{g.message}</Label><Textarea rows={5} maxLength={5000} value={message} onChange={e => setMessage(e.target.value)} /></div>
          <div className="space-y-2"><Label>{g.materialLink}</Label><Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://" />
            {!linkOk && <p className="text-xs text-destructive">https://</p>}</div>
          <Button className="w-full" disabled={sending || !subject.trim() || !message.trim() || !linkOk} onClick={send}>{sending ? "…" : g.send}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
