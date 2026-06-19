// Centralized analytics helper (PostHog).
// All event tracking across the app must go through this module to keep
// event names, property shapes, and PII rules consistent.
//
// PII policy: NEVER pass email, full name, phone, notes, or payment details
// as event/user properties. Identify users by their internal Supabase user ID only.

import posthog from "posthog-js";

const POSTHOG_KEY = "phc_vfqFKQL2ZpD9oo4XRNgDAesH8ayrWvZF6DUTLyhGkjrn";
// Custom reverse-proxy domain (managed by PostHog) — avoids ad-blockers and
// keeps analytics traffic on our own domain. Falls back via PostHog's edge.
const POSTHOG_HOST = "https://t.solo-bizz.com";
const POSTHOG_UI_HOST = "https://eu.posthog.com";

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
    ui_host: POSTHOG_UI_HOST,
    person_profiles: "identified_only",
    // Set to `true` so PostHog's install wizard can auto-verify the snippet.
    // Our React Router wrapper still captures SPA route changes correctly.
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
      // Tag every event/person with the environment it came from.
      ph.register({ environment });
      // Capture UTM + referrer + landing domain as super-properties on every event.
      try {
        const url = new URL(window.location.href);
        const sp = url.searchParams;
        const utmProps: Record<string, string> = {};
        for (const k of ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"]) {
          const v = sp.get(k);
          if (v) utmProps[k] = v;
        }
        ph.register({
          ...utmProps,
          landing_domain: url.hostname,
          initial_referrer: document.referrer || "direct",
        });
      } catch { /* noop */ }
      if (import.meta.env.DEV) ph.debug(false);
    },
  });
}

