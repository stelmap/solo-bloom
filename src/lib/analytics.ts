// Centralized analytics helper (PostHog).
// All event tracking across the app must go through this module to keep
// event names, property shapes, and PII rules consistent.
//
// PII policy: NEVER pass email, full name, phone, notes, or payment details
// as event/user properties. Identify users by their internal Supabase user ID only.

import posthog from "posthog-js";

const POSTHOG_KEY = "phc_vfqFKQL2ZpD9oo4XRNgDAesH8ayrWvZF6DUTLyhGkjrn";
const POSTHOG_HOST = "https://eu.i.posthog.com";

// Hostname → environment mapping. Every event is tagged with `environment`
// so prod, preview, and dev traffic can be segmented or filtered in PostHog.
const PROD_HOSTS = new Set<string>([
  "solo-bizz-app.lovable.app",
  "www.solo-bizz.com",
  "solo-bizz.com",
]);

export type EnvironmentValue = "production" | "preview" | "development";

function detectEnvironment(): EnvironmentValue {
  if (typeof window === "undefined") return "development";
  const host = window.location.hostname;
  if (PROD_HOSTS.has(host)) return "production";
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
    return "development";
  }
  return "preview";
}

let initialized = false;
let enabled = false;
let environment: EnvironmentValue = "development";

export function initAnalytics(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  environment = detectEnvironment();
  // Capture from every environment (prod, preview, dev) so we can segment by env.
  enabled = true;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true, // never record what users type
      maskTextSelector: "[data-private]",
    },
    // Hard-disable any auto-collection that could include PII text.
    sanitize_properties: (props) => {
      const cleaned: Record<string, unknown> = { ...props };
      // Strip common PII keys defensively if anything ever bubbles up.
      for (const k of Object.keys(cleaned)) {
        if (/email|phone|full[_-]?name|password|token/i.test(k)) {
          delete cleaned[k];
        }
      }
      return cleaned;
    },
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.debug(false);
    },
  });
}

function deviceType(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 768px)").matches ? "mobile" : "desktop";
}

export interface BaseEventProps {
  plan_type?: string;
  is_trial?: boolean;
  locale?: string;
  currency?: string;
  source_page?: string;
  device_type?: "mobile" | "desktop";
  [key: string]: unknown;
}

export type AnalyticsEvent =
  | "landing_view"
  | "pricing_view"
  | "cta_clicked"
  | "pricing_cycle_changed"
  | "sign_up_started"
  | "sign_up_completed"
  | "login_completed"
  | "password_reset_started"
  | "password_reset_completed"
  | "client_created"
  | "client_archived"
  | "client_unarchived"
  | "service_created"
  | "session_created"
  | "session_completed"
  | "expense_created"
  | "expense_updated"
  | "expense_deleted"
  | "income_created"
  | "income_deleted"
  | "client_updated"
  | "client_deleted"
  | "service_updated"
  | "service_deleted"
  | "session_updated"
  | "session_deleted"
  | "session_canceled"
  | "session_reopened"
  | "payment_marked_paid"
  | "payment_status_toggled"
  | "profile_updated"
  | "breakeven_viewed"
  | "checkout_started"
  | "checkout_completed"
  | "subscription_active"
  | "subscription_canceled";

// In-memory diagnostics for the current browser session.
// Survives only until page reload — purely a debugging aid.
export interface AnalyticsDiagnostics {
  enabled: boolean;
  initialized: boolean;
  host: string;
  distinctId: string | null;
  sessionId: string | null;
  totalEvents: number;
  lastEvent: { name: string; at: string } | null;
  countsByEvent: Record<string, number>;
  recentEvents: Array<{ name: string; at: string; props?: Record<string, unknown> }>;
}

const diagnostics = {
  totalEvents: 0,
  lastEventName: null as string | null,
  lastEventAt: null as string | null,
  countsByEvent: {} as Record<string, number>,
  recentEvents: [] as Array<{ name: string; at: string; props?: Record<string, unknown> }>,
};

