import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Send, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useDateFormat } from "@/lib/dateLocale";
import { useLanguage } from "@/i18n/LanguageContext";

interface Props { clientId: string }

export function TelegramSendLog({ clientId }: Props) {
  const fmt = useDateFormat();
  const { t } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ["telegram_send_log", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("telegram_send_log")
        .select("id, created_at, template_name, status, error_message, message_id")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Send className="h-4 w-4 text-primary" /> Telegram delivery log
      </h3>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-xs text-muted-foreground">No Telegram messages sent yet.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {data.map((row: any) => (
            <li key={row.id} className="py-2 flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  {row.status === "sent" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                  <span className="font-medium truncate">{row.template_name}</span>
                </div>
                {row.error_message && (
                  <p className="text-xs text-destructive break-words">{row.error_message}</p>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {fmt(new Date(row.created_at), "PP HH:mm")}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  row.status === "sent"
                    ? "text-success border-success/30"
                    : "text-destructive border-destructive/30"
                }
              >
                {row.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
