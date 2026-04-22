// Centralized analytics helper (PostHog).
// All event tracking across the app must go through this module to keep
// event names, property shapes, and PII rules consistent.
//
// PII policy: NEVER pass email, full name, phone, notes, or payment details
// as event/user properties. Identify users by their internal Supabase user ID only.

import posthog from "posthog-js";

const POSTHOG_KEY = "phc_vfqFKQL2ZpD9oo4XRNgDAesH8ayrWvZF6DUTLyhGkjrn";
const POSTHOG_HOST = "https://eu.i.posthog.com";

// Production hostnames where analytics should run.
// Dev (localhost), Lovable preview, and id-preview subdomains are excluded.
const PROD_HOSTS = new Set<string>([
  "solo-bizz-app.lovable.app",
  "www.solo-bizz.com",
  "solo-bizz.com",
]);

let initialized = false;
let enabled = false;

function shouldEnable(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  // Only the published production hosts send analytics.
  return PROD_HOSTS.has(host);
}

export function initAnalytics(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  enabled = shouldEnable();
  if (!enabled) {
    // Dev / preview — skip init entirely. Calls to track/identify become no-ops.
    return;
  }
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
  | "sign_up_started"
  | "sign_up_completed"
  | "login_completed"
  | "password_reset_started"
  | "password_reset_completed"
  | "client_created"
  | "service_created"
  | "session_created"
  | "session_completed"
  | "expense_created"
  | "income_created"
  | "breakeven_viewed"
  | "checkout_started"
  | "checkout_completed"
  | "subscription_active"
  | "subscription_canceled";

export function track(event: AnalyticsEvent, props: BaseEventProps = {}): void {
  if (!initialized) initAnalytics();
  if (!enabled) return;
  const enriched: BaseEventProps = {
    device_type: deviceType(),
    source_page: typeof window !== "undefined" ? window.location.pathname : undefined,
    locale: typeof navigator !== "undefined" ? navigator.language : undefined,
    ...props,
  };
  posthog.capture(event, enriched);
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
