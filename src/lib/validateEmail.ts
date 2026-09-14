// Shared, conservative email format check used by client forms.
// Requires a local part, a domain with at least one dot, and a 2+ char TLD.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Optional field: empty is fine, anything present must be a valid address. */
export function isValidOptionalEmail(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  if (!v) return true;
  return isValidEmail(v);
}