type DiagListener = () => void;
const listeners = new Set<DiagListener>();
function notify() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* noop */
    }
  });
}

export function subscribeDiagnostics(listener: DiagListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDiagnostics(): AnalyticsDiagnostics {
  let distinctId: string | null = null;
  let sessionId: string | null = null;
  if (enabled) {
    try {
      distinctId = posthog.get_distinct_id?.() ?? null;
      sessionId = posthog.get_session_id?.() ?? null;
    } catch {
      /* noop */
    }
  }
  return {
    enabled,
    initialized,
    host: typeof window !== "undefined" ? window.location.hostname : "",
    distinctId,
    sessionId,
    totalEvents: diagnostics.totalEvents,
    lastEvent:
      diagnostics.lastEventName && diagnostics.lastEventAt
        ? { name: diagnostics.lastEventName, at: diagnostics.lastEventAt }
        : null,
    countsByEvent: { ...diagnostics.countsByEvent },
    recentEvents: [...diagnostics.recentEvents],
  };
}

function recordDiagnostic(name: string, props?: Record<string, unknown>) {
  const at = new Date().toISOString();
  diagnostics.totalEvents += 1;
  diagnostics.lastEventName = name;
  diagnostics.lastEventAt = at;
  diagnostics.countsByEvent[name] = (diagnostics.countsByEvent[name] ?? 0) + 1;
  diagnostics.recentEvents.unshift({ name, at, props });
  if (diagnostics.recentEvents.length > 25) diagnostics.recentEvents.length = 25;
  notify();
}

// Subscription state, refreshed by AuthContext. Attached to every event.
export type SubscriptionStatusValue = "active" | "inactive" | "trial" | "unknown";
let subscriptionStatus: SubscriptionStatusValue = "unknown";

export function setSubscriptionStatus(status: SubscriptionStatusValue): void {
  subscriptionStatus = status;
  if (enabled) {
    try {
      posthog.register({ subscription_status: status });
    } catch {
      /* noop */
    }
  }
}

export function getSubscriptionStatus(): SubscriptionStatusValue {
  return subscriptionStatus;
}

export function track(event: AnalyticsEvent, props: BaseEventProps = {}): void {
  if (!initialized) initAnalytics();
  const enriched: BaseEventProps = {
    device_type: deviceType(),
    source_page: typeof window !== "undefined" ? window.location.pathname : undefined,
    locale: typeof navigator !== "undefined" ? navigator.language : undefined,
    subscription_status: subscriptionStatus,
    ...props,
  };
  // Always record the attempt locally so diagnostics work in dev/preview too.
  recordDiagnostic(event, enriched);
  if (!enabled) return;
  posthog.capture(event, enriched);
}

// Fire an arbitrary diagnostic event (not part of the typed AnalyticsEvent union).
// Used by the in-app diagnostics page to verify delivery without polluting product events.
export function trackDiagnosticPing(): { name: string; at: string } {
  const name = "diagnostics_ping";
  const at = new Date().toISOString();
  const props = {
    device_type: deviceType(),
    source_page: typeof window !== "undefined" ? window.location.pathname : undefined,
    sent_at: at,
  };
  recordDiagnostic(name, props);
  if (enabled) {
    try {
      posthog.capture(name, props);
    } catch {
      /* noop */
    }
  }
  return { name, at };
}

// Identify the logged-in user with their internal Supabase user ID.
// Do NOT pass email, name, phone, etc.
export function identifyUser(userId: string, traits: { locale?: string; currency?: string } = {}): void {
  if (!initialized) initAnalytics();
  if (!enabled || !userId) return;
  posthog.identify(userId, {
    // Only non-PII traits.
    locale: traits.locale,
    currency: traits.currency,
  });
}

export function resetAnalytics(): void {
  if (!enabled) return;
  posthog.reset();
}

export function isAnalyticsEnabled(): boolean {
  return enabled;
}
