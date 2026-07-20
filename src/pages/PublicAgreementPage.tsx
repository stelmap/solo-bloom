import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { CheckCircle2, ShieldCheck, AlertTriangle, FileSignature, KeyRound, FileText } from "lucide-react";
import { SessionFormatsBlock, stripLegacySessionFormatsSection } from "@/components/SessionFormatsBlock";


type Control =
  | { id: string; type: "required_checkbox"; label: string; required: boolean }
  | { id: string; type: "optional_checkbox"; label: string; required: boolean }
  | { id: string; type: "typed_acknowledgement"; label: string; required: boolean };

type Section = { id: string; heading: string; body: string };

type AccessResponse = {
  invitation_id: string;
  instance_id: string;
  revision_id: string;
  status: string;
  already_accepted: boolean;
  accepted_at: string | null;
  client_name: string;
  therapist_name: string;
  content: {
    title: string;
    sections: Section[];
    sessionFormats?: Array<{ id: string; label: string; durationMinutes: number | ""; price: number | ""; currency: string }>;
    cycleLength?: number | "";
    frequency?: string;
  };
  controls: Control[];
};

type InvitationInfo = {
  therapist_name: string;
  business_name: string;
  therapist_avatar_url: string;
  masked_email: string;
  agreement_title: string;
  revoked: boolean;
  expired: boolean;
  already_accepted: boolean;
};

type Step = "welcome" | "otp" | "sign" | "done";

type DraftState = {
  step: Step;
  sessionToken: string;
  otpExpiresAt: string | null;
  resendReadyAt: number | null;
  answers: Record<string, boolean | string>;
  typedName: string;
  firstName: string;
  lastName: string;
  savedAt: number;
};

function interpolate(text: string, firstName: string, lastName: string): string {
  if (!text) return text;
  const fn = (firstName || "").trim();
  const ln = (lastName || "").trim();
  const full = [fn, ln].filter(Boolean).join(" ");
  return text
    .replace(/\{\{\s*client\.first_name\s*\}\}/g, fn || "_________")
    .replace(/\{\{\s*client\.last_name\s*\}\}/g, ln || "_________")
    .replace(/\{\{\s*client\.(full_name|name)\s*\}\}/g, full || "_________");
}

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const draftKey = (token?: string) => (token ? `agreement-draft:${token}` : null);

