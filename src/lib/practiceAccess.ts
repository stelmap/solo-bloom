export const SUBSCRIPTION_OFFER = { solo: 12, pro: 24, trialDays: 14, clientLimit: null } as const;

export interface PracticeAccess {
  policy_version: number;
  plan_code: string;
  can_write: boolean;
  has_pro: boolean;
  client_limit: number | null;
  on_trial: boolean;
  trial_ends_at: string | null;
  legacy_grant?: boolean;
  legacy_until?: string | null;
  payment_grace_until?: string | null;
}

export function trialIsActive(start: string | null, now: number): boolean {
  if (!start) return false;
  const startMs = Date.parse(start);
  return now >= startMs && now < startMs + SUBSCRIPTION_OFFER.trialDays * 86400000;
}

import { featureForPath, PRO_ONLY_FEATURES } from './planFeatures';

export function requiredPlanForPath(path: string): 'solo' | 'pro' | null {
  const f = featureForPath(path);
  return f && (PRO_ONLY_FEATURES as readonly string[]).includes(f) ? 'pro' : null;
}
export const PAYMENT_GRACE_DAYS = 10;

/** Pages a blocked (no licence) account can still open. */
export function isLicenseExemptPath(path: string): boolean {
  return ['/plans', '/checkout', '/purchase-success', '/reset-password'].some((p) => path.startsWith(p));
}

export function needsLicense(access: Pick<PracticeAccess, 'plan_code'> | null | undefined, isAdmin: boolean): boolean {
  return !!access && access.plan_code === 'expired' && !isAdmin;
}
