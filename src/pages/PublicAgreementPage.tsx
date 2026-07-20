import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, ShieldCheck, AlertTriangle, FileSignature, KeyRound, Mail } from "lucide-react";

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

type Step = "email" | "otp" | "sign" | "done";

type DraftState = {
  step: Step;
  email: string;
  sessionToken: string;
  otpExpiresAt: string | null;
  answers: Record<string, boolean | string>;
  typedName: string;
  savedAt: number;
};

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24h — matches verified session lifetime
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

export default function PublicAgreementPage() {
  const { token } = useParams<{ token: string }>();
  const draftRef = useRef<DraftState | null>(loadDraft(token));
  const initial = draftRef.current;

  const [step, setStep] = useState<Step>(initial?.step && initial.step !== "done" ? initial.step : "email");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [code, setCode] = useState("");
  const [sessionToken, setSessionToken] = useState(initial?.sessionToken ?? "");
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(initial?.otpExpiresAt ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean | string>>(initial?.answers ?? {});
  const [typedName, setTypedName] = useState(initial?.typedName ?? "");
  const [accepted, setAccepted] = useState<{ at: string; hash: string } | null>(null);
  const [restoring, setRestoring] = useState<boolean>(!!(initial?.sessionToken && initial?.email));

  // Persist draft to localStorage on any relevant change
  useEffect(() => {
    const k = draftKey(token);
    if (!k) return;
    if (step === "done") return;
    const draft: DraftState = { step, email, sessionToken, otpExpiresAt, answers, typedName, savedAt: Date.now() };
    try { localStorage.setItem(k, JSON.stringify(draft)); } catch { /* ignore quota */ }
  }, [token, step, email, sessionToken, otpExpiresAt, answers, typedName]);

  // Attempt to resume a verified session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = draftRef.current;
      if (!saved?.sessionToken || !saved?.email || !token) { setRestoring(false); return; }
      try {
        await loadAgreement(saved.sessionToken);
      } catch {
        if (cancelled) return;
        setSessionToken("");
        setStep("email");
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("agreement-otp-request", {
        body: { token, email: email.trim().toLowerCase() },
      });
      if (error) throw new Error(error.message || "otp_request_failed");
      const payload = data as any;
      if (payload?.error) throw new Error(payload.error);
      setOtpExpiresAt(payload.expires_at);
      setStep("otp");
      toast({ title: "Verification code sent", description: `Check ${email} for a 6-digit code.` });
    } catch (err: any) {
      setError(errorLabel(err.message));
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
        body: { token, email: email.trim().toLowerCase(), code: code.trim() },
      });
      if (error) throw new Error(error.message || "otp_verify_failed");
      const payload = data as any;
      if (payload?.error) {
        const suffix = payload.attempts_remaining != null ? ` (${payload.attempts_remaining} left)` : "";
        throw new Error((payload.error as string) + suffix);
      }
      setSessionToken(payload.session_token);
      await loadAgreement(payload.session_token);
    } catch (err: any) {
      setError(errorLabel(err.message.split(" (")[0]) + (err.message.includes("(") ? " (" + err.message.split(" (")[1] : ""));
    } finally {
      setBusy(false);
    }
  }

  async function loadAgreement(session: string) {
    const { data, error } = await supabase.functions.invoke("agreement-access", {
      body: { token, email: email.trim().toLowerCase(), session_token: session },
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
        toast({ title: "Please tick all required boxes", variant: "destructive" });
        return;
      }
      if (c.type === "typed_acknowledgement" && !String(answers[c.id] ?? "").trim()) {
        toast({ title: "Please complete all typed acknowledgements", variant: "destructive" });
        return;
      }
    }
    if (!typedName.trim()) {
      toast({ title: "Please type your full name to sign", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("agreement-accept", {
        body: {
          token,
          email: email.trim().toLowerCase(),
          session_token: sessionToken,
          typed_name: typedName.trim(),
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
      toast({ title: "Could not sign", description: errorLabel(err.message), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  if (step === "done" && accepted) {
    return (
      <Shell>
        <div className="text-center space-y-4 py-8">
          <div className="mx-auto h-14 w-14 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <h1 className="text-2xl font-bold">Agreement signed</h1>
          <p className="text-muted-foreground">Thank you. A copy has been recorded and shared with your therapist.</p>
          {accepted.at && <p className="text-xs text-muted-foreground">Signed at {new Date(accepted.at).toLocaleString()}</p>}
          {accepted.hash && <p className="text-[11px] text-muted-foreground font-mono break-all px-4">Evidence hash: {accepted.hash}</p>}
        </div>
      </Shell>
    );
  }

  if (step === "email") {
    return (
      <Shell>
        <div className="space-y-6">
          <StepHeader icon={<Mail className="h-6 w-6 text-primary" />} title="Information agreement" subtitle="Enter your email — we'll send a 6-digit code to open the document." />
          <form onSubmit={requestOtp} className="space-y-3">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            {error && <ErrorLine text={error} />}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending…" : "Send verification code"}</Button>
          </form>
        </div>
      </Shell>
    );
  }

  if (step === "otp") {
    return (
      <Shell>
        <div className="space-y-6">
          <StepHeader icon={<KeyRound className="h-6 w-6 text-primary" />} title="Enter verification code" subtitle={`We sent a 6-digit code to ${email}. It expires in about 10 minutes.`} />
          <form onSubmit={verifyOtp} className="space-y-3">
            <Label htmlFor="code">6-digit code</Label>
            <Input
              id="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] font-mono"
              required
            />
            {error && <ErrorLine text={error} />}
            <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
              {busy ? "Verifying…" : "Verify and open agreement"}
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button type="button" className="text-muted-foreground hover:text-foreground underline" onClick={() => { setStep("email"); setCode(""); setError(null); }}>
                Change email
              </button>
              <button type="button" className="text-muted-foreground hover:text-foreground underline disabled:opacity-50" disabled={busy} onClick={() => requestOtp()}>
                Resend code
              </button>
            </div>
            {otpExpiresAt && (
              <p className="text-[11px] text-muted-foreground text-center">Code expires at {new Date(otpExpiresAt).toLocaleTimeString()}</p>
            )}
          </form>
        </div>
      </Shell>
    );
  }

  // step === "sign"
  if (!access) return <Shell><p className="text-sm text-muted-foreground">Loading…</p></Shell>;
  return (
    <Shell wide>
      <div className="mb-4 flex items-center gap-2 text-xs text-success">
        <ShieldCheck className="h-4 w-4" /> Verified — session valid for 24 hours
      </div>
      <article className="prose prose-sm max-w-none">
        <h1 className="text-2xl font-bold text-foreground">{access.content.title}</h1>
        {access.therapist_name && <p className="text-sm text-muted-foreground">From {access.therapist_name}</p>}
        <p className="text-sm text-muted-foreground">For {access.client_name} · {email}</p>
        <div className="mt-6 space-y-6">
          {access.content.sections.map((s) => (
            <section key={s.id}>
              <h2 className="text-lg font-semibold text-foreground">{s.heading}</h2>
              <div className="text-sm text-foreground whitespace-pre-wrap">{s.body}</div>
            </section>
          ))}
        </div>
      </article>

      <div className="mt-8 border-t border-border pt-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-primary" /> Your acknowledgements
        </h2>
        <div className="space-y-4">
          {access.controls.length === 0 && <p className="text-sm text-muted-foreground">No additional acknowledgements required.</p>}
          {access.controls.map((c) => {
            if (c.type === "typed_acknowledgement") {
              return (
                <div key={c.id} className="space-y-1">
                  <Label htmlFor={`ctl-${c.id}`}>{c.label} <span className="text-destructive">*</span></Label>
                  <Input id={`ctl-${c.id}`} value={String(answers[c.id] ?? "")} onChange={(e) => setAnswers((a) => ({ ...a, [c.id]: e.target.value }))} maxLength={500} />
                </div>
              );
            }
            const required = c.type === "required_checkbox";
            return (
              <div key={c.id} className="flex items-start gap-3">
                <Checkbox id={`ctl-${c.id}`} checked={answers[c.id] === true} onCheckedChange={(v) => setAnswers((a) => ({ ...a, [c.id]: v === true }))} />
                <Label htmlFor={`ctl-${c.id}`} className="text-sm font-normal leading-snug">
                  {c.label} {required && <span className="text-destructive">*</span>}
                </Label>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 pt-2">
          <Label htmlFor="typedName">Type your full name to sign <span className="text-destructive">*</span></Label>
          <Input id="typedName" value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder="e.g. Anna Kowalska" maxLength={200} />
          <p className="text-xs text-muted-foreground">
            By signing, you confirm you have read and understood this document. Your IP address, device information and a cryptographic hash of the document will be recorded as evidence.
          </p>
        </div>

        <Button className="w-full" size="lg" onClick={submitAcceptance} disabled={busy}>
          {busy ? "Signing…" : "Sign agreement"}
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

function errorLabel(code?: string): string {
  switch (code) {
    case "not_found": return "This link is not valid.";
    case "expired": return "This link has expired.";
    case "revoked": return "This link has been revoked.";
    case "email_mismatch": return "The email address does not match the invitation.";
    case "already_accepted": return "This agreement has already been signed.";
    case "invalid_input": return "Please check your input and try again.";
    case "rate_limited": return "Please wait a moment before requesting another code.";
    case "email_send_failed": return "We couldn't send the code. Please try again.";
    case "otp_not_found": return "No active code — request a new one.";
    case "otp_expired": return "This code has expired. Request a new one.";
    case "otp_invalid": return "Incorrect code.";
    case "otp_locked": return "Too many attempts. Request a new code.";
    case "session_invalid":
    case "session_expired":
    case "session_required": return "Your verified session ended. Please verify again.";
    default: return code || "Something went wrong.";
  }
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-10 px-4">
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-md"} bg-card border border-border rounded-xl p-6 shadow-sm`}>
        {children}
      </div>
    </div>
  );
}
