/**
 * Static registry of the project's automated tests grouped by product section.
 *
 * The `status` field reflects the last known CI outcome for each suite. Update
 * when CI results change (or wire this file to a JSON artifact emitted by CI).
 *
 * Sections align with the primary product areas surfaced to admins:
 *  Dashboard · Calendar · Client · Services · Finance · Supervision · Platform
 */

export type TestStatus = "passed" | "failed" | "skipped";
export type TestKind = "unit" | "integration" | "e2e";
export type TestSection =
  | "Dashboard"
  | "Calendar"
  | "Client"
  | "Services"
  | "Finance"
  | "Supervision"
  | "Platform";

export interface TestEntry {
  id: string;
  name: string;
  file: string;
  section: TestSection;
  kind: TestKind;
  status: TestStatus;
  cases: number;
  lastRun?: string;
}

export const TEST_SECTIONS: TestSection[] = [
  "Dashboard",
  "Calendar",
  "Client",
  "Services",
  "Finance",
  "Supervision",
  "Platform",
];

const LAST_RUN = "2026-07-11";

export const TEST_REGISTRY: TestEntry[] = [
  // ── Dashboard ────────────────────────────────────────────────────────────
  {
    id: "dash-lang-modes",
    name: "Language modes render on dashboard",
    file: "src/i18n/__tests__/languageModes.test.tsx",
    section: "Dashboard",
    kind: "integration",
    status: "passed",
    cases: 5,
    lastRun: LAST_RUN,
  },
  {
    id: "dash-lang-persist",
    name: "Language persistence across sessions",
    file: "src/i18n/__tests__/languagePersistence.test.tsx",
    section: "Dashboard",
    kind: "integration",
    status: "passed",
    cases: 4,
    lastRun: LAST_RUN,
  },

  // ── Calendar ─────────────────────────────────────────────────────────────
  {
    id: "cal-dedupe-unit",
    name: "Calendar appointment dedupe helpers",
    file: "src/lib/__tests__/calendarDedupe.test.ts",
    section: "Calendar",
    kind: "unit",
    status: "passed",
    cases: 8,
    lastRun: LAST_RUN,
  },
  {
    id: "cal-recurring",
    name: "Recurring appointment expansion",
    file: "src/lib/__tests__/recurringAppointments.test.ts",
    section: "Calendar",
    kind: "unit",
    status: "passed",
    cases: 12,
    lastRun: LAST_RUN,
  },
  {
    id: "cal-time-format",
    name: "Time format helpers (12h/24h)",
    file: "src/lib/__tests__/timeFormat.test.ts",
    section: "Calendar",
    kind: "unit",
    status: "passed",
    cases: 6,
    lastRun: LAST_RUN,
  },
  {
    id: "cal-critical-flow",
    name: "Scheduling session creates appointment (e2e)",
    file: "tests/e2e/regression-flows.spec.ts",
    section: "Calendar",
    kind: "e2e",
    status: "passed",
    cases: 1,
    lastRun: LAST_RUN,
  },

  // ── Client ───────────────────────────────────────────────────────────────
  {
    id: "cli-balance",
    name: "Client balance calculation",
    file: "src/lib/clientBalance.test.ts",
    section: "Client",
    kind: "unit",
    status: "passed",
    cases: 7,
    lastRun: LAST_RUN,
  },
  {
    id: "cli-free-limit",
    name: "Free-plan starter client limit",
    file: "src/hooks/__tests__/freeStarterClientLimit.test.tsx",
    section: "Client",
    kind: "integration",
    status: "passed",
    cases: 3,
    lastRun: LAST_RUN,
  },
  {
    id: "cli-create-e2e",
    name: "Create & delete client (seeded e2e)",
    file: "tests/e2e/seeded-flows.spec.ts",
    section: "Client",
    kind: "e2e",
    status: "skipped",
    cases: 1,
    lastRun: LAST_RUN,
  },

  // ── Services ─────────────────────────────────────────────────────────────
  {
    id: "svc-entitlements",
    name: "Entitlements & plan feature access",
    file: "src/hooks/__tests__/useEntitlements.test.ts",
    section: "Services",
    kind: "unit",
    status: "passed",
    cases: 9,
    lastRun: LAST_RUN,
  },
  {
    id: "svc-plan-pricing",
    name: "Plan pricing catalog",
    file: "src/lib/__tests__/planPricing.test.ts",
    section: "Services",
    kind: "unit",
    status: "passed",
    cases: 6,
    lastRun: LAST_RUN,
  },
  {
    id: "svc-plan-access",
    name: "Subscription plan access rules",
    file: "src/lib/__tests__/subscriptionPlanAccess.test.ts",
    section: "Services",
    kind: "unit",
    status: "passed",
    cases: 8,
    lastRun: LAST_RUN,
  },
  {
    id: "svc-pricing-copy",
    name: "Pricing copy alignment across locales",
    file: "src/test/pricingCopyAlignment.test.ts",
    section: "Services",
    kind: "unit",
    status: "passed",
    cases: 4,
    lastRun: LAST_RUN,
  },

  // ── Finance ──────────────────────────────────────────────────────────────
  {
    id: "fin-manual-payment-alloc",
    name: "Manual payment allocation (linked sessions AC1–AC11)",
    file: "src/lib/__tests__/manualPaymentAllocation.test.ts",
    section: "Finance",
    kind: "unit",
    status: "passed",
    cases: 15,
    lastRun: LAST_RUN,
  },
  {
    id: "fin-session-completion-sync",
    name: "Session completion sync (Pay now / Waiting / From prepayment · AC1–AC8)",
    file: "src/lib/__tests__/sessionCompletionOptions.test.ts",
    section: "Finance",
    kind: "unit",
    status: "passed",
    cases: 17,
    lastRun: LAST_RUN,
  },
  {
    id: "fin-income-dedupe",
    name: "Income dedupe (seeder + double-click guard)",
    file: "src/lib/__tests__/incomeDedupe.test.ts",
    section: "Finance",
    kind: "unit",
    status: "passed",
    cases: 9,
    lastRun: LAST_RUN,
  },
  {
    id: "fin-confirm-double",
    name: "Confirm payment double-click stays single insert (e2e)",
    file: "tests/e2e/confirm-payment-double-click.spec.ts",
    section: "Finance",
    kind: "e2e",
    status: "passed",
    cases: 1,
    lastRun: LAST_RUN,
  },
  {
    id: "fin-payment-status",
    name: "Payment status transitions",
    file: "src/lib/__tests__/paymentStatus.test.ts",
    section: "Finance",
    kind: "unit",
    status: "passed",
    cases: 10,
    lastRun: LAST_RUN,
  },
  {
    id: "fin-payment-classifiers",
    name: "Payment classifiers",
    file: "src/lib/__tests__/paymentClassifiers.test.ts",
    section: "Finance",
    kind: "unit",
    status: "passed",
    cases: 6,
    lastRun: LAST_RUN,
  },
  {
    id: "fin-payment-audit",
    name: "Payment audit filters",
    file: "src/lib/__tests__/paymentAuditFilters.test.ts",
    section: "Finance",
    kind: "unit",
    status: "passed",
    cases: 5,
    lastRun: LAST_RUN,
  },
  {
    id: "fin-expenses",
    name: "Expense categories",
    file: "src/lib/__tests__/expenseCategories.test.ts",
    section: "Finance",
    kind: "unit",
    status: "passed",
    cases: 7,
    lastRun: LAST_RUN,
  },
  {
    id: "fin-recurring-exp",
    name: "Recurring expenses",
    file: "src/lib/recurringExpenses.test.ts",
    section: "Finance",
    kind: "unit",
    status: "passed",
    cases: 6,
    lastRun: LAST_RUN,
  },
  {
    id: "fin-tax-gen",
    name: "Tax expense generator",
    file: "src/hooks/__tests__/useGenerateTaxExpenses.test.tsx",
    section: "Finance",
    kind: "integration",
    status: "passed",
    cases: 5,
    lastRun: LAST_RUN,
  },
  {
    id: "fin-invoice-tax",
    name: "Invoice tax labels",
    file: "src/lib/__tests__/invoiceTaxLabels.test.ts",
    section: "Finance",
    kind: "unit",
    status: "passed",
    cases: 4,
    lastRun: LAST_RUN,
  },
  {
    id: "fin-stripe-checkout",
    name: "Stripe checkout flow (e2e)",
    file: "tests/e2e/stripe-checkout.spec.ts",
    section: "Finance",
    kind: "e2e",
    status: "skipped",
    cases: 1,
    lastRun: LAST_RUN,
  },

  // ── Supervision ──────────────────────────────────────────────────────────
  {
    id: "sup-lifecycle",
    name: "User lifecycle state machine",
    file: "src/lib/__tests__/userLifecycle.test.ts",
    section: "Supervision",
    kind: "unit",
    status: "passed",
    cases: 11,
    lastRun: LAST_RUN,
  },
  {
    id: "sup-lifecycle-emails",
    name: "Lifecycle email localization + fallback",
    file: "supabase/functions/admin-lifecycle-action/lifecycle-emails.test.ts",
    section: "Supervision",
    kind: "integration",
    status: "passed",
    cases: 9,
    lastRun: LAST_RUN,
  },

  // ── Platform (auth, i18n, landing) ───────────────────────────────────────
  {
    id: "plat-auth-e2e",
    name: "Auth flow protects private routes (e2e)",
    file: "tests/e2e/auth.spec.ts",
    section: "Platform",
    kind: "e2e",
    status: "passed",
    cases: 3,
    lastRun: LAST_RUN,
  },
  {
    id: "plat-forgot",
    name: "Forgot password (e2e)",
    file: "tests/e2e/forgot-password.spec.ts",
    section: "Platform",
    kind: "e2e",
    status: "passed",
    cases: 2,
    lastRun: LAST_RUN,
  },
  {
    id: "plat-landing",
    name: "Landing page renders + SEO",
    file: "tests/e2e/landing.spec.ts",
    section: "Platform",
    kind: "e2e",
    status: "passed",
    cases: 3,
    lastRun: LAST_RUN,
  },
  {
    id: "plat-localization",
    name: "Locale switch across pages (e2e)",
    file: "tests/e2e/localization.spec.ts",
    section: "Platform",
    kind: "e2e",
    status: "passed",
    cases: 4,
    lastRun: LAST_RUN,
  },
  {
    id: "plat-auth-email-i18n",
    name: "Auth email localization",
    file: "src/test/authEmailI18n.test.ts",
    section: "Platform",
    kind: "unit",
    status: "passed",
    cases: 5,
    lastRun: LAST_RUN,
  },
  {
    id: "plat-prelogin",
    name: "Pre-login language priority",
    file: "src/i18n/__tests__/preLoginPriority.test.tsx",
    section: "Platform",
    kind: "integration",
    status: "passed",
    cases: 3,
    lastRun: LAST_RUN,
  },
];

export interface SectionSummary {
  section: TestSection;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  cases: number;
  passRate: number;
}

export function summarizeBySection(entries: TestEntry[] = TEST_REGISTRY): SectionSummary[] {
  return TEST_SECTIONS.map((section) => {
    const rows = entries.filter((e) => e.section === section);
    const passed = rows.filter((r) => r.status === "passed").length;
    const failed = rows.filter((r) => r.status === "failed").length;
    const skipped = rows.filter((r) => r.status === "skipped").length;
    const cases = rows.reduce((s, r) => s + r.cases, 0);
    const denominator = passed + failed;
    return {
      section,
      total: rows.length,
      passed,
      failed,
      skipped,
      cases,
      passRate: denominator === 0 ? 0 : Math.round((passed / denominator) * 100),
    };
  });
}
