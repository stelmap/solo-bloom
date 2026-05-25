import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Timer, KeyRound, Trash2 } from "lucide-react";
import { readIdleTimeoutMinutes, writeIdleTimeoutMinutes } from "@/hooks/useIdleTimeout";

interface MfaFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
}

export function MfaAndTimeoutSection() {
  const { toast } = useToast();
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
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
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setEnrolling(false);
    if (error || !data) {
      toast({ title: "Error", description: error?.message ?? "Failed to start enrollment", variant: "destructive" });
      return;
    }
    setEnrollData({
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function verifyEnroll() {
    if (!enrollData) return;
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId });
    if (cErr || !challenge) {
      toast({ title: "Error", description: cErr?.message ?? "Challenge failed", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enrollData.factorId,
      challengeId: challenge.id,
      code: verifyCode.trim(),
    });
    if (error) {
      toast({ title: "Invalid code", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Two-factor enabled" });
    setEnrollData(null);
    setVerifyCode("");
    await loadFactors();
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
          <div className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-sm">
              1. Scan the QR code below in your authenticator app, or paste the secret manually.
            </p>
            <div className="flex items-center gap-4">
              <img src={enrollData.qr} alt="TOTP QR code" className="h-40 w-40 bg-white p-2 rounded" />
              <div className="space-y-1 text-xs">
                <Label>Secret</Label>
                <code className="block break-all rounded bg-muted px-2 py-1">{enrollData.secret}</code>
              </div>
            </div>
            <Separator />
            <p className="text-sm">2. Enter the 6-digit code from your app to confirm.</p>
            <div className="flex gap-2 max-w-xs">
              <Input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
              />
              <Button onClick={verifyEnroll} disabled={verifyCode.length < 6}>Verify</Button>
              <Button variant="ghost" onClick={() => { setEnrollData(null); unenroll(enrollData.factorId).catch(() => {}); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={startEnroll} disabled={enrolling} variant="outline">
            {enrolling ? "Starting…" : "Enable two-factor"}
          </Button>
        )}
      </div>

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
