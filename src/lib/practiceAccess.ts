export const SUBSCRIPTION_OFFER = { solo: 12, pro: 24, trialDays: 14, clientLimit: null } as const;

export interface PracticeAccess {
  policy_version: number;
  plan_code: string;
  can_write: boolean;
  has_pro: boolean;
  client_limit: number | null;
  on_trial: boolean;
  trial_ends_at: string | null;
}

export function trialIsActive(start: string | null, now: number): boolean {
  if (!start) return false;
  const startMs = Date.parse(start);
  return now >= startMs && now < startMs + SUBSCRIPTION_OFFER.trialDays * 86400000;
}

export function requiredPlanForPath(path: string): 'solo' | 'pro' | null {
  if (path.startsWith('/finances') || path.startsWith('/groups') || path === '/supervision') return 'pro';
  return null;
}