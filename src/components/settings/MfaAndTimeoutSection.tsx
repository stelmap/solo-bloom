import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Timer, KeyRound, Trash2, Eye, EyeOff, Copy, Check, Maximize2 } from "lucide-react";
import { readIdleTimeoutMinutes, writeIdleTimeoutMinutes } from "@/hooks/useIdleTimeout";
import { useLanguage } from "@/i18n/LanguageContext";

interface MfaFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
}

const ISSUER = "SoloBizz";

/** Force the otpauth URI to use the SoloBizz issuer + the user's email as the
 *  account label, regardless of what Supabase returned. Keeps the secret. */
function buildOtpAuthUri(rawUri: string, email: string | null): string {
  try {
    const u = new URL(rawUri);
    const secret = u.searchParams.get("secret") ?? "";
    const account = email && email.length > 0 ? email : "account";
    const label = encodeURIComponent(`${ISSUER}:${account}`);
    const params = new URLSearchParams({
      secret,
      issuer: ISSUER,
      algorithm: "SHA1",
      digits: "6",
      period: "30",
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  } catch {
    return rawUri;
  }
}

export function MfaAndTimeoutSection() {
  const { toast } = useToast();
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{ factorId: string; qrDataUrl: string; secret: string; otpauth: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState(readIdleTimeoutMinutes());

  async function loadFactors() {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setFactors([...(data?.totp ?? [])] as MfaFactor[]);
    }
    setLoading(false);
  }

  useEffect(() => { loadFactors(); }, []);

  async function startEnroll() {
    setEnrolling(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email ?? null;

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: ISSUER,
        friendlyName: `${ISSUER} (${email ?? "account"})`,
      });
      if (error || !data) {
        toast({ title: "Error", description: error?.message ?? "Failed to start enrollment", variant: "destructive" });
        return;
      }

      const rawUri = (data.totp as any).uri ?? "";
      const otpauth = buildOtpAuthUri(rawUri, email);

      // Render high-contrast PNG QR (large + crisp) ourselves so we control size & content.
      const qrDataUrl = await QRCode.toDataURL(otpauth, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 480,
        color: { dark: "#000000", light: "#ffffff" },
      });

      setShowSecret(false);
      setCopied(false);
      setVerifyCode("");
      setEnrollData({
        factorId: data.id,
        qrDataUrl,
        secret: data.totp.secret,
        otpauth,
      });
    } finally {
      setEnrolling(false);
    }
  }

  async function verifyEnroll() {
    if (!enrollData) return;
    setVerifying(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId });
      if (cErr || !challenge) {
        toast({ title: "Invalid authentication code", description: "Please try again.", variant: "destructive" });
        return;
      }
      const { error } = await supabase.auth.mfa.verify({
        factorId: enrollData.factorId,
        challengeId: challenge.id,
        code: verifyCode.trim(),
      });
      if (error) {
        toast({ title: "Invalid authentication code", description: "Please try again.", variant: "destructive" });
        return;
      }
      toast({ title: "Two-factor enabled" });
      setEnrollData(null);
      setVerifyCode("");
      setShowSecret(false);
      await loadFactors();
    } finally {
      setVerifying(false);
    }
  }

  async function cancelEnroll() {
    if (!enrollData) return;
    const id = enrollData.factorId;
    setEnrollData(null);
    setVerifyCode("");
    setShowSecret(false);
    // Best-effort cleanup of the pending unverified factor.
    supabase.auth.mfa.unenroll({ factorId: id }).catch(() => {});
  }

  async function copySecret() {
    if (!enrollData) return;
    try {
      await navigator.clipboard.writeText(enrollData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  async function unenroll(factorId: string) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Two-factor removed" });
      await loadFactors();
    }
  }

  function updateIdle(v: string) {
    const n = parseInt(v, 10);
    setIdleMinutes(n);
    writeIdleTimeoutMinutes(n);
    toast({ title: "Saved" });
  }

  const verifiedFactor = factors.find(f => f.status === "verified");

  const maskedSecret = enrollData
    ? enrollData.secret.slice(0, 4) + "••••••••••••" + enrollData.secret.slice(-4)
    : "";

  return (
    <div className="space-y-4">
      {/* Two-factor */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold text-foreground">Two-factor authentication</h2>
            <p className="text-sm text-muted-foreground">
              Add a time-based one-time code from an authenticator app (e.g. Google Authenticator, 1Password).
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : verifiedFactor ? (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Two-factor is enabled</p>
                <p className="text-xs text-muted-foreground">Factor ID: {verifiedFactor.id.slice(0, 8)}…</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => unenroll(verifiedFactor.id)}>
              <Trash2 className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        ) : enrollData ? (
          <div className="space-y-4 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">
              1. Scan the QR code in your authenticator app
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-5">
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                aria-label="Enlarge QR code"
                className="group relative rounded-lg bg-white p-3 border border-border shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <img
                  src={enrollData.qrDataUrl}
                  alt="SoloBizz two-factor QR code"
                  className="h-56 w-56 block"
                />
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/70 text-white text-[11px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="h-3 w-3" /> Enlarge
                </span>
              </button>

              <div className="flex-1 w-full space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Setup key (manual entry)</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 block break-all rounded bg-muted px-2 py-2 text-xs font-mono">
                      {showSecret ? enrollData.secret : maskedSecret}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowSecret(s => !s)}
                      title={showSecret ? "Hide setup key" : "Show setup key"}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copySecret}
                      title="Copy setup key"
                    >
                      {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use this key only if you cannot scan the QR code.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">2. Enter the 6-digit code from your app</p>
              <div className="flex gap-2 max-w-sm">
                <Input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                />
                <Button onClick={verifyEnroll} disabled={verifyCode.length < 6 || verifying}>
                  {verifying ? "Verifying…" : "Verify & enable"}
                </Button>
                <Button variant="ghost" onClick={cancelEnroll} disabled={verifying}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button onClick={startEnroll} disabled={enrolling} variant="outline">
            {enrolling ? "Starting…" : "Enable two-factor"}
          </Button>
        )}
      </div>

      {/* Enlarged QR modal */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan with your authenticator app</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center bg-white rounded-lg p-4">
            {enrollData ? (
              <img
                src={enrollData.qrDataUrl}
                alt="SoloBizz two-factor QR code, enlarged"
                className="block w-full max-w-[360px] h-auto"
              />
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Issuer: <span className="font-medium text-foreground">{ISSUER}</span> · Algorithm SHA1 · 6 digits · 30s
          </p>
        </DialogContent>
      </Dialog>

      {/* Idle timeout */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold text-foreground">Auto sign-out on inactivity</h2>
            <p className="text-sm text-muted-foreground">
              Automatically sign you out after a period of no activity. Recommended for shared or public devices.
            </p>
          </div>
        </div>
        <div className="max-w-xs space-y-2">
          <Label>Sign me out after</Label>
          <Select value={String(idleMinutes)} onValueChange={updateIdle}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Never</SelectItem>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