export function getEnvironment(): EnvironmentValue {
  return environment;
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
  | "dashboard_viewed"
  | "dashboard_widget_clicked"
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
  | "subscription_canceled"
  | "group_created"
  | "group_updated"
  | "group_deleted"
  | "supervision_created"
  | "supervision_updated"
  | "supervision_deleted"
  | "invoice_downloaded"
  | "csv_exported"
  | "language_changed"
  | "telegram_connected"
  | "telegram_disconnected"
  | "paywall_shown"
  | "paywall_dismissed"
  | "paywall_cta_clicked"
  | "payment_method_added"
  | "payment_method_deleted"
  | "booking_request_submitted"
  | "booking_confirmed"
  // Funnel + product analytics
  | "website_page_view"
  | "auth_page_opened"
  | "registration_started"
  | "registration_completed"
  | "registration_failed"
  | "product_entered"
  | "dashboard_opened"
  | "calendar_opened"
  | "clients_opened"
  | "finances_opened"
  | "income_page_opened"
  | "settings_opened"
  | "first_appointment_created"
  | "first_client_created"
  | "pricing_page_viewed"
  | "tariff_selected"
  | "stripe_checkout_opened"
  | "subscription_completed"
  | "payment_succeeded"
  | "payment_failed"
  | "subscription_cancelled"
  | "scroll_depth";

// Events we persist to Supabase user_activity_events for the admin dashboard.
const PERSISTED_EVENTS = new Set<AnalyticsEvent>([
  "auth_page_opened",
  "registration_completed",
  "login_completed",
  "product_entered",
  "dashboard_opened",
  "calendar_opened",
  "clients_opened",
  "finances_opened",
  "income_page_opened",
  "settings_opened",
  "first_appointment_created",
  "first_client_created",
  "client_created",
  "session_created",
  "pricing_page_viewed",
  "tariff_selected",
  "stripe_checkout_opened",
  "checkout_started",
  "subscription_completed",
  "subscription_active",
  "payment_succeeded",
  "payment_failed",
  "subscription_cancelled",
  // Anonymous website / landing traffic — persisted even without a user_id
  // so the admin analytics dashboard can show visits from solo-bizz.com.
  "website_page_view",
  "landing_view",
  "pricing_view",
  "cta_clicked",
]);

// Subset of PERSISTED_EVENTS that should also be saved when the visitor is
// anonymous (no logged-in user). user_id is stored as NULL on those rows.
const ANON_PERSISTED_EVENTS = new Set<AnalyticsEvent>([
  "website_page_view",
  "landing_view",
  "pricing_view",
  "cta_clicked",
  "auth_page_opened",
]);

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




// Read a PostHog feature flag synchronously (no React). Returns the variant
// string, true/false for booleans, or undefined while loading / when disabled.
export function getFeatureFlag(flagKey: string): boolean | string | undefined {
  if (!initialized) initAnalytics();
  if (!enabled) return undefined;
  try {
    return posthog.getFeatureFlag(flagKey) as boolean | string | undefined;
  } catch {
    return undefined;
  }
}

// Subscribe to PostHog feature-flag updates. Returns an unsubscribe function.
export function onFeatureFlagsLoaded(cb: () => void): () => void {
  if (!initialized) initAnalytics();
  if (!enabled) return () => {};
  try {
    const unsub = posthog.onFeatureFlags(cb);
    return () => {
      try { (unsub as unknown as () => void)?.(); } catch { /* noop */ }
    };
  } catch {
    return () => {};
  }
}

export function track(event: AnalyticsEvent, props: BaseEventProps = {}): void {
  if (!initialized) initAnalytics();
  const enriched: BaseEventProps = {
    device_type: deviceType(),
    source_page: typeof window !== "undefined" ? window.location.pathname : undefined,
    locale: typeof navigator !== "undefined" ? navigator.language : undefined,
    subscription_status: subscriptionStatus,
    environment,
    ...props,
  };
  recordDiagnostic(event, enriched);
  if (enabled) posthog.capture(event, enriched);
  // Persist key funnel events to Supabase so the admin dashboard can join with auth.users.
  if (PERSISTED_EVENTS.has(event)) {
    if (currentUserId || ANON_PERSISTED_EVENTS.has(event)) {
      persistEventToSupabase(event, enriched).catch(() => { /* swallow */ });
    }
  }
}

let currentUserId: string | null = null;

async function persistEventToSupabase(event: string, props: BaseEventProps): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const url = new URL(window.location.href);
    const sp = url.searchParams;
    let anonymousId: string | null = null;
    let sessionId: string | null = null;
    try {
      anonymousId = posthog.get_distinct_id?.() ?? null;
      sessionId = posthog.get_session_id?.() ?? null;
    } catch { /* noop */ }
    await (supabase.from("user_activity_events") as any).insert({
      user_id: currentUserId, // may be NULL for anonymous visits
      event_name: event,
      event_metadata: props as Record<string, unknown>,
      domain: url.hostname,
      path: url.pathname,
      device_type: deviceType(),
      browser: navigator.userAgent.split(") ").pop() ?? null,
      source: document.referrer ? new URL(document.referrer).hostname : "direct",
      referrer: document.referrer || null,
      utm_source: sp.get("utm_source"),
      utm_medium: sp.get("utm_medium"),
      utm_campaign: sp.get("utm_campaign"),
      utm_content: sp.get("utm_content"),
      utm_term: sp.get("utm_term"),
      anonymous_id: anonymousId,
      session_id: sessionId,
    });
  } catch { /* noop */ }
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
  currentUserId = userId || null;
  if (!enabled || !userId) return;
  // Alias the previously-anonymous distinct_id to this user so pre-signup
  // pageviews + funnel steps are stitched into the same person.
  try {
    const anonId = posthog.get_distinct_id?.();
    if (anonId && anonId !== userId) posthog.alias(userId, anonId);
  } catch { /* noop */ }
  posthog.identify(userId, {
    locale: traits.locale,
    currency: traits.currency,
  });
}

export function resetAnalytics(): void {
  currentUserId = null;
  if (!enabled) return;
  posthog.reset();
}

export function isAnalyticsEnabled(): boolean {
  return enabled;
}
