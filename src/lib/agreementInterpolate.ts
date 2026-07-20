// Shared interpolation for agreement templates/instances.
// Mirrors server-side logic in supabase/functions/agreement-access/index.ts
// so previews (editor, client card) render the same substitutions the client sees.

export type InterpolateVars = {
  clientFirstName?: string;
  clientLastName?: string;
  clientEmail?: string;
  therapistFullName?: string;
  therapistBusinessName?: string;
  today?: string;
};

const PLACEHOLDER = "_________";

export function buildVarMap(v: InterpolateVars): Record<string, string> {
  const first = (v.clientFirstName || "").trim();
  const last = (v.clientLastName || "").trim();
  const full = [first, last].filter(Boolean).join(" ");
  return {
    "client.first_name": first || PLACEHOLDER,
    "client.last_name": last || PLACEHOLDER,
    "client.full_name": full || PLACEHOLDER,
    "client.name": full || PLACEHOLDER,
    "client.email": (v.clientEmail || "").trim() || PLACEHOLDER,
    "therapist.full_name": (v.therapistFullName || "").trim() || PLACEHOLDER,
    "therapist.business_name": (v.therapistBusinessName || "").trim() || PLACEHOLDER,
    "today": v.today || new Date().toLocaleDateString(),
  };
}

export function interpolateText(text: string, vars: Record<string, string>): string {
  if (!text) return text;
  return text.replace(/\{\{\s*([a-zA-Z_.]+)\s*\}\}/g, (_m, k) => (vars[k] ?? _m));
}

export function splitClientName(name?: string | null): { first: string; last: string } {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const first = parts.shift() || "";
  const last = parts.join(" ");
  return { first, last };
}
