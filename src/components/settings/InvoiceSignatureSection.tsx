import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useProfile, useUpdateProfile } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { SIGNATURE_BUCKET } from "@/lib/invoiceSignature";
import { cn } from "@/lib/utils";
import { PenLine, Upload, Trash2, Loader2 } from "lucide-react";

const ACCEPT = "image/png,image/jpeg,image/jpg,image/webp";
const MAX_SIZE = 2 * 1024 * 1024;

type Kind = "signature" | "stamp";

export function InvoiceSignatureSection() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [enabled, setEnabled] = useState(false);
  const [sigPath, setSigPath] = useState<string | null>(null);
  const [stampPath, setStampPath] = useState<string | null>(null);
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [saving, setSaving] = useState(false);

  const sigInput = useRef<HTMLInputElement>(null);
  const stampInput = useRef<HTMLInputElement>(null);

  const missingSig = enabled && !sigPath;

  useEffect(() => {
    if (!profile) return;
    const p: any = profile;
    setEnabled(!!p.use_scanned_invoice_signature);
    setSigPath(p.invoice_signature_path || null);
    setStampPath(p.invoice_stamp_path || null);
  }, [profile]);

  // Generate signed URLs for preview
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (sigPath) {
        const { data } = await supabase.storage.from(SIGNATURE_BUCKET).createSignedUrl(sigPath, 300);
        if (!cancel) setSigUrl(data?.signedUrl || null);
      } else setSigUrl(null);
      if (stampPath) {
        const { data } = await supabase.storage.from(SIGNATURE_BUCKET).createSignedUrl(stampPath, 300);
        if (!cancel) setStampUrl(data?.signedUrl || null);
      } else setStampUrl(null);
    })();
    return () => { cancel = true; };
  }, [sigPath, stampPath]);

  const validate = (file: File): string | null => {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return t("invoiceSig.errFormat");
    if (file.size > MAX_SIZE) return t("invoiceSig.errSize");
    return null;
  };

  const handleUpload = async (kind: Kind, file: File) => {
    if (!user) return;
    const err = validate(file);
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    const setBusy = kind === "signature" ? setUploadingSig : setUploadingStamp;
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(SIGNATURE_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;

      // Remove the previous file (best-effort)
      const prev = kind === "signature" ? sigPath : stampPath;
      if (prev) await supabase.storage.from(SIGNATURE_BUCKET).remove([prev]);

      const field = kind === "signature" ? "invoice_signature_path" : "invoice_stamp_path";
      await updateProfile.mutateAsync({ [field]: path } as any);
      if (kind === "signature") setSigPath(path); else setStampPath(path);
      toast({ title: t("invoiceSig.uploaded") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (kind: Kind) => {
    const prev = kind === "signature" ? sigPath : stampPath;
    if (prev) await supabase.storage.from(SIGNATURE_BUCKET).remove([prev]);
    const field = kind === "signature" ? "invoice_signature_path" : "invoice_stamp_path";
    const update: any = { [field]: null };
    // If removing the signature while the feature is on, also turn it off (requirement: sig is required when enabled)
    if (kind === "signature" && enabled) update.use_scanned_invoice_signature = false;
    await updateProfile.mutateAsync(update);
    if (kind === "signature") { setSigPath(null); if (enabled) setEnabled(false); }
    else setStampPath(null);
    toast({ title: t("invoiceSig.removed") });
  };

  const handleSave = async () => {
    if (enabled && !sigPath) {
      toast({ title: t("invoiceSig.errMissingSig"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ use_scanned_invoice_signature: enabled } as any);
      toast({ title: t("invoiceSig.saved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <PenLine className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-foreground">{t("invoiceSig.title")}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{t("invoiceSig.helper")}</p>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <Label htmlFor="use-sig" className="cursor-pointer">{t("invoiceSig.toggle")}</Label>
        <Switch id="use-sig" checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Signature */}
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label>{t("invoiceSig.signature")} *</Label>
            <div className="h-28 rounded-md bg-muted/40 border border-dashed border-border flex items-center justify-center overflow-hidden">
              {sigUrl ? (
                <img src={sigUrl} alt="signature" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">{t("invoiceSig.noFile")}</span>
              )}
            </div>
            <input
              ref={sigInput}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload("signature", f); e.currentTarget.value = ""; }}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => sigInput.current?.click()} disabled={uploadingSig}>
                {uploadingSig ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                {sigPath ? t("invoiceSig.replace") : t("invoiceSig.upload")}
              </Button>
              {sigPath && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemove("signature")}>
                  <Trash2 className="h-4 w-4 mr-1" />{t("invoiceSig.remove")}
                </Button>
              )}
            </div>
          </div>

          {/* Stamp */}
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label>{t("invoiceSig.stamp")} <span className="text-muted-foreground text-xs">({t("invoiceSig.optional")})</span></Label>
            <div className="h-28 rounded-md bg-muted/40 border border-dashed border-border flex items-center justify-center overflow-hidden">
              {stampUrl ? (
                <img src={stampUrl} alt="stamp" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">{t("invoiceSig.noFile")}</span>
              )}
            </div>
            <input
              ref={stampInput}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload("stamp", f); e.currentTarget.value = ""; }}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => stampInput.current?.click()} disabled={uploadingStamp}>
                {uploadingStamp ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                {stampPath ? t("invoiceSig.replace") : t("invoiceSig.upload")}
              </Button>
              {stampPath && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemove("stamp")}>
                  <Trash2 className="h-4 w-4 mr-1" />{t("invoiceSig.remove")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{t("invoiceSig.uploadHints")}</p>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving || updateProfile.isPending}>
          {saving ? t("common.saving") : t("invoiceSig.saveChanges")}
        </Button>
      </div>
    </div>
  );
}
