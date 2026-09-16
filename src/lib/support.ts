/**
 * Support engine helpers — shared by the in-app widget, the public website
 * widget and error-triggered help.
 *
 * Nothing here knows about the AI provider or the knowledge base: the UI talks
 * to the `support-chat` edge function only, so the provider can be swapped
 * without touching the support interface.
 */

export type SupportContext = {
  /** Product module the user is in (Calendar, Clients, ...). */
  module?: string | null;
  /** Route the user is on. */
  pagePath?: string | null;
  /** What the user was doing, e.g. "create_recurring_session". */
  action?: string | null;
  /** Non-sensitive error code, e.g. a Postgres code or an app error key. */
  errorCode?: string | null;
  /** Short, already user-facing error text. Never a stack trace. */
  errorMessage?: string | null;
  appVersion?: string | null;
};

export type SupportAction = { label: string; route: string };

export const SUPPORT_OPEN_EVENT = "solobizz:support-open";

/**
 * Open the support assistant from anywhere (error toasts, empty states,
 * "Ask Support" buttons). Safe to call from non-React code.
 */
export function askSupport(context: SupportContext = {}, prefill?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SUPPORT_OPEN_EVENT, { detail: { context, prefill } }),
  );
}

/** Map a route to the product module used for context and analytics. */
export function moduleFromPath(path: string): string {
  const p = path.toLowerCase();
  if (p.startsWith("/dashboard")) return "Dashboard";
  if (p.startsWith("/calendar")) return "Calendar";
  if (p.startsWith("/clients")) return "Clients";
  if (p.startsWith("/groups")) return "Groups";
  if (p.startsWith("/services")) return "Services";
  if (p.startsWith("/booking-inbox") || p.startsWith("/book")) return "Booking";
  if (p.startsWith("/finances")) return "Finances";
  if (p.startsWith("/plans") || p.startsWith("/checkout") || p.startsWith("/purchase-success")) return "Subscription";
  if (p.startsWith("/settings")) return "Settings";
  if (p.startsWith("/auth") || p.startsWith("/reset-password")) return "Authentication";
  if (p === "/" || p.startsWith("/guides")) return "Website";
  return "Other";
}

/** Deep links the assistant may offer, with the label shown to the user. */
export const SUPPORT_ROUTES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/calendar": "Calendar",
  "/clients": "Clients",
  "/groups": "Groups",
  "/services": "Services",
  "/finances": "Finances",
  "/finances/income": "Income",
  "/finances/expenses": "Expenses",
  "/booking-inbox": "Booking inbox",
  "/settings": "Settings",
  "/settings/practice": "Practice profile",
  "/calendar/settings": "Calendar settings",
  "/finances/settings": "Finance settings",
  "/plans": "Plans",
};

const ANON_KEY = "support_anon_id";

/** Stable per-browser id so website visitors' conversations stay grouped. */
export function getSupportAnonId(): string {
  try {
    const existing = localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
    return id;
  } catch {
    return "anonymous";
  }
}
