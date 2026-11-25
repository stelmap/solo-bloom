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
import { Globe, Copy, Inbox, Mail, ArrowRightLeft } from "lucide-react";
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

export function GroupPublicationCard({ group }: { group: any }) {
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
        <Button size="sm" variant={published ? "outline" : "default"} disabled={disabled || update.isPending}
          onClick={() => update.mutate({ id: group.id, publication_status: published ? "unpublished" : "published" },
            { onError: (e: any) => toast({ title: describeError(e.message), variant: "destructive" }) })}>
          {published ? g.unpublish : g.publish}
        </Button>
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

export function GroupRegistrationsCard({ group }: { group: any }) {
  const { lang } = useLanguage();
  const g = groupsText(lang);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: regs = [] } = useGroupRegistrations(group.id);
  const { data: groups = [] } = useGroups();
  const decide = useDecideRegistration();
  const transfer = useTransferRegistrations();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notify, setNotify] = useState(true);
  const [transferOpen, setTransferOpen] = useState(false);
  const [target, setTarget] = useState("new");
  const [newName, setNewName] = useState("");
  const targets = useMemo(() => groups.filter((x: any) => x.id !== group.id && x.lifecycle_status === "active"), [groups, group.id]);

  const act = async (id: string, decision: "confirm" | "reject" | "waitlist") => {
    try {
      await decide.mutateAsync({ id, decision });
      if (decision === "confirm") window.__lovableEvents?.track?.("project.group_application_confirmed", {});
      else if (decision === "reject") window.__lovableEvents?.track?.("project.group_application_rejected", {});
      else window.__lovableEvents?.track?.("project.group_application_waitlisted", { source: "manual" });
      if (notify) {
        await supabase.functions.invoke("send-group-email", { body: { kind: "decision", registrationId: id, language: lang } });
      }
    } catch (e: any) {
      toast({ title: describeError(e.message?.includes("GROUP_FULL") ? g.groupFull : e.message), variant: "destructive" });
    }
  };

  const doTransfer = async () => {
    try {
      const id = await transfer.mutateAsync({ ids: [...selected], targetGroupId: target === "new" ? null : target, newName: newName || `${group.name} (${g.copyOf})` });
      toast({ title: g.transferred_ok });
      setTransferOpen(false); setSelected(new Set());
      navigate(`/groups/${id}`);
    } catch (e: any) { toast({ title: describeError(e.message), variant: "destructive" }); }
  };

  const movable = (r: any) => r.status === "waitlisted" || r.status === "pending";

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{g.registrations} ({regs.length})</h2>
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
      {regs.length === 0 ? <p className="text-muted-foreground text-sm text-center py-4">{g.noRegistrations}</p> : (
        <div className="space-y-2">
          {regs.map((r: any) => (
            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-muted/30">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Checkbox className="mt-1" disabled={!movable(r)} checked={selected.has(r.id)}
                  onCheckedChange={v => setSelected(s => { const n = new Set(s); v ? n.add(r.id) : n.delete(r.id); return n; })} />
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2 flex-wrap">{r.person_name}
                    <Badge variant={STATUS_VARIANT[r.status]} className="text-xs">{(g as any)[r.status]}</Badge></p>
                  <p className="text-xs text-muted-foreground truncate">{r.email}{r.phone ? ` · ${r.phone}` : ""} · {format(new Date(r.submitted_at), "dd.MM.yyyy HH:mm")}</p>
                  {r.message && <p className="text-xs text-foreground/80 mt-1 whitespace-pre-line">{r.message}</p>}
                  {Array.isArray(r.answers) && r.answers.filter((a: any) => a.value).map((a: any) => (
                    <p key={a.id} className="text-xs text-foreground/80 mt-0.5 whitespace-pre-line"><span className="text-muted-foreground">{a.label}:</span> {a.type === "checkbox" ? "✓" : a.value}</p>
                  ))}
                </div>
              </div>
              {(r.status === "pending" || r.status === "waitlisted") && (
                <div className="flex gap-1.5 flex-wrap">
                  <Button size="sm" disabled={decide.isPending} onClick={() => act(r.id, "confirm")}>{g.confirm}</Button>
                  {r.status === "pending" && <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => act(r.id, "waitlist")}>{g.toWaitlist}</Button>}
                  <Button size="sm" variant="ghost" className="text-destructive" disabled={decide.isPending} onClick={() => act(r.id, "reject")}>{g.reject}</Button>
                </div>
              )}
            </div>
          ))}
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
