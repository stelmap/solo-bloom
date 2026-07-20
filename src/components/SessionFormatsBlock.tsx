import { useLanguage } from "@/i18n/LanguageContext";

export type CycleMode = "specified" | "indefinite" | "hidden";

export type SessionFormatItem = {
  id: string;
  label?: string;
  durationMinutes?: number | "" | null;
  price?: number | "" | null;
  currency?: string;
};

export type SessionFormatsData = {
  sessionFormats?: SessionFormatItem[] | null;
  cycleMode?: CycleMode | null;
  cycleLength?: number | "" | null;
  frequency?: string | null;
};

/** Infer legacy data: if cycleMode is missing, derive from cycleLength. */
export function normalizeCycleMode(data: SessionFormatsData): CycleMode {
  if (data.cycleMode === "specified" || data.cycleMode === "indefinite" || data.cycleMode === "hidden") {
    return data.cycleMode;
  }
  const n = typeof data.cycleLength === "number" ? data.cycleLength : Number(data.cycleLength);
  return Number.isFinite(n) && n > 0 ? "specified" : "hidden";
}

export function hasSessionFormatsContent(data: SessionFormatsData): boolean {
  const mode = normalizeCycleMode(data);
  return (
    (data.sessionFormats?.length ?? 0) > 0 ||
    (mode === "specified" && !!data.cycleLength) ||
    mode === "indefinite" ||
    !!data.frequency
  );
}

export function SessionFormatsBlock({ data, compact = false }: { data: SessionFormatsData; compact?: boolean }) {
  const { t } = useLanguage();
  const formats = data.sessionFormats ?? [];
  const mode = normalizeCycleMode(data);
  const anyPrice = formats.some((f) => f.price !== "" && f.price != null);
  if (!hasSessionFormatsContent(data)) return null;
  return (
    <div className={compact ? "mt-2 space-y-1" : "mt-3 space-y-2"}>
      {formats.length > 0 && (
        <table className="w-full text-sm border border-border rounded overflow-hidden">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">{t("af.label")}</th>
              <th className="text-left p-2">{t("af.duration")}</th>
              {anyPrice && <th className="text-left p-2">{t("af.price")}</th>}
            </tr>
          </thead>
          <tbody>
            {formats.map((f) => (
              <tr key={f.id} className="border-t border-border">
                <td className="p-2">{f.label || "—"}</td>
                <td className="p-2">{f.durationMinutes ? `${f.durationMinutes} ${t("common.min")}` : "—"}</td>
                {anyPrice && (
                  <td className="p-2">
                    {f.price !== "" && f.price != null ? `${f.price} ${f.currency || ""}`.trim() : ""}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {mode === "specified" && data.cycleLength ? (
        <p className="text-sm text-foreground">{t("af.cycleLine", { n: String(data.cycleLength) })}</p>
      ) : null}
      {mode === "indefinite" ? (
        <p className="text-sm text-foreground">{t("af.cycleIndefiniteLine")}</p>
      ) : null}
      {data.frequency ? (
        <p className="text-sm text-foreground">{t("af.frequencyLine", { v: data.frequency })}</p>
      ) : null}
    </div>
  );
}

/** Filter out any legacy auto-generated "session-formats" section from persisted content. */
export function stripLegacySessionFormatsSection<T extends { id?: string }>(sections: T[] | undefined | null): T[] {
  return (sections ?? []).filter((s) => s?.id !== "session-formats");
}
