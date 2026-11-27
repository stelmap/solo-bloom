import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowDown, ArrowUp, Eye, FileText, ImagePlus, Plus, Trash2, Wallet, X, Loader2 } from "lucide-react";
import { GroupPublicationCard } from "@/components/groups/GroupExtras";
import { groupFormConfigText } from "@/i18n/groupFormConfigText";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { groupFormText } from "@/i18n/groupFormText";
import { groupSignupUrl, groupsText } from "@/i18n/groupsExtra";
import { useUpdateGroup } from "@/hooks/useGroups";
import { describeError } from "@/lib/errorMessages";
import { FIELD_TYPES, moveOption, cleanForm, groupFinance, moveField, normalizeForm, removeField, validateForm, type FieldType, type FormField, type RegistrationForm } from "@/lib/groupForm";
import { format } from "date-fns";
import { RichTextEditor } from "@/components/RichTextEditor";
import { groupDescriptionHtml } from "@/lib/groupDescription";
import { groupCorrectionsText } from "@/i18n/groupCorrectionsText";
import PublicGroupSignupPage from "@/pages/PublicGroupSignupPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGroupSessions, useGroupMembers } from "@/hooks/useGroups";
import { useProfile } from "@/hooks/useData";
import { practiceClock } from "@/lib/calendarClock";
import { splitMeetings } from "@/lib/groupMeetings";

export const GROUP_IMAGE_BUCKET = "group-form-images";

export function useGroupImageUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["group-form-image", path],
    queryFn: async () => {
      if (!path) return null;
      const { data } = await supabase.storage.from(GROUP_IMAGE_BUCKET).createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
    enabled: !!path, staleTime: 30 * 60 * 1000,
  });
}

const newId = () => `f_${Math.random().toString(36).slice(2, 10)}`;

