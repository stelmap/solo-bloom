import { describe, it, expect } from "vitest";
import {
  claimPaymentSlot,
  dedupeIncome,
  incomeDedupeKey,
  wouldDuplicateIncome,
  type IncomeLike,
} from "../incomeDedupe";

const base: IncomeLike = {
  id: "i1",
  user_id: "u1",
  appointment_id: "a1",
  amount: 100,
  date: "2026-04-16",
  status: "confirmed",
  is_demo: false,
};

describe("incomeDedupeKey — matches DB unique index shape", () => {
  it("produces the same key for equivalent rows regardless of id / amount formatting", () => {
    expect(incomeDedupeKey(base)).toBe(
      incomeDedupeKey({ ...base, id: "i2", amount: "100.00" }),
    );
  });

  it("returns null for rows not covered by the partial unique index", () => {
    expect(incomeDedupeKey({ ...base, status: "draft" })).toBeNull();
    expect(incomeDedupeKey({ ...base, is_demo: true })).toBeNull();
    expect(incomeDedupeKey({ ...base, appointment_id: null })).toBeNull();
    expect(incomeDedupeKey({ ...base, amount: "not-a-number" })).toBeNull();
  });

  it("differentiates by user, appointment, amount, and date", () => {
    const k = incomeDedupeKey(base);
    expect(incomeDedupeKey({ ...base, user_id: "u2" })).not.toBe(k);
    expect(incomeDedupeKey({ ...base, appointment_id: "a2" })).not.toBe(k);
    expect(incomeDedupeKey({ ...base, amount: 101 })).not.toBe(k);
    expect(incomeDedupeKey({ ...base, date: "2026-04-17" })).not.toBe(k);
  });
});

describe("dedupeIncome — regression: seeder output must be duplicate-free", () => {
  it("collapses identical rows to a single occurrence", () => {
    const rows: IncomeLike[] = [
      base,
      { ...base, id: "i2" },
      { ...base, id: "i3", amount: "100.00" },
      { ...base, id: "i4", date: "2026-04-17" },
    ];
    const out = dedupeIncome(rows);
    expect(out.map((r) => r.id)).toEqual(["i1", "i4"]);
  });

  it("simulates seeder output: 5x duplicated confirmed row + demo rows are handled correctly", () => {
    // Historical bug: seeder copied 5 duplicates of the same income into every
    // demo account. Rebuilt output must contain each (user, appointment, amount,
    // date) at most once for confirmed non-demo rows.
    const seeded: IncomeLike[] = [
      ...Array.from({ length: 5 }, (_, i) => ({ ...base, id: `dup-${i}` })),
      { ...base, id: "unique-1", appointment_id: "a2" },
      { ...base, id: "unique-2", date: "2026-04-17" },
      // Demo rows are outside the index — must survive dedupe as-is.
      { ...base, id: "demo-1", is_demo: true },
      { ...base, id: "demo-2", is_demo: true },
    ];
    const out = dedupeIncome(seeded);
    const confirmed = out.filter((r) => r.status === "confirmed" && !r.is_demo);
    const keys = new Set(confirmed.map((r) => incomeDedupeKey(r)));
    expect(keys.size).toBe(confirmed.length); // no duplicates by canonical key
    expect(out.filter((r) => r.is_demo).length).toBe(2); // demo rows preserved
  });
});

describe("claimPaymentSlot — regression: double-click on Confirm payment", () => {
  it("allows the first click and rejects the immediate second click", () => {
    const inFlight = new Set<string>();
    expect(claimPaymentSlot(inFlight, base)).toBe(true);
    expect(claimPaymentSlot(inFlight, base)).toBe(false);
    expect(claimPaymentSlot(inFlight, { ...base, id: "different-id" })).toBe(false);
  });

  it("allows a different payment (different appointment) through", () => {
    const inFlight = new Set<string>();
    expect(claimPaymentSlot(inFlight, base)).toBe(true);
    expect(claimPaymentSlot(inFlight, { ...base, appointment_id: "a2" })).toBe(true);
  });

  it("never blocks rows outside the unique index (drafts, demo, no appointment)", () => {
    const inFlight = new Set<string>();
    const draft = { ...base, status: "draft" };
    expect(claimPaymentSlot(inFlight, draft)).toBe(true);
    expect(claimPaymentSlot(inFlight, draft)).toBe(true);
  });

  it("wouldDuplicateIncome detects a candidate that already exists locally", () => {
    expect(wouldDuplicateIncome([base], { ...base, id: "new" })).toBe(true);
    expect(wouldDuplicateIncome([base], { ...base, id: "new", amount: 200 })).toBe(false);
  });
});
