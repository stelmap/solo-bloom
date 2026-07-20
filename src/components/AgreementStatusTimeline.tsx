import { format } from "date-fns";
import { FileText, Send, Eye, ShieldCheck, CheckCircle2, Ban, Circle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

export type AgreementTimelineData = {
  instanceCreatedAt?: string | null;
  invitationCreatedAt?: string | null;
  openedAt?: string | null;
  verifiedAt?: string | null;
  acceptedAt?: string | null;
  revokedAt?: string | null;
};

type Step = {
  key: "draft" | "sent" | "opened" | "verified" | "accepted" | "revoked";
  ts?: string | null;
  Icon: typeof FileText;
};

export function AgreementStatusTimeline({ data }: { data: AgreementTimelineData }) {
  const { t } = useLanguage();

  const baseSteps: Step[] = [
    { key: "draft", ts: data.instanceCreatedAt, Icon: FileText },
    { key: "sent", ts: data.invitationCreatedAt, Icon: Send },
    { key: "opened", ts: data.openedAt, Icon: Eye },
    { key: "verified", ts: data.verifiedAt, Icon: ShieldCheck },
    { key: "accepted", ts: data.acceptedAt, Icon: CheckCircle2 },
  ];

  const steps: Step[] = data.revokedAt
    ? [...baseSteps, { key: "revoked", ts: data.revokedAt, Icon: Ban }]
    : baseSteps;

  return (
    <ol className="space-y-3 mt-2">
      {steps.map((step, idx) => {
        const done = !!step.ts;
        const isRevoked = step.key === "revoked";
        const Icon = done ? step.Icon : Circle;
        const isLast = idx === steps.length - 1;
        return (
          <li key={step.key} className="flex gap-3 items-start relative">
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[11px] top-6 w-px h-[calc(100%-8px)]",
                  done ? "bg-primary/30" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border shrink-0 mt-0.5",
                done && !isRevoked && "bg-primary/10 border-primary/40 text-primary",
                done && isRevoked && "bg-destructive/10 border-destructive/40 text-destructive",
                !done && "bg-muted border-border text-muted-foreground",
              )}
            >
              <Icon className="h-3 w-3" />
            </span>
            <div className="flex-1 min-w-0 pb-1">
              <div
                className={cn(
                  "text-xs font-medium",
                  done && !isRevoked && "text-foreground",
                  done && isRevoked && "text-destructive",
                  !done && "text-muted-foreground",
                )}
              >
                {t(`agreements.timeline.${step.key}`)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {step.ts
                  ? format(new Date(step.ts), "d MMM yyyy, HH:mm")
                  : t("agreements.timeline.pending")}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
