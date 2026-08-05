// Shared interpolation for agreement templates/instances.
// Mirrors server-side logic in supabase/functions/agreement-access/index.ts
// so previews (editor, client card) render the same substitutions the client sees.

export type InterpolateVars = {
  clientFirstName?: string;
  clientLastName?: string;
  clientEmail?: string;
  therapistFullName?: string;
  therapistBusinessName?: string;
  /** ISO timestamp of the moment the client signed. Undefined/null until signed. */
  signedAt?: string | null;
  /** Document language (client communication language), used for date formatting + fallbacks. */
  language?: string;
};

const PLACEHOLDER = "_________";
export const UNSIGNED_DATE = "—";

const NOT_SPECIFIED: Record<string, string> = {
  en: "Not specified",
  uk: "Не вказано",
  ru: "Не указано",
  pl: "Nie podano",
  fr: "Non renseigné",
};

export function notSpecifiedLabel(language?: string): string {
  return NOT_SPECIFIED[(language || "en").slice(0, 2)] || NOT_SPECIFIED.en;
}

/** Formats a signing timestamp for the document's language. Never falls back to "now". */
export function formatSignedAt(signedAt?: string | null, language?: string): string {
  if (!signedAt) return UNSIGNED_DATE;
  const d = new Date(signedAt);
  if (Number.isNaN(d.getTime())) return UNSIGNED_DATE;
  try {
    return d.toLocaleDateString(language || undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return d.toLocaleDateString();
  }
}

export function buildVarMap(v: InterpolateVars): Record<string, string> {
  const first = (v.clientFirstName || "").trim();
  const last = (v.clientLastName || "").trim();
  const full = [first, last].filter(Boolean).join(" ");
  const signed = formatSignedAt(v.signedAt, v.language);
  const therapist = (v.therapistFullName || "").trim() || notSpecifiedLabel(v.language);
  return {
    "client.first_name": first || PLACEHOLDER,
    "client.last_name": last || PLACEHOLDER,
    "client.full_name": full || PLACEHOLDER,
    "client.name": full || PLACEHOLDER,
    "client.email": (v.clientEmail || "").trim() || PLACEHOLDER,
    "therapist.full_name": therapist,
    "therapist.business_name": (v.therapistBusinessName || "").trim() || notSpecifiedLabel(v.language),
    "document.signed_at": signed,
    // Legacy alias kept so older templates keep working — never "today's date".
    "today": signed,
  };
}

export function interpolateText(text: string, vars: Record<string, string>): string {
  if (!text) return text;
  return text.replace(/\{\{\s*([a-zA-Z_.]+)\s*\}\}/g, (_m, k) => (vars[k] ?? ""));
}

export function splitClientName(name?: string | null): { first: string; last: string } {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const first = parts.shift() || "";
  const last = parts.join(" ");
  return { first, last };
}
