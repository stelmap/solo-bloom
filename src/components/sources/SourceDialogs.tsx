import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { describeError } from "@/lib/errorMessages";
import { SOURCE_TYPES, type Campaign, type ClientSource } from "@/lib/clientSources";
import { useSourceCopy } from "@/lib/clientSourcesCopy";
import { useSaveCampaign, useSaveSource } from "@/hooks/useClientSources";

export function SourceDialog({ open, onOpenChange, source, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; source?: ClientSource | null; onSaved?: (s: ClientSource) => void;
}) {
  const c = useSourceCopy();
  const { toast } = useToast();
  const save = useSaveSource();
  const [f, setF] = useState({ name: "", source_type: "other", description: "", is_active: true });
  useEffect(() => {
    if (open) setF({ name: source?.name ?? "", source_type: source?.source_type ?? "other", description: source?.description ?? "", is_active: source?.is_active ?? true });
  }, [open, source]);

  const submit = async () => {
    if (!f.name.trim()) return;
    try {
      const s = await save.mutateAsync({ ...f, id: source?.id });
      onSaved?.(s);
      onOpenChange(false);
    } catch (e) {
      toast({ title: describeError(e), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{source ? c("edit") : c("add")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>{c("name")} *</Label>
            <Input value={f.name} maxLength={120} placeholder="Instagram" onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>{c("type")}</Label>
            <Select value={f.source_type} onValueChange={(v) => setF({ ...f, source_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{c(`t_${t}` as any)}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-2"><Label>{c("description")}</Label>
            <Textarea value={f.description} maxLength={1000} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="flex items-start gap-3">
            <Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />
            <div><p className="text-sm font-medium">{f.is_active ? c("active") : c("inactive")}</p>
              <p className="text-xs text-muted-foreground">{c("inactiveHint")}</p></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{c("cancel")}</Button>
          <Button onClick={submit} disabled={!f.name.trim() || save.isPending}>{c("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CampaignDialog({ open, onOpenChange, campaign, sourceId, sources }: {
  open: boolean; onOpenChange: (o: boolean) => void; campaign?: Campaign | null; sourceId?: string; sources: ClientSource[];
}) {
  const c = useSourceCopy();
  const { toast } = useToast();
  const save = useSaveCampaign();
  const [f, setF] = useState({ name: "", source_id: "", start_date: "", end_date: "", status: "active", notes: "" });
  useEffect(() => {
    if (open) setF({
      name: campaign?.name ?? "", source_id: campaign?.source_id ?? sourceId ?? sources[0]?.id ?? "",
      start_date: campaign?.start_date ?? "", end_date: campaign?.end_date ?? "", status: campaign?.status ?? "active", notes: campaign?.notes ?? "",
    });
  }, [open, campaign, sourceId, sources]);

  const submit = async () => {
    if (!f.name.trim() || !f.source_id) return;
    try {
      await save.mutateAsync({ ...f, id: campaign?.id });
      onOpenChange(false);
    } catch (e) {
      toast({ title: describeError(e), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{campaign ? campaign.name : c("addCampaign")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>{c("campaignName")} *</Label>
            <Input value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>{c("source")} *</Label>
            <Select value={f.source_id} onValueChange={(v) => setF({ ...f, source_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{c("startDate")}</Label><Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>{c("endDate")}</Label><Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>{c("status")}</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(["planned", "active", "finished"] as const).map((s) => <SelectItem key={s} value={s}>{c(`st_${s}`)}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-2"><Label>{c("notes")}</Label>
            <Textarea value={f.notes} maxLength={1000} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{c("cancel")}</Button>
          <Button onClick={submit} disabled={!f.name.trim() || !f.source_id || save.isPending}>{c("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
