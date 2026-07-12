/**
 * Regression: paying a session from an existing prepayment must NEVER
 *   - create an Expected Payment row, or
 *   - increase overall Confirmed Income beyond the amount already booked
 *     when the prepayment itself was recorded.
 *
 * Spec reference: "Синхронізація оплат, передоплат, балансів клієнта та
 * статусів сесій" — AC3 (from_prepayment) and AC8 (paid_in_advance removed).
 */

import { describe, it, expect } from "vitest";
import {
  completionOptionsFor,
  financialEffectsFor,
  shouldCreateExpectedPayment,
  nextPaymentStatus,
  prepaymentPreview,
  type CompletionMode,
  type FinancialEffect,
} from "../sessionCompletionOptions";

/**
 * Simulates the finance ledger for a single client. Prepayment is recorded
 * once as confirmed income (the up-front payment). Later session completions
 * that draw from that prepayment write a €0 income row for traceability and
 * MUST NOT add to the confirmed revenue total.
 */
interface LedgerRow {
  amount: number;
  source: "prepayment_deposit" | "session_payment" | "paid_from_prepayment";
}
interface Ledger {
  confirmedIncome: LedgerRow[];
  expectedPayments: { amount: number }[];
  prepaidBalance: number;
}

function recordPrepaymentDeposit(ledger: Ledger, amount: number) {
  ledger.confirmedIncome.push({ amount, source: "prepayment_deposit" });
  ledger.prepaidBalance += amount;
}

function applyEffects(ledger: Ledger, effects: FinancialEffect[]) {
  for (const eff of effects) {
    switch (eff.kind) {
      case "confirmed_income":
        ledger.confirmedIncome.push({
          amount: eff.amount,
          source: "session_payment",
        });
        break;
      case "confirmed_income_zero":
        ledger.confirmedIncome.push({
          amount: 0,
          source: "paid_from_prepayment",
        });
        break;
      case "expected_payment":
        ledger.expectedPayments.push({ amount: eff.amount });
        break;
      case "prepayment_deduction":
        ledger.prepaidBalance = Math.max(0, ledger.prepaidBalance - eff.amount);
        break;
    }
  }
}

const totalIncome = (l: Ledger) =>
  l.confirmedIncome.reduce((sum, r) => sum + r.amount, 0);

describe("Regression: session paid from prepayment", () => {
  it("never emits an expected_payment effect for from_prepayment", () => {
    const effects = financialEffectsFor("from_prepayment", {
      price: 80,
      prepaidBalance: 400,
    });
    expect(effects.some((e) => e.kind === "expected_payment")).toBe(false);
    expect(shouldCreateExpectedPayment("from_prepayment")).toBe(false);
  });

  it("emits €0 confirmed income + prepayment_deduction, no positive income", () => {
    const effects = financialEffectsFor("from_prepayment", {
      price: 120,
      prepaidBalance: 500,
    });
    const positiveIncome = effects.filter(
      (e) => e.kind === "confirmed_income" && e.amount > 0,
    );
    expect(positiveIncome).toHaveLength(0);

    const zeroIncome = effects.find((e) => e.kind === "confirmed_income_zero");
    const deduction = effects.find((e) => e.kind === "prepayment_deduction");
    expect(zeroIncome).toBeDefined();
    expect(deduction).toMatchObject({
      kind: "prepayment_deduction",
      amount: 120,
      from_prepayment: true,
    });
  });

  it("keeps confirmed income equal to the original prepayment after N sessions", () => {
    const PREPAID = 400;
    const PRICE = 80;
    const ledger: Ledger = {
      confirmedIncome: [],
      expectedPayments: [],
      prepaidBalance: 0,
    };

    // Client pays 400 upfront → booked as confirmed income once.
    recordPrepaymentDeposit(ledger, PREPAID);
    expect(totalIncome(ledger)).toBe(PREPAID);

    // Complete 5 sessions of 80 each from that prepayment.
    for (let i = 0; i < 5; i++) {
      const effects = financialEffectsFor("from_prepayment", {
        price: PRICE,
        prepaidBalance: ledger.prepaidBalance,
      });
      applyEffects(ledger, effects);
    }

    // Regression assertions:
    expect(ledger.expectedPayments).toHaveLength(0);
    expect(totalIncome(ledger)).toBe(PREPAID); // NOT 400 + 5*80
    expect(ledger.prepaidBalance).toBe(0);

    // Traceability: five €0 income rows exist for audit.
    const zeroRows = ledger.confirmedIncome.filter(
      (r) => r.source === "paid_from_prepayment",
    );
    expect(zeroRows).toHaveLength(5);
    expect(zeroRows.every((r) => r.amount === 0)).toBe(true);
  });

  it("mixed flow: prepayment then pay_now increases income only by pay_now amount", () => {
    const ledger: Ledger = {
      confirmedIncome: [],
      expectedPayments: [],
      prepaidBalance: 0,
    };
    recordPrepaymentDeposit(ledger, 200); // income = 200

    // Two prepaid sessions
    for (let i = 0; i < 2; i++) {
      applyEffects(
        ledger,
        financialEffectsFor("from_prepayment", {
          price: 100,
          prepaidBalance: ledger.prepaidBalance,
        }),
      );
    }
    expect(totalIncome(ledger)).toBe(200);
    expect(ledger.prepaidBalance).toBe(0);

    // Third session paid live
    applyEffects(
      ledger,
      financialEffectsFor("pay_now", { price: 100, prepaidBalance: 0 }),
    );
    expect(totalIncome(ledger)).toBe(300);
    expect(ledger.expectedPayments).toHaveLength(0);
  });

  it("does not offer paid_in_advance option when prepayment covers session", () => {
    const options = completionOptionsFor({ price: 80, prepaidBalance: 400 });
    const modes = options.map((o) => o.mode as string);
    expect(modes).not.toContain("paid_in_advance");
    expect(modes).toContain("from_prepayment");
    // from_prepayment must be the default when balance covers price.
    expect(options.find((o) => o.mode === "from_prepayment")?.primary).toBe(
      true,
    );
  });

  it("nextPaymentStatus for from_prepayment is paid_from_prepayment (not waiting)", () => {
    const status = nextPaymentStatus("from_prepayment" as CompletionMode);
    expect(status).toBe("paid_from_prepayment");
    expect(status).not.toBe("waiting_for_payment");
  });

  it("prepayment preview never shows positive remaining income impact", () => {
    const preview = prepaymentPreview({ prepaidBalance: 400, price: 80 });
    expect(preview.amountToDeduct).toBe(80);
    expect(preview.prepaymentRemainingAfter).toBe(320);
    expect(preview.approxSessionsCovered).toBe(5);
  });

  it("guards against insufficient prepayment (throws, no side-effects computed)", () => {
    expect(() =>
      financialEffectsFor("from_prepayment", {
        price: 150,
        prepaidBalance: 100,
      }),
    ).toThrow(/insufficient_prepayment/);
  });
});
