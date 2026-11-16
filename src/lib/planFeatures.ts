/**
 * Single source of truth for what each plan includes.
 * PRO = SOLO + Pro features. Billing period never changes the package.
 */
export type PlanTier = "solo" | "pro";

export const SOLO_FEATURES = [
  "dashboard", "calendar", "appointments", "online_booking", "clients",
  "services", "payments", "practice_management", "public_profile",
] as const;
export const PRO_ONLY_FEATURES = ["finances", "groups", "supervisions"] as const;

export type Feature = (typeof SOLO_FEATURES)[number] | (typeof PRO_ONLY_FEATURES)[number];

export const PLAN_FEATURES: Record<PlanTier, ReadonlySet<Feature>> = {
  solo: new Set<Feature>(SOLO_FEATURES),
  pro: new Set<Feature>([...SOLO_FEATURES, ...PRO_ONLY_FEATURES]),
};

/** Minimal shape of the server access state (get_my_practice_access). */
export interface AccessLike { has_pro: boolean; can_write: boolean }

export function hasFeature(access: AccessLike | null | undefined, feature: Feature): boolean {
  if (!access) return false;
  return PLAN_FEATURES[access.has_pro ? "pro" : "solo"].has(feature);
}

/** Pro-only feature behind an app page, or null when Solo covers it. */
export function featureForPath(path: string): Feature | null {
  if (path.startsWith("/finances")) return "finances";
  if (path.startsWith("/groups")) return "groups";
  if (path.startsWith("/supervision")) return "supervisions";
  return null;
}
