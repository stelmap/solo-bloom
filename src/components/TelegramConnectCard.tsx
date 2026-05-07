import { useState } from "react";
import { Send, Copy, CheckCircle2, AlertTriangle, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";

interface Props { client: any }

export function TelegramConnectCard({ client }: Props) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const status: string = client?.telegram_link_status || "not_connected";
  const isConnected = status === "connected" && !!client?.telegram_chat_id;

  const statusBadge = () => {
    if (isConnected)
      return <Badge className="bg-success/15 text-success border-success/30"><CheckCircle2 className="h-3 w-3 mr-1" />{t("telegramConnect.connected")}</Badge>;
    if (status === "invitation_sent")
      return <Badge variant="outline" className="text-warning border-warning/30">{t("telegramConnect.invitationSent")}</Badge>;
    if (status === "failed")
      return <Badge variant="outline" className="text-destructive border-destructive/30"><AlertTriangle className="h-3 w-3 mr-1" />{t("telegramConnect.failed")}</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">{t("telegramConnect.notConnected")}</Badge>;
  };

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-link", {
        body: { client_id: client.id },
      });
      if (error || !data?.link) throw new Error(error?.message || "Failed");
      setLink(data.link);
      qc.invalidateQueries({ queryKey: ["client", client.id] });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast({ title: t("telegramConnect.copied"), description: t("telegramConnect.copiedDesc") });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Send className="h-4 w-4 text-primary" /> {t("telegramConnect.title")}
      </h3>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("telegramConnect.status")}</span>
        {statusBadge()}
      </div>
      {client?.telegram && (
        <div className="text-xs text-muted-foreground">@{client.telegram}</div>
      )}

      {!isConnected && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t("telegramConnect.description")}
          </p>
          <Button size="sm" onClick={generate} disabled={loading} className="w-full">
            <Link2 className="h-4 w-4 mr-2" />
            {loading ? t("telegramConnect.generating") : t("telegramConnect.button")}
          </Button>
          {link && (
            <div className="space-y-2">
              <div className="text-xs break-all bg-muted rounded p-2 font-mono">{link}</div>
              <Button size="sm" variant="outline" onClick={copy} className="w-full">
                <Copy className="h-4 w-4 mr-2" /> {t("telegramConnect.copyLink")}
              </Button>
            </div>
          )}
        </div>
      )}

      {isConnected && client?.telegram_linked_at && (
        <p className="text-xs text-muted-foreground">
          {t("telegramConnect.linkedOn", { date: new Date(client.telegram_linked_at).toLocaleDateString() })}
        </p>
      )}
    </div>
  );
}
