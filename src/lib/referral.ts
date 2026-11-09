import { supabase } from "@/integrations/supabase/client";

const KEY = "solo_ref";
const ATTRIBUTION_DAYS = 30;

/** First valid referral link within the attribution window wins. */
export function captureReferralFromUrl(href: string = window.location.href, now = Date.now()) {
  try {
    const code = new URL(href).searchParams.get("ref");
    if (!code || !/^[a-z0-9]{4,32}$/i.test(code)) return;
    const prev = readStoredReferral(now);
    if (prev) return;
    localStorage.setItem(KEY, JSON.stringify({ code: code.toLowerCase(), at: now }));
  } catch { /* storage unavailable */ }
}

export function readStoredReferral(now = Date.now()): { code: string; at: number } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v?.code || now - Number(v.at) > ATTRIBUTION_DAYS * 86400000) {
      localStorage.removeItem(KEY);
      return null;
    }
    return v;
  } catch { return null; }
}

/** Server validates the code, account age, self-referral and duplicates. */
export async function claimStoredReferral() {
  const v = readStoredReferral();
  if (!v) return;
  const { data, error } = await supabase.rpc("claim_referral", { p_code: v.code, p_opened_at: new Date(v.at).toISOString() });
  if (!error) { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
  return data;
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Mirrors record_referral_payment: commission on the part of the service period inside the reward window. */
export function calcCommission(opts: {
  netAmount: number; percent: number; rewardStart: Date; rewardEnd: Date;
  paidAt: Date; periodStart?: Date; periodEnd?: Date;
}) {
  const { netAmount, percent, rewardStart, rewardEnd, paidAt, periodStart, periodEnd } = opts;
  if (netAmount <= 0) return 0;
  let fraction = 1;
  if (periodStart && periodEnd && periodEnd > periodStart) {
    const overlap = Math.min(+periodEnd, +rewardEnd) - Math.max(+periodStart, +rewardStart);
    fraction = Math.min(Math.max(overlap, 0) / (+periodEnd - +periodStart), 1);
  } else if (paidAt < rewardStart || paidAt >= rewardEnd) {
    fraction = 0;
  }
  return round2((round2(netAmount * fraction) * percent) / 100);
}

/** Mirrors _referral_balances: rewards first cover own subscription, surplus is withdrawable. */
export function splitBalance(opts: { balance: number; ownPrice: number; creditThisPeriod?: number }) {
  const { balance, ownPrice, creditThisPeriod = 0 } = opts;
  const need = Math.max(ownPrice - creditThisPeriod, 0);
  const covered = Math.min(ownPrice, creditThisPeriod + Math.min(balance, need));
  return { covered: round2(covered), remaining: round2(Math.max(ownPrice - covered, 0)), withdrawable: round2(Math.max(balance - need, 0)) };
}
