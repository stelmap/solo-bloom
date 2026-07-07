import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import en from "@/i18n/locales/en";

/**
 * Regression guard: pricing card copy on the public Landing page must stay in
 * sync with the in-app /plans page (i18n keys). If either side drifts, this
 * test fails and points at the exact key mismatch.
 *
 * Source of truth for marketing copy: LANDING_COPY (`const C`) in
 * src/pages/LandingPage.tsx. App-side mirror: src/i18n/locales/en.ts.
 */

const landingSrc = readFileSync(
  resolve(__dirname, "../pages/LandingPage.tsx"),
  "utf8",
);

/** Extract the `en:` value of a copy key from LandingPage.tsx LANDING_COPY. */
function landingEn(key: string): string {
  // Matches:  freeF1: { en: "Up to 5 active clients", ...
  // Or multi-line:  freeDesc: {\n    en: "...",
  const re = new RegExp(
    `\\b${key}\\s*:\\s*\\{[^}]*?\\ben\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`,
    "s",
  );
  const m = landingSrc.match(re);
  if (!m) throw new Error(`Landing copy key not found: ${key}`);
  // Unescape \" and \\
  return m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

const i18n = en as Record<string, string>;

const PAIRS: Array<[landingKey: string, i18nKey: string]> = [
  // Plan descriptions
  ["soloDesc", "plans.soloDesc"],
  ["proDesc", "plans.proDesc"],
  // "All SoloBizz features included." intro
  ["soloIntro", "plans.allIncludedIntro"],
  ["proIntro", "plans.allIncludedIntro"],
  // Free Starter bullets reused on /plans
  ["freeF1", "plans.bulletClientsFree"],
  ["freeF3", "plans.bulletCoreModules"],
  ["freeF4", "plans.bulletAnalytics"],
  // Solo Practice bullets
  ["soloF1", "plans.bulletClientsSolo"],
  ["soloF3", "plans.bulletCoreModules"],
  ["soloF4", "plans.bulletAnalytics"],
  ["soloF5", "plans.bulletCancelAnytime"],
  // Pro Practice bullets
  ["proF1", "plans.bulletClientsPro"],
  ["proF3", "plans.bulletPrioritySupport"],
  ["proF4", "plans.bulletCustomOnboarding"],
  ["proF5", "plans.bulletScalingTeams"],
];

describe("pricing copy alignment: Landing ↔ /plans", () => {
  it.each(PAIRS)(
    "Landing %s matches i18n %s (en)",
    (landingKey, i18nKey) => {
      const landingValue = landingEn(landingKey);
      const i18nValue = i18n[i18nKey];
      expect(i18nValue, `missing i18n key: ${i18nKey}`).toBeDefined();
      expect(i18nValue).toBe(landingValue);
    },
  );

  it("every plan card on /plans has a matching Landing bullet", () => {
    // Sanity: all referenced i18n keys exist
    for (const [, k] of PAIRS) {
      expect(i18n[k], `missing i18n key: ${k}`).toBeTruthy();
    }
  });
});
