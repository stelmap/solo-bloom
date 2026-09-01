// ─────────────────────────────────────────────────────────────────────────────
// Landing-page campaign plumbing for "Support Ukrainian Psychotherapists".
//
// Holds the campaign *configuration* (never hardcoded in the UI), the promo-bar
// dismissal window and the offer reference that survives registration/login.
// Actual eligibility and the Stripe coupon are always re-validated server-side
// in the `create-checkout` edge function — nothing here changes real prices.
// ─────────────────────────────────────────────────────────────────────────────

import { SUPPORT_UA_PROMO_CODE, SUPPORT_UA_DISCOUNT_PERCENT, storePromoCode } from "@/lib/supportUkraine";

/** How long the discount applies once redeemed. Configuration, not UI copy. */
export type CampaignDuration =
  | { type: "once" }
  | { type: "repeating"; months: number }
  | { type: "forever" };

export interface CampaignConfig {
  id: string;
  promoCode: string;
  discountPercent: number;
  duration: CampaignDuration;
  /** ISO date after which the campaign is no longer offered. Null = open ended. */
  endsAt: string | null;
  /** Plans the campaign can be redeemed on. */
  planCodes: readonly string[];
}

export const SUPPORT_UA_CAMPAIGN: CampaignConfig = {
  id: "support_ua_psychotherapy_50",
  promoCode: SUPPORT_UA_PROMO_CODE,
  discountPercent: SUPPORT_UA_DISCOUNT_PERCENT,
  duration: { type: "forever" },
  endsAt: null,
  planCodes: ["solo", "pro"],
};

export function isCampaignActive(now: Date = new Date()): boolean {
  if (!SUPPORT_UA_CAMPAIGN.endsAt) return true;
  return now.getTime() < new Date(SUPPORT_UA_CAMPAIGN.endsAt).getTime();
}

// ── Promo bar dismissal (7 days) ─────────────────────────────────────────────

const PROMO_BAR_KEY = "solobizz.promo_bar_dismissed_until";
export const PROMO_BAR_DISMISS_DAYS = 7;

export function isPromoBarDismissed(now: number = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(PROMO_BAR_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && until > now;
  } catch {
    return false;
  }
}

export function dismissPromoBar(now: number = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROMO_BAR_KEY, String(now + PROMO_BAR_DISMISS_DAYS * 24 * 60 * 60 * 1000));
  } catch {
    /* storage unavailable — ignore */
  }
}

// ── Offer reference carried through registration / login / checkout ──────────

const OFFER_KEY = "solobizz.pending_offer";

export interface PendingOffer {
  campaign: string;
  /** Reference only — the server re-derives the actual coupon. */
  promoCode: string;
  planCode?: string | null;
  createdAt: number;
}

export function storePendingOffer(planCode?: string | null): PendingOffer | null {
  if (typeof window === "undefined") return null;
  const offer: PendingOffer = {
    campaign: SUPPORT_UA_CAMPAIGN.id,
    promoCode: SUPPORT_UA_CAMPAIGN.promoCode,
    planCode: planCode ?? null,
    createdAt: Date.now(),
  };
  try {
    window.sessionStorage.setItem(OFFER_KEY, JSON.stringify(offer));
  } catch {
    /* ignore */
  }
  // Also persist the promo code so eligibility survives a full page reload.
  storePromoCode(SUPPORT_UA_CAMPAIGN.promoCode);
  return offer;
}

export function readPendingOffer(): PendingOffer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(OFFER_KEY);
    return raw ? (JSON.parse(raw) as PendingOffer) : null;
  } catch {
    return null;
  }
}

export function clearPendingOffer(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(OFFER_KEY);
  } catch {
    /* ignore */
  }
}

// ── Route helpers ────────────────────────────────────────────────────────────

/**
 * Auth URL that preserves returnTo, the selected offer and the selected plan.
 * After sign-in the user lands on plan selection with the campaign intact.
 */
export function authUrlForOffer(opts: { planCode?: string | null; signup?: boolean; returnTo?: string } = {}): string {
  const params = new URLSearchParams();
  if (opts.signup !== false) params.set("mode", "signup");
  if (opts.planCode) params.set("plan", opts.planCode);
  params.set("offer", SUPPORT_UA_CAMPAIGN.id);
  params.set("returnTo", opts.returnTo ?? "/plans");
  return `/auth?${params.toString()}`;
}

// ── Analytics helpers ────────────────────────────────────────────────────────

export function viewportCategory(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function utmProps(): Record<string, string | null> {
  if (typeof window === "undefined") return {};
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get("utm_source"),
      utm_medium: p.get("utm_medium"),
      utm_campaign: p.get("utm_campaign"),
    };
  } catch {
    return {};
  }
}

export function landingEventProps(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    campaign: SUPPORT_UA_CAMPAIGN.id,
    viewport: viewportCategory(),
    ...utmProps(),
    ...extra,
  };
}
