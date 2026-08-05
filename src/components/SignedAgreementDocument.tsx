import { useLanguage } from "@/i18n/LanguageContext";
import { SessionFormatsBlock } from "@/components/SessionFormatsBlock";
import { formatDateTime, type SignedAgreementData, type SignedPdfLabels } from "@/lib/signedAgreementPdf";
import { Check, Square, CheckSquare, ShieldCheck } from "lucide-react";

export function useSignedPdfLabels(): SignedPdfLabels {
  const { t } = useLanguage();
  return {
    acknowledgements: t("signed.acknowledgements"),
    signature: t("signed.signature"),
    signedAt: t("signed.signedAt"),
    client: t("signed.client"),
    therapist: t("signed.therapist"),
    language: t("signed.language"),
    documentId: t("signed.documentId"),
    version: t("signed.version"),
    evidenceHash: t("signed.evidenceHash"),
    sessionFormats: t("af.sessionFormats"),
  };
}

export function SignedAgreementDocument({ data }: { data: SignedAgreementData }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-success">
        <ShieldCheck className="h-4 w-4" /> {t("signed.readOnly")}
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground">{data.title}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {t("signed.therapist")}: {data.therapistName || "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("signed.client")}: {data.clientName || "—"}
        </p>
      </div>


      <div className="space-y-4">
        {(data.sections || []).map((s, idx) => (
          <section key={s.id ?? idx}>
            {s.heading && <h3 className="text-base font-semibold text-foreground mb-1">{s.heading}</h3>}
            {s.body && <div className="text-sm text-foreground whitespace-pre-wrap">{s.body}</div>}
            {s.id === "services" && (
              <SessionFormatsBlock data={{ sessionFormats: data.sessionFormats, cycleLength: data.cycleLength, frequency: data.frequency }} />
            )}
          </section>
        ))}
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t("signed.acknowledgements")}</h3>
        {(data.controls || []).map((c) => {
          const val = data.answers?.[c.id];
          if (c.type === "typed_acknowledgement") {
            return (
              <div key={c.id} className="text-sm">
                <div className="text-foreground">{c.label}</div>
                <div className="mt-1 rounded-md bg-muted/50 px-3 py-2 font-medium text-foreground">{String(val ?? "—")}</div>
              </div>
            );
          }
          const checked = val === true;
          return (
            <div key={c.id} className="flex items-start gap-2 text-sm">
              {checked ? (
                <CheckSquare className="h-4 w-4 mt-0.5 text-success shrink-0" />
              ) : (
                <Square className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              )}
              <span className={checked ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border pt-4 space-y-1 text-sm">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Check className="h-4 w-4 text-success" /> {t("signed.signature")}: {data.signedName || "—"}
        </p>
        <p className="text-muted-foreground">{t("signed.signedAt")}: {formatDateTime(data.acceptedAt, data.language)}</p>
      </div>

      <div className="rounded-md bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-0.5 break-all">
        <p>{t("signed.language")}: {(data.language || "").toUpperCase()}</p>
        <p>{t("signed.version")}: {data.versionLabel}</p>
        <p>{t("signed.documentId")}: {data.documentId}</p>
        {data.evidenceHash && <p>{t("signed.evidenceHash")}: {data.evidenceHash}</p>}
      </div>
    </div>
  );
}
