const ONBOARDED_KEY = "solo_bizz_onboarded";

function readSafeNext(): string | null {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next) return null;
  // Same-origin relative path only.
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

/**
 * Default destination after any successful login / signup.
 * Honors a same-origin `?next=` query param (used by the OAuth consent flow),
 * otherwise falls back to Calendar.
 */
export function getPostAuthRedirect(): string {
  const next = readSafeNext();
  if (next) return next;
  if (!localStorage.getItem(ONBOARDED_KEY)) {
    localStorage.setItem(ONBOARDED_KEY, "true");
  }
  return "/calendar";
}

export function peekPostAuthRedirect(): string {
  return readSafeNext() ?? "/calendar";
}

