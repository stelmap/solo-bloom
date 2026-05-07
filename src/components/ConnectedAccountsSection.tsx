import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import type { UserIdentity } from "@supabase/supabase-js";

export function ConnectedAccountsSection() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.auth.getUserIdentities();
    setIdentities(data?.identities ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const googleIdentity = identities.find((i) => i.provider === "google");
  const emailIdentity = identities.find((i) => i.provider === "email");

  const handleLinkGoogle = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/settings` },
      });
      if (error) throw error;
      // Browser will redirect to Google
    } catch (e: any) {
      toast({
        title: t("common.error"),
        description: e?.message || t("auth.googleSignInFailed"),
        variant: "destructive",
      });
      setBusy(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!googleIdentity) return;
    if (identities.length <= 1) {
      toast({
        title: t("common.error"),
        description: t("connectedAccounts.cannotUnlinkLast"),
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (error) throw error;
      toast({ title: t("connectedAccounts.unlinked") });
      await refresh();
    } catch (e: any) {
      toast({
        title: t("common.error"),
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link2 className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="font-semibold text-foreground">{t("connectedAccounts.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("connectedAccounts.subtitle")}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <div className="space-y-3">
          {/* Email/password */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">@</div>
              <div>
                <p className="text-sm font-medium text-foreground">{t("connectedAccounts.emailPassword")}</p>
                <p className="text-xs text-muted-foreground">{emailIdentity?.identity_data?.email || "—"}</p>
              </div>
            </div>
            {emailIdentity ? (
              <Badge variant="secondary">{t("connectedAccounts.connected")}</Badge>
            ) : (
              <Badge variant="outline">{t("connectedAccounts.notConnected")}</Badge>
            )}
          </div>

          {/* Google */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/>
              </svg>
              <div>
                <p className="text-sm font-medium text-foreground">Google</p>
                <p className="text-xs text-muted-foreground">
                  {googleIdentity?.identity_data?.email || t("connectedAccounts.googleHint")}
                </p>
              </div>
            </div>
            {googleIdentity ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{t("connectedAccounts.connected")}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUnlinkGoogle}
                  disabled={busy || identities.length <= 1}
                >
                  <Unlink className="h-4 w-4 mr-1" />
                  {t("connectedAccounts.unlink")}
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={handleLinkGoogle} disabled={busy}>
                {t("connectedAccounts.connectGoogle")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
