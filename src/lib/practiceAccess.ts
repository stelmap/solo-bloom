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