import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, ShieldCheck, AlertTriangle, FileSignature } from "lucide-react";

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
  content: { title: string; sections: Section[] };
  controls: Control[];
};

export default function PublicAgreementPage() {
  const { token } = useParams<{ token: string }>();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, boolean | string>>({});
  const [typedName, setTypedName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState<{ at: string; hash: string } | null>(null);

  async function requestAccess(e?: React.FormEvent) {
    e?.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("agreement-access", {
        body: { token, email: email.trim().toLowerCase() },
      });
      if (error) throw new Error(error.message || "access_failed");
      const payload = data as any;
      if (payload?.error) throw new Error(payload.error);
      const res = payload as AccessResponse;
      setAccess(res);
      // pre-fill checkbox defaults
      const init: Record<string, boolean | string> = {};
      (res.controls || []).forEach((c) => {
        init[c.id] = c.type === "typed_acknowledgement" ? "" : false;
      });
      setAnswers(init);
      if (res.already_accepted) {
        setAccepted({ at: res.accepted_at || "", hash: "" });
      }
    } catch (err: any) {
      setError(errorLabel(err.message));
    } finally {
      setLoading(false);
    }
  }

  async function submitAcceptance() {
    if (!access || !token) return;
    // client-side validation
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
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("agreement-accept", {
        body: {
          token,
          email: email.trim().toLowerCase(),
          typed_name: typedName.trim(),
          answers,
        },
      });
      if (error) throw new Error(error.message || "accept_failed");
      const payload = data as any;
      if (payload?.error) throw new Error(payload.error);
      setAccepted({ at: payload.accepted_at, hash: payload.evidence_hash });
    } catch (err: any) {
      toast({ title: "Could not sign", description: errorLabel(err.message), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // Success state
  if (accepted) {
    return (
      <Shell>
        <div className="text-center space-y-4 py-8">
          <div className="mx-auto h-14 w-14 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <h1 className="text-2xl font-bold">Agreement signed</h1>
          <p className="text-muted-foreground">
            Thank you. A copy has been recorded and shared with your therapist.
          </p>
          {accepted.at && (
            <p className="text-xs text-muted-foreground">
              Signed at {new Date(accepted.at).toLocaleString()}
            </p>
          )}
          {accepted.hash && (
            <p className="text-[11px] text-muted-foreground font-mono break-all px-4">
              Evidence hash: {accepted.hash}
            </p>
          )}
        </div>
      </Shell>
    );
  }

  // Email gate
  if (!access) {
    return (
      <Shell>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Information agreement</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to open the document your therapist sent you.
            </p>
          </div>
          <form onSubmit={requestAccess} className="space-y-3">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" /> {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Opening…" : "Open agreement"}
            </Button>
          </form>
        </div>
      </Shell>
    );
  }

  // Agreement rendering + signing
  return (
    <Shell wide>
      <article className="prose prose-sm max-w-none">
        <h1 className="text-2xl font-bold text-foreground">{access.content.title}</h1>
        {access.therapist_name && (
          <p className="text-sm text-muted-foreground">From {access.therapist_name}</p>
        )}
        <p className="text-sm text-muted-foreground">
          For {access.client_name} · {email}
        </p>
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
          {access.controls.length === 0 && (
            <p className="text-sm text-muted-foreground">No additional acknowledgements required.</p>
          )}
          {access.controls.map((c) => {
            if (c.type === "typed_acknowledgement") {
              return (
                <div key={c.id} className="space-y-1">
                  <Label htmlFor={`ctl-${c.id}`}>
                    {c.label} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`ctl-${c.id}`}
                    value={String(answers[c.id] ?? "")}
                    onChange={(e) => setAnswers((a) => ({ ...a, [c.id]: e.target.value }))}
                    maxLength={500}
                  />
                </div>
              );
            }
            const required = c.type === "required_checkbox";
            return (
              <div key={c.id} className="flex items-start gap-3">
                <Checkbox
                  id={`ctl-${c.id}`}
                  checked={answers[c.id] === true}
                  onCheckedChange={(v) => setAnswers((a) => ({ ...a, [c.id]: v === true }))}
                />
                <Label htmlFor={`ctl-${c.id}`} className="text-sm font-normal leading-snug">
                  {c.label} {required && <span className="text-destructive">*</span>}
                </Label>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 pt-2">
          <Label htmlFor="typedName">Type your full name to sign <span className="text-destructive">*</span></Label>
          <Input
            id="typedName"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="e.g. Anna Kowalska"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            By signing, you confirm you have read and understood this document. Your IP address,
            device information and a cryptographic hash of the document will be recorded as evidence.
          </p>
        </div>

        <Button className="w-full" size="lg" onClick={submitAcceptance} disabled={submitting}>
          {submitting ? "Signing…" : "Sign agreement"}
        </Button>
      </div>
    </Shell>
  );
}

function errorLabel(code?: string): string {
  switch (code) {
    case "not_found": return "This link is not valid.";
    case "expired": return "This link has expired.";
    case "revoked": return "This link has been revoked.";
    case "email_mismatch": return "The email address does not match the invitation.";
    case "already_accepted": return "This agreement has already been signed.";
    case "invalid_input": return "Please enter a valid email address.";
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
