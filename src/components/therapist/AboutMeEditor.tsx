import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, FileText, ImageIcon, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { describeError } from "@/lib/errorMessages";
import {
  MAX_FILE_BYTES, THERAPIST_FILES_BUCKET, TP_COPY, cropSquare, detectFileKind, emptyProfile, normalizeProfile, toPublished,
  type TPLang, type TherapistProfileData, profileSlugBase,
} from "@/lib/therapistProfile";
import { PublicProfileLinkCard } from "./PublicProfileLinkCard";
import { Link } from "react-router-dom";
import { usePracticeAccess } from "@/hooks/usePracticeAccess";
import { ABOUT_PROFILE_TRIAL_END, aboutProfileAccess } from "@/lib/planFeatures";
import { TherapistProfileView, useSignedUrls } from "./TherapistProfileView";

export function AboutMeEditor({ lang, bookingActive }: { lang: TPLang; bookingActive: boolean }) {
  const C = TP_COPY[lang];
  const { user } = useAuth();
  const { data: access } = usePracticeAccess();
  const gate = aboutProfileAccess(access as any);
  const trialEnd = new Date(ABOUT_PROFILE_TRIAL_END.getTime() - 1).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" });
  const { toast } = useToast();
  const qc = useQueryClient();
  const [p, setP] = useState<TherapistProfileData>(emptyProfile());
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [tag, setTag] = useState("");
  const [crop, setCrop] = useState<{ file: File; url: string; zoom: number; x: number; y: number } | null>(null);
  const replaceIdx = useRef<number | null>(null);
  const docInput = useRef<HTMLInputElement>(null);

  const q = useQuery({
    queryKey: ["therapist-profile", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("therapist_public_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (q.data !== undefined && !dirty) setP(q.data ? normalizeProfile(q.data.draft) : emptyProfile()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q.data]);

  const urls = useSignedUrls([p.photo, ...p.documents.map((d) => d.path)].filter(Boolean) as string[]);
  const set = (patch: Partial<TherapistProfileData>) => { setP((x) => ({ ...x, ...patch })); setDirty(true); };
  const err = (e: unknown) => toast({ title: "Error", description: describeError(e as any, "errors.crud.saveFailed"), variant: "destructive" });

  const upload = async (blob: Blob, ext: string, type: string) => {
    const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(THERAPIST_FILES_BUCKET).upload(path, blob, { contentType: type });
    if (error) throw error;
    return path;
  };

  const save = async (forced?: "draft" | "publish" | "unpublish") => {
    if (!user) return;
    const mode = forced ?? (q.data?.is_published && gate.allowed ? "publish" : "draft");
    if (mode === "publish" && !p.first_name.trim()) { toast({ title: C.nameRequired, variant: "destructive" }); return; }
    setBusy(mode);
    try {
      const row: Record<string, unknown> = { user_id: user.id, draft: p as any };
      if (mode === "publish") {
        const { data, files } = toPublished(p, user.id);
        Object.assign(row, { published: data as any, published_files: files, is_published: true, published_at: new Date().toISOString() });
      }
      if (mode === "unpublish") row.is_published = false;
      const { error } = await supabase.from("therapist_public_profiles").upsert(row as any, { onConflict: "user_id" });
      if (error) throw error;
      if (mode === "publish") await supabase.rpc("ensure_my_therapist_profile_slug", { p_base: profileSlugBase(p) });
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ["therapist-profile", user.id] });
      toast({ title: mode === "publish" ? C.publishedOk : mode === "unpublish" ? C.unpublishedOk : C.saved });
      if (mode === "publish" && !bookingActive) toast({ title: C.needLink });
    } catch (e) { err(e); } finally { setBusy(null); }
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const kind = await detectFileKind(f);
    if (f.size > MAX_FILE_BYTES || (kind !== "png" && kind !== "jpeg")) { toast({ title: C.badFile, variant: "destructive" }); return; }
    setCrop({ file: f, url: URL.createObjectURL(f), zoom: 1, x: 0, y: 0 });
  };
  const applyCrop = async () => {
    if (!crop) return;
    setBusy("photo");
    try {
      const blob = await cropSquare(crop.file, crop.zoom, crop.x, crop.y);
      const path = await upload(blob, "jpg", "image/jpeg");
      set({ photo: path });
      URL.revokeObjectURL(crop.url); setCrop(null);
    } catch (e) { err(e); } finally { setBusy(null); }
  };

  const onDocs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []); e.target.value = "";
    const at = replaceIdx.current; replaceIdx.current = null;
    setBusy("docs");
    try {
      const added: TherapistProfileData["documents"] = [];
      for (const f of files) {
        const kind = await detectFileKind(f);
        if (!kind || f.size > MAX_FILE_BYTES) { toast({ title: C.badFile, description: f.name, variant: "destructive" }); continue; }
        const ext = kind === "jpeg" ? "jpg" : kind;
        const path = await upload(f, ext, kind === "pdf" ? "application/pdf" : `image/${kind}`);
        added.push({ path, caption: f.name.replace(/\.[^.]+$/, "").slice(0, 150), kind: kind === "pdf" ? "pdf" : "image" });
      }
      if (!added.length) return;
      setP((x) => {
        const docs = [...x.documents];
        if (at !== null) docs[at] = { ...added[0], caption: docs[at]?.caption || added[0].caption };
        else docs.push(...added);
        return { ...x, documents: docs.slice(0, 30) };
      });
      setDirty(true);
    } catch (e2) { err(e2); } finally { setBusy(null); }
  };
  const move = (i: number, d: -1 | 1) => { const docs = [...p.documents]; const j = i + d; if (j < 0 || j >= docs.length) return; [docs[i], docs[j]] = [docs[j], docs[i]]; set({ documents: docs }); };
  const addTag = () => { const v = tag.trim(); if (v && !p.expertise.includes(v)) set({ expertise: [...p.expertise, v].slice(0, 30) }); setTag(""); };

  if (q.isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  const isPub = !!q.data?.is_published;
  const changed = isPub && (dirty || JSON.stringify(normalizeProfile(q.data?.draft)) !== JSON.stringify(normalizeProfile(q.data?.published)));
  const field = (k: keyof TherapistProfileData, label: string, ph?: string, type = "text") => (
    <div className="space-y-1.5"><Label className="text-sm font-semibold">{label}</Label>
      <Input type={type} value={p[k] as string} placeholder={ph} onChange={(e) => set({ [k]: e.target.value } as any)} className="h-10" /></div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{C.about}</h2>
          <Badge className={isPub ? "border-transparent bg-success text-success-foreground hover:bg-success" : "border-transparent bg-muted text-muted-foreground hover:bg-muted"}>{isPub ? C.published : C.notPublished}</Badge>
          {changed && <Badge variant="outline">{C.unpublishedChanges}</Badge>}
          {gate.trial && <Badge variant="outline" className="border-primary text-primary">{C.trialUntil.replace("{d}", trialEnd)}</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" className="h-9" onClick={() => setPreview(true)}><Eye className="mr-2 h-4 w-4" />{C.preview}</Button>
          {isPub ? (
            <Button variant="outline" size="sm" className="h-9" disabled={!!busy} onClick={() => { if (window.confirm(`${C.unpublish}?`)) void save("unpublish"); }}>{busy === "unpublish" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{C.unpublish}</Button>
          ) : (
            <Button size="sm" className="h-9" disabled={!!busy || !gate.allowed} onClick={() => void save("publish")}>{busy === "publish" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{C.publish}</Button>
          )}
          <Button variant={isPub ? "default" : "outline"} size="sm" className="h-9" disabled={!!busy} onClick={() => void save(isPub && gate.allowed ? "publish" : "draft")}>{busy === "draft" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{C.saveChanges}</Button>
        </div>
      </div>
      {!gate.allowed && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
          <span>{C.proOnly}</span>
          <Button asChild size="sm"><Link to="/plans">{C.upgrade}</Link></Button>
        </div>
      )}
      <PublicProfileLinkCard lang={lang} slug={q.data?.slug ?? null} published={isPub && gate.allowed && bookingActive} />
      {!bookingActive && <p className="text-xs text-muted-foreground">{C.needLink}</p>}

      <div className="space-y-6 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{C.photo}</Label>
            <label className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-full border border-dashed border-border bg-muted/40 text-center">
              {busy === "photo" ? <Loader2 className="h-6 w-6 animate-spin" /> : p.photo && urls[p.photo] ? <img src={urls[p.photo]} alt="" className="h-full w-full object-cover" /> : <><ImageIcon className="h-5 w-5 text-muted-foreground" /><span className="px-2 text-xs">{C.uploadPhoto}</span></>}
              <input type="file" accept="image/png,image/jpeg" className="hidden" aria-label={p.photo ? C.replacePhoto : C.uploadPhoto} onChange={onPhoto} />
            </label>
            {p.photo && <Button variant="ghost" size="sm" className="w-32" onClick={() => set({ photo: null })}>{C.removePhoto}</Button>}
          </div>
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            {field("first_name", `${C.firstName} *`)}{field("last_name", C.lastName)}
            {field("patronymic", C.patronymic)}{field("title", C.proTitle, C.proTitlePh)}
          </div>
        </div>

        <div className="space-y-3"><h3 className="text-sm font-semibold">{C.location}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{field("city", C.city)}{field("address", C.address)}</div>
          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2"><Checkbox checked={p.online} onCheckedChange={(v) => set({ online: !!v })} />{C.online}</label>
            <label className="flex items-center gap-2"><Checkbox checked={p.offline} onCheckedChange={(v) => set({ offline: !!v })} />{C.offline}</label>
          </div>
        </div>

        <div className="space-y-3"><h3 className="text-sm font-semibold">{C.contacts}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{field("email", C.email, "name@example.com", "email")}{field("phone", C.phone, "+380 …")}</div>
          <Label className="text-sm font-semibold">{C.socials}</Label>
          {p.socials.map((s, i) => (
            <div key={i} className="flex gap-2">
              <Input className="w-44" placeholder={C.socialLabel} value={s.label} onChange={(e) => set({ socials: p.socials.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <Input placeholder="https://" value={s.url} onChange={(e) => set({ socials: p.socials.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
              <Button variant="ghost" size="icon" aria-label={C.delete} onClick={() => set({ socials: p.socials.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
            </div>
          ))}
          {p.socials.length < 10 && <Button variant="outline" size="sm" onClick={() => set({ socials: [...p.socials, { label: "", url: "" }] })}><Plus className="mr-1 h-4 w-4" />{C.addLink}</Button>}
        </div>

        <div className="space-y-2"><h3 className="text-sm font-semibold">{C.about}</h3>
          <RichTextEditor allowLinks value={p.about_html} onChange={(h) => set({ about_html: h })} placeholder={C.aboutPh} minHeight="10rem" /></div>
        <div className="space-y-2"><h3 className="text-sm font-semibold">{C.education}</h3>
          <RichTextEditor allowLinks value={p.education_html} onChange={(h) => set({ education_html: h })} minHeight="8rem" /></div>

        <div className="space-y-2"><h3 className="text-sm font-semibold">{C.expertise}</h3>
          <div className="flex flex-wrap gap-2">{p.expertise.map((x) => (
            <Badge key={x} variant="secondary" className="gap-1 text-sm">{x}<button type="button" aria-label={`${C.delete} ${x}`} onClick={() => set({ expertise: p.expertise.filter((y) => y !== x) })}><X className="h-3 w-3" /></button></Badge>
          ))}</div>
          <div className="flex gap-2"><Input value={tag} placeholder={C.expertisePh} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} className="max-w-sm" />
            <Button variant="outline" onClick={addTag}>{C.add}</Button></div>
        </div>

        <div className="space-y-2"><h3 className="text-sm font-semibold">{C.documents}</h3>
          {p.documents.map((d, i) => (
            <div key={d.path} className="flex items-center gap-2 rounded-lg border border-border p-2">
              <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                {d.kind === "image" && urls[d.path] ? <img src={urls[d.path]} alt="" className="h-full w-full object-cover" /> : <FileText className="h-5 w-5 text-muted-foreground" />}
              </div>
              <Input value={d.caption} placeholder={C.caption} onChange={(e) => set({ documents: p.documents.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)) })} />
              <Button variant="ghost" size="icon" aria-label={C.up} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" aria-label={C.down} disabled={i === p.documents.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => { replaceIdx.current = i; docInput.current?.click(); }}>{C.replace}</Button>
              <Button variant="ghost" size="icon" aria-label={C.delete} onClick={() => set({ documents: p.documents.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" disabled={busy === "docs"} onClick={() => { replaceIdx.current = null; docInput.current?.click(); }}>
            {busy === "docs" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{C.addDocs}
          </Button>
          <p className="text-xs text-muted-foreground">{C.docsHint}</p>
          <input ref={docInput} type="file" multiple accept="application/pdf,image/png,image/jpeg" className="hidden" aria-label={C.addDocs} onChange={onDocs} />
        </div>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>{C.previewTitle}</DialogTitle></DialogHeader>
          <TherapistProfileView profile={normalizeProfile(p)} lang={lang} onBook={() => setPreview(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!crop} onOpenChange={(o) => { if (!o && crop) { URL.revokeObjectURL(crop.url); setCrop(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{C.cropTitle}</DialogTitle></DialogHeader>
          {crop && (
            <div className="space-y-4">
              <div className="mx-auto h-56 w-56 overflow-hidden rounded-full border border-border">
                <img src={crop.url} alt="" className="h-full w-full object-cover" style={{ transform: `scale(${crop.zoom})`, objectPosition: `${50 + crop.x * 50}% ${50 + crop.y * 50}%` }} />
              </div>
              <div className="space-y-1"><Label>{C.zoom}</Label><Slider min={1} max={3} step={0.05} value={[crop.zoom]} onValueChange={([v]) => setCrop({ ...crop, zoom: v })} /></div>
              <div className="space-y-1"><Label>{C.horizontal}</Label><Slider min={-1} max={1} step={0.05} value={[crop.x]} onValueChange={([v]) => setCrop({ ...crop, x: v })} /></div>
              <div className="space-y-1"><Label>{C.vertical}</Label><Slider min={-1} max={1} step={0.05} value={[crop.y]} onValueChange={([v]) => setCrop({ ...crop, y: v })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { if (crop) URL.revokeObjectURL(crop.url); setCrop(null); }}>{C.cancel}</Button>
            <Button onClick={() => void applyCrop()} disabled={busy === "photo"}>{C.apply}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
