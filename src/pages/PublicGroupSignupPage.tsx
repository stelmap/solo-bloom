import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Lock, Loader2, AlertCircle } from "lucide-react";
import { groupSignupText } from "@/i18n/groupSignupText";
import { validateSignup, parseServerError, type AnswerError } from "@/lib/groupSignupValidation";
import { useLanguage } from "@/i18n/LanguageContext";
import { groupsText } from "@/i18n/groupsExtra";
import { BrandName } from "@/components/BrandName";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { groupFormText } from "@/i18n/groupFormText";
import { normalizeForm } from "@/lib/groupForm";
import { groupDescriptionHtml } from "@/lib/groupDescription";
import { richTextContentClass } from "@/components/RichTextEditor";
import { groupCorrectionsText } from "@/i18n/groupCorrectionsText";

const LANGS = ["uk", "en", "pl", "de", "fr", "ru"];

export default function PublicGroupSignupPage({ previewInfo, onReturn }: { previewInfo?: any; onReturn?: () => void } = {}) {
  const preview = previewInfo !== undefined;
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const { lang: appLang } = useLanguage();
  const urlLang = params.get("lang");
  const lang = urlLang && LANGS.includes(urlLang) ? urlLang : appLang;
  const g = groupsText(lang);
  const [info, setInfo] = useState<any>(previewInfo);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fieldErrs, setFieldErrs] = useState<Record<string, AnswerError | "server">>({});
  const st = groupSignupText(lang);
  const tf = groupFormText(lang);
  const correction = groupCorrectionsText(lang);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const custom = info?.form ? normalizeForm(info.form, { name: g.yourName, email: g.email }) : null;
  useEffect(() => {
    if (!info?.image_path) { setImageUrl(null); return; }
    supabase.storage.from("group-form-images").createSignedUrl(info.image_path, 3600).then(({ data }) => setImageUrl(data?.signedUrl ?? null));
  }, [info?.image_path]);

  useEffect(() => {
    if (preview) { setInfo(previewInfo); return; }
    supabase.rpc("public_get_group_registration" as any, { _token: token }).then(({ data }) => { setInfo(data ?? null); if (data) window.__lovableEvents?.track?.("project.group_signup_page_viewed", {}); });
  }, [token, preview, previewInfo]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview) return;
    if (busy) return;
    setError(null);
    if (custom) {
      const errs = validateSignup(custom.fields, form.name, form.email, answers);
      setFieldErrs(errs);
      if (Object.keys(errs).length) { setError(st.fix); return; }
    }
    setBusy(true);
    const { data, error } = custom
      ? await supabase.rpc("public_submit_group_registration_v2" as any, { _token: token, _name: form.name, _email: form.email, _answers: answers })
      : await supabase.rpc("public_submit_group_registration" as any, {
        _token: token, _name: form.name, _email: form.email, _phone: form.phone, _message: form.message,
      });
    setBusy(false);
    if (error) {
      const pe = parseServerError(error.message);
      if (pe.kind === "NOT_AVAILABLE") { setError(g.unavailable); return; }
      if (pe.kind === "RATE_LIMIT") { setError(st.rate); return; }
      if (pe.field) { setFieldErrs({ [pe.field]: pe.kind === "REQUIRED_MISSING" ? "required" : pe.kind === "INVALID_OPTION" ? "option" : pe.kind === "INVALID_EMAIL" ? "email" : "server" }); setError(st.fix); return; }
      setError(st.failed); return;
    }
    const res = (data as any)?.status ?? "pending";
    window.__lovableEvents?.track?.("project.group_application_submitted", { status: res });
    if (res === "waitlisted") window.__lovableEvents?.track?.("project.group_application_waitlisted", { source: "auto_full" });
    setResult(res);
  };

  const errText = (k: AnswerError | "server", type?: string) => k === "server" ? (type === "phone" ? st.phone : type === "url" ? st.url : type === "email" ? st.email : st.fix) : st[k];
  const req = (r: boolean) => r ? <span className="text-primary"> *</span> : <span className="font-normal text-muted-foreground"> ({st.optional})</span>;

  return (
    <div className={`${preview ? "" : "min-h-screen"} bg-muted/30 flex items-start justify-center px-4 py-6 sm:py-10`}>
      <Helmet><title>{info?.name ? `${info.name} — Solo .Bizz` : "Solo .Bizz"}</title><meta name="robots" content="noindex" /></Helmet>
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <header className="px-6 py-4 border-b border-border text-lg font-semibold"><BrandName />{preview && <div className="flex flex-wrap items-center justify-between gap-2 mt-3"><span className="text-sm text-primary">{correction.previewMode}</span><Button size="sm" variant="outline" onClick={onReturn}>{correction.backToForm}</Button></div>}</header>
        <div className="p-6 space-y-5">
        {info === undefined ? (
          <p className="flex items-center justify-center gap-2 text-muted-foreground py-10" role="status"><Loader2 className="h-4 w-4 animate-spin" />{st.loading}</p>
        ) : info === null ? (
          <div className="text-center text-muted-foreground py-10 space-y-2"><AlertCircle className="h-8 w-8 mx-auto" /><p>{g.unavailable}</p></div>
        ) : (<>
            {imageUrl && <img src={imageUrl} alt="" className="w-full max-h-60 object-cover rounded-xl" />}
            {result ? (
              <div className="text-center space-y-2 py-6" role="status">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                <p className="text-lg font-semibold">{result === "duplicate" ? g.doneTitle : st.receivedTitle}</p>
                <p className="text-sm text-muted-foreground">{result === "waitlisted" ? g.doneWait : result === "duplicate" ? g.doneDup : g.donePending}</p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate={!!custom} className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">{custom?.title || g.applyTitle}</h2>
                  {custom?.intro && <div className={`${richTextContentClass} [overflow-wrap:anywhere]`} dangerouslySetInnerHTML={{ __html: groupDescriptionHtml(custom.intro) }} />}
                </div>
                {info.is_full && <p className="text-sm text-warning">{g.full}</p>}
                {custom ? custom.fields.map(fd => {
                  const id = `fld-${fd.id}`;
                  const fe = fieldErrs[fd.id];
                  const lbl = <Label htmlFor={id}>{fd.label}{req(fd.required)}</Label>;
                  const hint = fd.hint ? <p className="text-xs text-muted-foreground">{fd.hint}</p> : null;
                  const errEl = fe ? <p id={`${id}-err`} className="text-xs text-destructive">{errText(fe, fd.id === "email" ? "email" : fd.type)}</p> : null;
                  const a11y = { "aria-invalid": !!fe, "aria-describedby": fe ? `${id}-err` : undefined };
                  const clear = () => fe && setFieldErrs(x => { const n = { ...x }; delete n[fd.id]; return n; });
                  if (fd.id === "name") return <div key={fd.id} className="space-y-1.5">{lbl}<Input id={id} {...a11y} autoComplete="name" placeholder={st.namePh} maxLength={200} value={form.name} onChange={e => { clear(); setForm(f => ({ ...f, name: e.target.value })); }} />{errEl}</div>;
                  if (fd.id === "email") return <div key={fd.id} className="space-y-1.5">{lbl}<Input id={id} {...a11y} type="email" autoComplete="email" placeholder={st.emailPh} maxLength={255} value={form.email} onChange={e => { clear(); setForm(f => ({ ...f, email: e.target.value })); }} />{errEl}</div>;
                  const val = answers[fd.id] ?? "";
                  const set = (v: string) => { clear(); setAnswers(a => ({ ...a, [fd.id]: v })); };
                  if (fd.type === "checkbox") return <div key={fd.id} className="space-y-1"><label className="flex items-start gap-2 text-sm"><Checkbox id={id} {...a11y} checked={val === "true"} onCheckedChange={v => set(v ? "true" : "false")} /><span>{fd.label}{req(fd.required)}</span></label>{hint}{errEl}</div>;
                  if (fd.type === "dropdown") return <div key={fd.id} className="space-y-1.5">{lbl}<Select value={val} onValueChange={set}><SelectTrigger id={id} {...a11y}><SelectValue placeholder={tf.choose} /></SelectTrigger><SelectContent>{(fd.options ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>{hint}{errEl}</div>;
                  if (fd.type === "long") return <div key={fd.id} className="space-y-1.5">{lbl}<Textarea id={id} {...a11y} rows={3} maxLength={2000} value={val} onChange={e => set(e.target.value)} />{hint}{errEl}</div>;
                  const inputType = fd.type === "email" ? "email" : fd.type === "phone" ? "tel" : fd.type === "url" ? "url" : "text";
                  const ph = fd.type === "url" ? "https://" : fd.type === "email" ? st.emailPh : fd.type === "phone" ? "+" : undefined;
                  return <div key={fd.id} className="space-y-1.5">{lbl}<Input id={id} {...a11y} type={inputType} placeholder={ph} maxLength={fd.type === "url" ? 500 : 500} value={val} onChange={e => set(e.target.value)} />{hint}{errEl}</div>;
                }) : (<>
                <div className="space-y-1.5"><Label>{g.yourName} *</Label><Input required maxLength={200} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>{g.email} *</Label><Input required type="email" maxLength={255} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>{g.phone}</Label><Input maxLength={50} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>{g.note}</Label><Textarea rows={3} maxLength={2000} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} /></div>
                </>)}
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <Button type="submit" size="lg" className="w-full" disabled={busy || preview}>{busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{st.sending}</> : g.submit}</Button>
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5"><Lock className="h-3 w-3" />{g.privacy}</p>
              </form>
            )}
        </>)}
        </div>
        <footer className="px-6 py-3 border-t border-border text-center text-xs text-muted-foreground">{st.powered} <BrandName /></footer>
      </div>
    </div>
  );
}