function loadDraft(token?: string): DraftState | null {
  const k = draftKey(token);
  if (!k) return null;
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const d = JSON.parse(raw) as DraftState;
    if (!d || typeof d !== "object") return null;
    if (Date.now() - (d.savedAt || 0) > DRAFT_TTL_MS) {
      localStorage.removeItem(k);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

function clearDraft(token?: string) {
  const k = draftKey(token);
  if (k) try { localStorage.removeItem(k); } catch { /* ignore */ }
}

function pad2(n: number) { return n.toString().padStart(2, "0"); }
function formatCountdown(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

export default function PublicAgreementPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useLanguage();
  const draftRef = useRef<DraftState | null>(loadDraft(token));
  const initial = draftRef.current;

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  const [step, setStep] = useState<Step>(initial?.step && initial.step !== "done" ? initial.step : "welcome");
  const [code, setCode] = useState("");
  const [sessionToken, setSessionToken] = useState(initial?.sessionToken ?? "");
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(initial?.otpExpiresAt ?? null);
  const [resendReadyAt, setResendReadyAt] = useState<number | null>(initial?.resendReadyAt ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean | string>>(initial?.answers ?? {});
  const [typedName, setTypedName] = useState(initial?.typedName ?? "");
  const [accepted, setAccepted] = useState<{ at: string; hash: string } | null>(null);
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");

  // Load invitation info (welcome data) — no OTP triggered
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) { setLoadingInfo(false); return; }
      try {
        const { data, error } = await supabase.functions.invoke("agreement-invitation-info", { body: { token } });
        if (error) throw new Error(error.message || "not_found");
        const payload = data as any;
        if (payload?.error) throw new Error(payload.error);
        if (cancelled) return;
        setInfo(payload as InvitationInfo);
      } catch (err: any) {
        if (!cancelled) setInfoError(errorLabel(err.message, t));
      } finally {
        if (!cancelled) setLoadingInfo(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Try resume verified session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = draftRef.current;
      if (!saved?.sessionToken || !token) return;
      try {
        await loadAgreement(saved.sessionToken);
      } catch {
        if (cancelled) return;
        setSessionToken("");
        setStep("welcome");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist draft
  useEffect(() => {
    const k = draftKey(token);
    if (!k) return;
    if (step === "done") return;
    const draft: DraftState = { step, sessionToken, otpExpiresAt, resendReadyAt, answers, typedName, firstName, lastName, savedAt: Date.now() };
    try { localStorage.setItem(k, JSON.stringify(draft)); } catch { /* ignore quota */ }
  }, [token, step, sessionToken, otpExpiresAt, resendReadyAt, answers, typedName, firstName, lastName]);

  // Ticker for countdowns
  useEffect(() => {
    if (step !== "otp") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step]);

  async function requestOtp() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("agreement-otp-request", { body: { token } });
      if (error) throw new Error(error.message || "otp_request_failed");
      const payload = data as any;
      if (payload?.error) throw new Error(payload.error);
      setOtpExpiresAt(payload.expires_at);
      setResendReadyAt(Date.now() + 60_000);
      setCode("");
      setStep("otp");
      toast({ title: t("pa.codeSent") });
    } catch (err: any) {
      setError(errorLabel(err.message, t));
      toast({ title: t("pa.sendFailed"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("agreement-otp-verify", {
        body: { token, code: code.trim() },
      });
      if (error) throw new Error(error.message || "otp_verify_failed");
      const payload = data as any;
      if (payload?.error) {
        throw new Error(payload.error as string);
      }
      setSessionToken(payload.session_token);
      await loadAgreement(payload.session_token);
    } catch (err: any) {
      setError(errorLabel(err.message, t));
    } finally {
      setBusy(false);
    }
  }

  async function loadAgreement(session: string) {
    const { data, error } = await supabase.functions.invoke("agreement-access", {
      body: { token, session_token: session },
    });
    if (error) throw new Error(error.message || "access_failed");
    const payload = data as any;
    if (payload?.error) throw new Error(payload.error);
    const res = payload as AccessResponse;
    setAccess(res);
    const saved = draftRef.current;
    setAnswers((prev) => {
      const merged: Record<string, boolean | string> = {};
      (res.controls || []).forEach((c) => {
        const draftVal = saved?.answers?.[c.id];
        const prevVal = prev?.[c.id];
        const fallback = c.type === "typed_acknowledgement" ? "" : false;
        merged[c.id] = prevVal !== undefined && prevVal !== "" && prevVal !== false
          ? prevVal
          : (draftVal !== undefined ? draftVal : fallback);
      });
      return merged;
    });
    if (!firstName && !lastName && res.client_name) {
      const parts = res.client_name.trim().split(/\s+/);
      if (parts.length > 0) {
        setFirstName((prev) => prev || parts[0] || "");
        setLastName((prev) => prev || parts.slice(1).join(" ") || "");
      }
    }
    if (res.already_accepted) {
      setAccepted({ at: res.accepted_at || "", hash: "" });
      clearDraft(token);
      setStep("done");
    } else {
      setStep("sign");
    }
  }

  async function submitAcceptance() {
    if (!access || !token) return;
    for (const c of access.controls) {
      if (c.type === "required_checkbox" && answers[c.id] !== true) {
        toast({ title: t("pa.tickRequired"), variant: "destructive" });
        return;
      }
      if (c.type === "typed_acknowledgement" && !String(answers[c.id] ?? "").trim()) {
        toast({ title: t("pa.completeTyped"), variant: "destructive" });
        return;
      }
    }
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: t("pa.enterName"), variant: "destructive" });
      return;
    }
    if (!typedName.trim()) {
      toast({ title: t("pa.typeSignature"), variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("agreement-accept", {
        body: {
          token,
          session_token: sessionToken,
          typed_name: typedName.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          answers,
        },
      });
      if (error) throw new Error(error.message || "accept_failed");
      const payload = data as any;
      if (payload?.error) throw new Error(payload.error);
      setAccepted({ at: payload.accepted_at, hash: payload.evidence_hash });
      clearDraft(token);
      setStep("done");
    } catch (err: any) {
      toast({ title: t("pa.couldNotSign"), description: errorLabel(err.message, t), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const therapistDisplay = info?.therapist_name || info?.business_name || t("pa.defaultTherapist");
  const therapistInitial = (therapistDisplay || "?").trim().charAt(0).toUpperCase();

  // DONE
  if (step === "done" && accepted) {
    return (
      <Shell>
        <div className="text-center space-y-4 py-8">
          <div className="mx-auto h-14 w-14 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <h1 className="text-2xl font-bold">{t("pa.signedTitle")}</h1>
          <p className="text-muted-foreground">{t("pa.signedDesc")}</p>
          {accepted.at && <p className="text-xs text-muted-foreground">{t("pa.signedAt")} {new Date(accepted.at).toLocaleString()}</p>}
        </div>
      </Shell>
    );
  }

  // WELCOME
  if (step === "welcome") {
    if (loadingInfo) {
      return <Shell><p className="text-sm text-muted-foreground text-center py-8">{t("common.loading") || "Loading…"}</p></Shell>;
    }
    if (infoError || !info) {
      return (
        <Shell>
          <div className="text-center space-y-3 py-6">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">{t("pa.linkUnavailable")}</h1>
            <p className="text-sm text-muted-foreground">{infoError || t("pa.contactTherapist")}</p>
          </div>
        </Shell>
      );
    }
    if (info.revoked || info.expired) {
      return (
        <Shell>
          <div className="text-center space-y-3 py-6">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">{t("pa.linkUnavailable")}</h1>
            <p className="text-sm text-muted-foreground">{t("pa.contactTherapist")}</p>
          </div>
        </Shell>
      );
    }
    return (
      <Shell>
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Solo.Bizz
          </div>
          <div className="text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{t("pa.welcomeTitle")}</h1>
            {info.agreement_title && <p className="text-sm font-medium text-foreground">{info.agreement_title}</p>}
          </div>

          <div className="flex items-center gap-3 justify-center rounded-lg bg-muted/40 p-3">
            {info.therapist_avatar_url ? (
              <img src={info.therapist_avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold">{therapistInitial}</div>
            )}
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">{therapistDisplay}</p>
              <p className="text-xs text-muted-foreground">{t("pa.sender")}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {t("pa.welcomeDesc", { therapist: therapistDisplay })}
          </p>

          <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
            <p className="flex items-start gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{t("pa.securityExplanation")}</span>
            </p>
            <p className="text-muted-foreground">{t("pa.emailInfo", { email: info.masked_email })}</p>
          </div>

          {error && <ErrorLine text={error} />}

          <Button className="w-full" size="lg" disabled={busy} onClick={requestOtp}>
            {busy ? t("pa.sending") : t("pa.sendCode")}
          </Button>

          <p className="text-xs text-muted-foreground text-center">{t("pa.noAccountNeeded")}</p>
          <p className="text-xs text-muted-foreground text-center">{t("pa.wrongEmailHelp")}</p>
        </div>
      </Shell>
    );
  }

  // OTP
  if (step === "otp") {
    const otpExpMs = otpExpiresAt ? new Date(otpExpiresAt).getTime() - now : 0;
    const otpExpired = otpExpMs <= 0;
    const resendMs = resendReadyAt ? resendReadyAt - now : 0;
    const canResend = !busy && resendMs <= 0;
    return (
      <Shell>
        <div className="space-y-6">
          <StepHeader icon={<KeyRound className="h-6 w-6 text-primary" />} title={t("pa.enterCodeTitle")} subtitle={t("pa.enterCodeDesc", { email: info?.masked_email || "" })} />
          <form onSubmit={verifyOtp} className="space-y-3">
            <Label htmlFor="code">{t("pa.codeLabel")}</Label>
            <Input
              id="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] font-mono"
              aria-label={t("pa.codeLabel")}
            />
            {error && <ErrorLine text={error} />}
            <Button type="submit" className="w-full" disabled={busy || code.length !== 6 || otpExpired}>
              {busy ? t("pa.verifying") : t("pa.verifyAndOpen")}
            </Button>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {otpExpired ? t("pa.codeExpired") : t("pa.codeValidFor", { time: formatCountdown(otpExpMs) })}
              </span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground underline disabled:opacity-50 disabled:no-underline"
                disabled={!canResend}
                onClick={() => requestOtp()}
              >
                {canResend ? t("pa.resendCode") : t("pa.resendIn", { time: formatCountdown(resendMs) })}
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center">{t("pa.checkSpam")}</p>
          </form>
        </div>
      </Shell>
    );
  }

  // SIGN
  if (!access) return <Shell><p className="text-sm text-muted-foreground">{t("common.loading") || "Loading…"}</p></Shell>;
  return (
    <Shell wide>
      <div className="mb-4 flex items-center gap-2 text-xs text-success">
        <ShieldCheck className="h-4 w-4" /> {t("pa.verifiedBanner")}
      </div>

      <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">{t("pa.nameHeader")}</p>
        <p className="text-xs text-muted-foreground">{t("pa.nameHelp")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="firstName">{t("pa.firstName")} <span className="text-destructive">*</span></Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} autoComplete="given-name" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName">{t("pa.lastName")} <span className="text-destructive">*</span></Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} autoComplete="family-name" />
          </div>
        </div>
      </div>

      <article className="prose prose-sm max-w-none">
        <h1 className="text-2xl font-bold text-foreground">{interpolate(access.content.title, firstName, lastName)}</h1>
        {access.therapist_name && <p className="text-sm text-muted-foreground">{t("pa.from")} {access.therapist_name}</p>}
        <div className="mt-6 space-y-6">
          {access.content.sections.map((s) => (
            <section key={s.id}>
              <h2 className="text-lg font-semibold text-foreground">{interpolate(s.heading, firstName, lastName)}</h2>
              <div className="text-sm text-foreground whitespace-pre-wrap">{interpolate(s.body, firstName, lastName)}</div>
            </section>
          ))}
          {((access.content.sessionFormats?.length ?? 0) > 0 || access.content.cycleLength || access.content.frequency) && (
            <section>
              <h2 className="text-lg font-semibold text-foreground">{t("af.title")}</h2>
              {(access.content.sessionFormats ?? []).length > 0 && (() => {
                const formats = access.content.sessionFormats ?? [];
                const anyPrice = formats.some((f) => f.price !== "" && f.price != null);
                return (
                  <table className="w-full text-sm border border-border rounded overflow-hidden my-2">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">{t("af.label")}</th>
                        <th className="text-left p-2">{t("af.duration")}</th>
                        {anyPrice && <th className="text-left p-2">{t("af.price")}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {formats.map((f) => (
                        <tr key={f.id} className="border-t border-border">
                          <td className="p-2">{f.label || "—"}</td>
                          <td className="p-2">{f.durationMinutes ? `${f.durationMinutes} ${t("common.min")}` : "—"}</td>
                          {anyPrice && (
                            <td className="p-2">{f.price !== "" && f.price != null ? `${f.price} ${f.currency || ""}`.trim() : ""}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
              {access.content.cycleLength ? (
                <p className="text-sm text-foreground">{t("af.cycleLine", { n: String(access.content.cycleLength) })}</p>
              ) : null}
              {access.content.frequency ? (
                <p className="text-sm text-foreground">{t("af.frequencyLine", { v: access.content.frequency })}</p>
              ) : null}
            </section>
          )}
        </div>
      </article>

      <div className="mt-8 border-t border-border pt-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-primary" /> {t("pa.acknowledgements")}
        </h2>
        <div className="space-y-4">
          {access.controls.length === 0 && <p className="text-sm text-muted-foreground">{t("pa.noAcks")}</p>}
          {access.controls.map((c) => {
            if (c.type === "typed_acknowledgement") {
              return (
                <div key={c.id} className="space-y-1">
                  <Label htmlFor={`ctl-${c.id}`}>{interpolate(c.label, firstName, lastName)} <span className="text-destructive">*</span></Label>
                  <Input id={`ctl-${c.id}`} value={String(answers[c.id] ?? "")} onChange={(e) => setAnswers((a) => ({ ...a, [c.id]: e.target.value }))} maxLength={500} />
                </div>
              );
            }
            const required = c.type === "required_checkbox";
            return (
              <div key={c.id} className="flex items-start gap-3">
                <Checkbox id={`ctl-${c.id}`} checked={answers[c.id] === true} onCheckedChange={(v) => setAnswers((a) => ({ ...a, [c.id]: v === true }))} />
                <Label htmlFor={`ctl-${c.id}`} className="text-sm font-normal leading-snug">
                  {interpolate(c.label, firstName, lastName)} {required && <span className="text-destructive">*</span>}
                </Label>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 pt-2">
          <Label htmlFor="typedName">{t("pa.typeToSign")} <span className="text-destructive">*</span></Label>
          <Input id="typedName" value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder={`${firstName} ${lastName}`.trim()} maxLength={200} />
          <p className="text-xs text-muted-foreground">{t("pa.signatureNote")}</p>
        </div>

        <Button className="w-full" size="lg" onClick={submitAcceptance} disabled={busy}>
          {busy ? t("pa.signing") : t("pa.signButton")}
        </Button>
      </div>
    </Shell>
  );
}

function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="text-center space-y-2">
      <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">{icon}</div>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4" /> {text}
    </div>
  );
}

function errorLabel(code: string | undefined, t: (k: string, v?: Record<string, string>) => string): string {
  switch (code) {
    case "not_found": return t("pa.err.notFound");
    case "expired": return t("pa.err.expired");
    case "revoked": return t("pa.err.revoked");
    case "email_mismatch": return t("pa.err.emailMismatch");
    case "already_accepted": return t("pa.err.alreadyAccepted");
    case "invalid_input": return t("pa.err.invalidInput");
    case "rate_limited": return t("pa.err.rateLimited");
    case "email_send_failed": return t("pa.err.sendFailed");
    case "otp_not_found": return t("pa.err.otpNotFound");
    case "otp_expired": return t("pa.err.otpExpired");
    case "otp_invalid": return t("pa.err.otpInvalid");
    case "otp_locked": return t("pa.err.otpLocked");
    case "session_invalid":
    case "session_expired":
    case "session_required": return t("pa.err.sessionEnded");
    default: return code || t("pa.err.generic");
  }
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-10 px-4">
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm`}>
        {children}
      </div>
    </div>
  );
}
