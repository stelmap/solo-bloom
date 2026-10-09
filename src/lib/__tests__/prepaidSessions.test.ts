import { describe, it, expect } from "vitest";
import { summarizePrepaid, prepaidStatus, type PrepaidLedgerRow } from "../prepaidSessions";

const row = (kind: "topup" | "use", sessions: number, reversed = false): PrepaidLedgerRow => ({
  id: Math.random().toString(), client_id: "c1", kind, sessions, amount: 0,
  appointment_id: null, income_id: null, reversed_at: reversed ? "2026-01-01" : null, created_at: "2026-01-01",
});
const uses = (n: number) => Array.from({ length: n }, () => row("use", 1));

describe("prepaid sessions", () => {
  it("10 paid, 8 completed → 2 left, running out", () => {
    const s = summarizePrepaid([row("topup", 10), ...uses(8)]).get("c1")!;
    expect(s.balance).toBe(2);
    expect(s.status).toBe("low");
  });
  it("10 paid, 10 completed → 0 left, used up", () => {
    const s = summarizePrepaid([row("topup", 10), ...uses(10)]).get("c1")!;
    expect(s.balance).toBe(0);
    expect(s.status).toBe("empty");
  });
  it("new 10-session payment after using up → 10 left, no warning", () => {
    const s = summarizePrepaid([row("topup", 10), ...uses(10), row("topup", 10)]).get("c1")!;
    expect(s.balance).toBe(10);
    expect(s.status).toBe("ok");
  });
  it("a returned session is added back", () => {
    const s = summarizePrepaid([row("topup", 3), row("use", 1, true)]).get("c1")!;
    expect(s.balance).toBe(3);
  });
  it("a client with no prepayment is never 'used up'", () => {
    expect(prepaidStatus(0, false)).toBe("none");
  });
});
