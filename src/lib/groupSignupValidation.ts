import type { FormField } from "@/lib/groupForm";

// Mirrors server checks in public_submit_group_registration_v2 so errors show before sending.
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const PHONE_RE = /^\+?[0-9 ()./-]{5,30}$/;
export const URL_RE = /^https?:\/\/[^\s/?#]+\.[^\s/?#]+(\/\S*)?$/i;

export type AnswerError = "required" | "email" | "phone" | "url" | "option";

export function validateAnswer(f: FormField, raw: string | undefined): AnswerError | null {
  const v = (raw ?? "").trim();
  const empty = !v || (f.type === "checkbox" && v === "false");
  if (empty) return f.required ? "required" : null;
  if (f.type === "email" && (!EMAIL_RE.test(v) || v.length > 255)) return "email";
  if (f.type === "phone") { const d = v.replace(/\D/g, "").length; if (!PHONE_RE.test(v) || d < 5 || d > 17) return "phone"; }
  if (f.type === "url" && (!URL_RE.test(v) || v.length > 500)) return "url";
  if (f.type === "dropdown" && !(f.options ?? []).includes(v)) return "option";
  return null;
}

export function validateSignup(fields: FormField[], name: string, email: string, answers: Record<string, string>): Record<string, AnswerError> {
  const errs: Record<string, AnswerError> = {};
  if (!name.trim()) errs.name = "required";
  if (!email.trim()) errs.email = "required"; else if (!EMAIL_RE.test(email.trim())) errs.email = "email";
  for (const f of fields) { if (f.system) continue; const e = validateAnswer(f, answers[f.id]); if (e) errs[f.id] = e; }
  return errs;
}

/** Maps server error like "INVALID_FORMAT:f_ab12" to { fieldId, kind }. */
export function parseServerError(msg: string): { field?: string; kind: string } {
  const m = msg.match(/(REQUIRED_MISSING|INVALID_OPTION|INVALID_FORMAT|INVALID_EMAIL|INVALID_NAME|NOT_AVAILABLE|RATE_LIMIT|TOO_LONG)(?::([\w-]+))?/);
  if (!m) return { kind: "unknown" };
  const field = m[2] ?? (m[1] === "INVALID_EMAIL" ? "email" : m[1] === "INVALID_NAME" ? "name" : undefined);
  return { field, kind: m[1] };
}