export function GroupFormEditorCard({ group }: { group: any }) {
  const { lang } = useLanguage();
  const t = groupFormText(lang);
  const { toast } = useToast();
  const { user } = useAuth();
  const update = useUpdateGroup();
  const qc = useQueryClient();
  const gx = groupsText(lang);
  const initial = useMemo(() => normalizeForm(group.registration_form ?? { fields: [
    { id: "phone", label: t.presets.phone, type: "short", required: false },
    { id: "message", label: gx.note, type: "long", required: false },
  ] }, { name: t.name, email: t.email }), [JSON.stringify(group.registration_form ?? null), t, gx.note]);
  const c = groupFormConfigText(lang);
  const correction = groupCorrectionsText(lang);
  const [previewInfo, setPreviewInfo] = useState<any>(undefined);
  const [previewPrompt, setPreviewPrompt] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const { data: sessions = [] } = useGroupSessions(group.id);
  const { data: members = [] } = useGroupMembers(group.id);
  const { data: profile } = useProfile();
  const [saveError, setSaveError] = useState(false);
  const [form, setForm] = useState<RegistrationForm>(initial);
  const [showErrors, setShowErrors] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: imageUrl } = useGroupImageUrl(group.registration_image_path);
  useEffect(() => setForm(initial), [initial]);

  const errors = validateForm(form);
  const errFor = (id: string) => (showErrors ? errors.find((e) => e.id === id) : undefined);
  const setField = (id: string, patch: Partial<FormField>) => setForm((f) => ({ ...f, fields: f.fields.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const add = (label: string, type: FieldType = "short") => setForm((f) => ({ ...f, fields: [...f.fields, { id: newId(), label, type, required: false }] }));

  const save = async () => {
    if (errors.length) { setShowErrors(true); toast({ title: t.errSave, variant: "destructive" }); return false; }
    try {
      await update.mutateAsync({ id: group.id, registration_form: cleanForm({ ...form, intro: groupDescriptionHtml(form.intro) }) } as any);
      setShowErrors(false); setSaveError(false);
      toast({ title: t.saved });
      return true;
    } catch (e: any) { setSaveError(true); toast({ title: c.saveFailed, description: describeError(e.message), variant: "destructive" }); return false; }
  };

  const openSavedPreview = async () => {
    if (!user || group.user_id !== user.id) return;
    setPreviewLoading(true);
    try {
      const { data: saved, error } = await supabase.from("groups").select("*").eq("id", group.id).eq("user_id", user.id).single();
      if (error) throw error;
      const { upcoming } = splitMeetings(sessions, practiceClock(profile?.timezone).wallClockMs);
      setPreviewInfo({ name: saved.name, description: saved.description, group_type: saved.group_type, form: saved.registration_form ?? initial, image_path: saved.registration_image_path, is_full: saved.capacity != null && members.length >= saved.capacity, sessions: upcoming.map(s => ({ starts_at: s.appointments?.scheduled_at })) });
      setPreviewPrompt(false);
    } catch (e: any) { toast({ title: describeError(e.message), variant: "destructive" }); }
    finally { setPreviewLoading(false); }
  };

  const onFile = async (file?: File) => {
    if (!file || !user) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) { toast({ title: t.imageErr, description: t.imageHint, variant: "destructive" }); return; }
    setUploading(true);
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${user.id}/${group.id}/${Date.now()}.${ext}`;
    try {
      const { error } = await supabase.storage.from(GROUP_IMAGE_BUCKET).upload(path, file, { contentType: file.type });
      if (error) throw error;
      const old = group.registration_image_path;
      await update.mutateAsync({ id: group.id, registration_image_path: path } as any);
      if (old) await supabase.storage.from(GROUP_IMAGE_BUCKET).remove([old]);
      qc.invalidateQueries({ queryKey: ["group-form-image"] });
    } catch {
      toast({ title: t.imageErr, variant: "destructive" });
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const removeImage = async () => {
    const old = group.registration_image_path;
    try {
      await update.mutateAsync({ id: group.id, registration_image_path: null } as any);
      if (old) await supabase.storage.from(GROUP_IMAGE_BUCKET).remove([old]);
    } catch (e: any) { toast({ title: describeError(e.message), variant: "destructive" }); }
  };

  const custom = form.fields.length - 2;
  const dirty = JSON.stringify(cleanForm(form)) !== JSON.stringify(cleanForm(initial));
  const setOpts = (id: string, fn: (o: string[]) => string[]) => setForm((x) => ({ ...x, fields: x.fields.map((f) => (f.id === id ? { ...f, options: fn(f.options ?? []) } : f)) }));
  return (
    <div className="space-y-6">
      <GroupPublicationCard group={group} actions={<>
        <Button size="sm" variant="outline" disabled={previewLoading || update.isPending} onClick={() => dirty ? setPreviewPrompt(true) : openSavedPreview()}>
          <Eye className="h-4 w-4 mr-1" />{t.preview}
        </Button>
        <Button size="sm" onClick={save} disabled={update.isPending || !dirty}>
          {update.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />{c.saving}</> : t.save}
        </Button>
      </>} />
      {(dirty || saveError) && (
        <p className={`text-sm ${saveError ? "text-destructive" : "text-muted-foreground"}`} role="status">{saveError ? c.saveFailed : c.unsaved}</p>
      )}

    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">{c.intro}</h2></div>
      <div className="space-y-1.5">
        <Label htmlFor="gf-title">{c.formHeading}</Label>
        <Input id="gf-title" maxLength={200} placeholder={c.formHeadingPh} value={form.title ?? ""} onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="gf-intro">{c.formIntro}</Label>
        <RichTextEditor value={groupDescriptionHtml(form.intro)} allowLinks extendedToolbar placeholder={c.formIntroPh} onChange={(intro) => setForm((x) => ({ ...x, intro }))} />
      </div>
      <div className="space-y-2">
        <Label>{t.image}</Label>
        {imageUrl && <img src={imageUrl} alt="" className="h-28 w-auto max-w-full object-cover rounded-lg border border-border" />}
        <div className="flex gap-2 items-center flex-wrap">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <ImagePlus className="h-4 w-4 mr-1" />{group.registration_image_path ? t.replace : t.upload}
          </Button>
          {group.registration_image_path && <Button size="sm" variant="ghost" className="text-destructive" onClick={removeImage}>{t.remove}</Button>}
          <span className="text-xs text-muted-foreground">{t.imageHint}</span>
        </div>
      </div>

    </div>

    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <h2 className="text-lg font-semibold">{c.fields}</h2>
      <div className="space-y-2">
        {form.fields.map((f, i) => {
          const err = errFor(f.id);
          return (
            <div key={f.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
              <div className="flex gap-2 items-start">
                <span className="mt-2 w-6 text-sm text-muted-foreground tabular-nums">{i + 1}.</span>
                <div className="flex-1 space-y-1">
                  <Input aria-label={t.label} value={f.label} maxLength={200} onChange={(e) => setField(f.id, { label: e.target.value })} aria-invalid={err?.code === "label"} />
                  {err?.code === "label" && <p className="text-xs text-destructive">{t.errLabel}</p>}
                </div>
                {f.system ? <Badge variant="secondary" className="mt-2">{t.system}</Badge> : (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" aria-label={c.moveUp} disabled={i <= 2} onClick={() => setForm((x) => moveField(x, f.id, -1))}><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label={c.moveDown} disabled={i === form.fields.length - 1} onClick={() => setForm((x) => moveField(x, f.id, 1))}><ArrowDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label={t.remove} className="text-destructive" onClick={() => setForm((x) => removeField(x, f.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
              {!f.system && (
                <>
                  <div className="grid sm:grid-cols-3 gap-2 items-center">
                    <Select value={f.type} onValueChange={(v) => setField(f.id, { type: v as FieldType })}>
                      <SelectTrigger aria-label={t.type}><SelectValue /></SelectTrigger>
                      <SelectContent>{FIELD_TYPES.map((k) => <SelectItem key={k} value={k}>{k === "email" || k === "phone" || k === "url" ? c[k] : t[k]}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input placeholder={t.hint} maxLength={300} value={f.hint ?? ""} onChange={(e) => setField(f.id, { hint: e.target.value })} />
                    <label className="flex items-center gap-2 text-sm"><Switch checked={f.required} onCheckedChange={(v) => setField(f.id, { required: v })} />{t.required}</label>
                  </div>
                  {f.type === "dropdown" && (
                    <div className="space-y-1">
                      {(f.options ?? []).map((o, oi, arr) => (
                        <div key={oi} className="flex gap-1 items-center">
                          <Input aria-label={`${c.option} ${oi + 1}`} maxLength={200} value={o} onChange={(e) => setOpts(f.id, (l) => l.map((v, k) => (k === oi ? e.target.value : v)))} />
                          <Button size="icon" variant="ghost" aria-label={c.moveUp} disabled={oi === 0} onClick={() => setOpts(f.id, (l) => moveOption(l, oi, -1))}><ArrowUp className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label={c.moveDown} disabled={oi === arr.length - 1} onClick={() => setOpts(f.id, (l) => moveOption(l, oi, 1))}><ArrowDown className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label={t.remove} onClick={() => setOpts(f.id, (l) => l.filter((_, k) => k !== oi))}><X className="h-4 w-4" /></Button>
                        </div>
                      ))}
                      <Button size="sm" variant="ghost" disabled={(f.options ?? []).length >= 50} onClick={() => setOpts(f.id, (l) => [...l, ""])}><Plus className="h-4 w-4 mr-1" />{c.addOption}</Button>
                      {err?.code === "options" && <p className="text-xs text-destructive">{t.errOptions}</p>}
                      {err?.code === "duplicateOption" && <p className="text-xs text-destructive">{t.errDup}</p>}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button size="sm" variant="outline" disabled={custom >= 25}><Plus className="h-4 w-4 mr-1" />{t.addField}</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {Object.values(t.presets).map((p) => <DropdownMenuItem key={p} onClick={() => add(p)}>{p}</DropdownMenuItem>)}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => add(t.custom)}>{t.custom}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="text-xs text-muted-foreground">{c.historyNote}</p>
    </div>
    <Dialog open={previewPrompt} onOpenChange={setPreviewPrompt}>
      <DialogContent><DialogHeader><DialogTitle>{t.preview}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{correction.savedPreview}</p><div className="flex flex-wrap gap-2"><Button disabled={update.isPending || previewLoading} onClick={async () => { if (await save()) await openSavedPreview(); }}>{correction.savePreview}</Button><Button variant="outline" disabled={previewLoading} onClick={openSavedPreview}>{correction.continuePreview}</Button></div></DialogContent>
    </Dialog>
    {user && group.user_id === user.id && <Dialog open={previewInfo !== undefined} onOpenChange={o => { if (!o) setPreviewInfo(undefined); }}>
      <DialogContent className="max-w-3xl max-h-[92dvh] overflow-y-auto p-0"><DialogHeader className="sr-only"><DialogTitle>{correction.previewMode}</DialogTitle></DialogHeader><PublicGroupSignupPage previewInfo={previewInfo} onReturn={() => setPreviewInfo(undefined)} /></DialogContent>
    </Dialog>}
    </div>
  );
}

export function useGroupPayments(groupId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["group-session-payments-all", groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from("group_session_payments" as any)
        .select("client_id, amount, payment_state, billing_rule_applied, clients(name), expected_payments(status), group_sessions(appointments!group_sessions_appointment_id_fkey(scheduled_at, status))")
        .eq("group_id", groupId!);
      if (error) throw error;
      return (data as any[]).map((r) => ({
        client_id: r.client_id, client_name: r.clients?.name ?? "—", amount: Number(r.amount) || 0,
        payment_state: r.payment_state ?? "", billing_rule_applied: r.billing_rule_applied,
        expected_status: r.expected_payments?.status ?? null,
        appointment_status: r.group_sessions?.appointments?.status ?? null,
        scheduled_at: r.group_sessions?.appointments?.scheduled_at ?? null,
      }));
    },
    enabled: !!user && !!groupId,
  });
}

export function GroupFinanceCard({ groupId, applications, confirmedPeople }: { groupId: string; applications: number; confirmedPeople: number }) {
  const { lang } = useLanguage();
  const t = groupFormText(lang);
  const { symbol } = useCurrency();
  const { data: rows = [], error } = useGroupPayments(groupId);
  const fin = useMemo(() => groupFinance(rows), [rows]);
  const money = (n: number) => `${symbol}${n.toFixed(2)}`;
  const tile = (v: string, l: string) => <div className="text-center p-3 bg-muted/30 rounded-lg"><p className="text-xl font-bold text-foreground">{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>;
  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">{t.finance}</h2></div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {tile(String(applications), t.applications)}
        {tile(String(confirmedPeople), t.uniquePeople)}
        {tile(money(fin.charged), t.charged)}
        {tile(money(fin.received), t.received)}
        {tile(money(fin.outstanding), t.outstanding)}
      </div>
      {error && <p className="text-sm text-destructive">{describeError((error as any).message)}</p>}
      <div>
        <p className="text-sm font-medium mb-2">{t.whoOwes}</p>
        {fin.debtors.length === 0 ? <p className="text-sm text-muted-foreground">{t.noDebt}</p> : (
          <ul className="space-y-1.5">
            {fin.debtors.map((d) => (
              <li key={d.client_id} className="flex justify-between gap-3 text-sm p-2 rounded-lg bg-muted/30">
                <span><span className="font-medium">{d.name}</span> <span className="text-xs text-muted-foreground">{d.dates.map((x) => format(new Date(x), "dd.MM")).join(", ")}</span></span>
                <span className="font-semibold text-destructive">{money(d.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t.financeNote}</p>
    </div>
  );
}
