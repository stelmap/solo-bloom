import { describe, it, expect } from "vitest";
import { normalizeForm, removeField, moveField, validateForm, groupFinance, uniqueConfirmedParticipants } from "./groupForm";

const d = { name: "Name", email: "Email" };
describe("registration form", () => {
  it("always has required Name and Email first", () => {
    const f = normalizeForm({ fields: [{ id: "x", label: "Tg", type: "short", required: false }, { id: "email", label: "Пошта", type: "long", required: false }] }, d);
    expect(f.fields.map((x) => x.id)).toEqual(["name", "email", "x"]);
    expect(f.fields[1]).toMatchObject({ label: "Пошта", type: "short", required: true });
  });
  it("cannot remove Name or Email", () => {
    const f = normalizeForm(null, d);
    expect(removeField(f, "email").fields).toHaveLength(2);
  });
  it("cannot move a field above system fields", () => {
    const f = normalizeForm({ fields: [{ id: "x", label: "A", type: "short", required: false }] }, d);
    expect(moveField(f, "x", -1).fields[2].id).toBe("x");
  });
  it("dropdown needs at least two options", () => {
    const f = normalizeForm({ fields: [{ id: "x", label: "A", type: "dropdown", required: true, options: ["one"] }] }, d);
    expect(validateForm(f)).toEqual([{ id: "x", code: "options" }]);
  });
});

describe("group finances", () => {
  const base = { client_id: "c1", client_name: "Ann", billing_rule_applied: true, expected_status: null, appointment_status: "completed", scheduled_at: "2026-11-01" };
  it("splits charged, received and outstanding without double counting", () => {
    const r = groupFinance([
      { ...base, amount: 100, payment_state: "paid_now", expected_status: "paid" },
      { ...base, amount: 60, payment_state: "waiting_for_payment", expected_status: "pending" },
      { ...base, client_id: "c2", amount: 40, payment_state: "waiting_for_payment", expected_status: "paid" },
      { ...base, amount: 50, payment_state: "waiting_for_payment", expected_status: "cancelled" },
      { ...base, amount: 0, payment_state: "not_applicable", billing_rule_applied: false },
    ]);
    expect(r).toMatchObject({ charged: 200, received: 140, outstanding: 60 });
    expect(r.debtors).toEqual([{ client_id: "c1", name: "Ann", amount: 60, dates: ["2026-11-01"] }]);
  });
  it("counts unique confirmed people", () => {
    expect(uniqueConfirmedParticipants([
      { status: "confirmed", client_id: "a", email: "a@x" }, { status: "confirmed", client_id: "a", email: "a@x" },
      { status: "pending", client_id: null, email: "b@x" },
    ])).toBe(1);
  });
});

import { cleanForm as cf, normalizeForm as nf, moveOption, removeField as rf, moveField as mf } from "./groupForm";
describe("GRP-05 form configuration", () => {
  const d2 = { name: "Name", email: "Email" };
  it("keeps form title and intro through normalize and clean", () => {
    const f = nf({ title: " Join ", intro: "Hi", fields: [] }, d2);
    expect(cf(f)).toMatchObject({ title: "Join", intro: "Hi" });
  });
  it("title/intro survive field remove and reorder", () => {
    const f = nf({ title: "T", fields: [{ id: "a", label: "A", type: "url", required: false }, { id: "b", label: "B", type: "phone", required: false }] }, d2);
    expect(mf(f, "b", -1).title).toBe("T");
    expect(rf(f, "a").title).toBe("T");
  });
  it("supports email, phone and url field types", () => {
    const f = nf({ fields: [{ id: "u", label: "Site", type: "url", required: true }] }, d2);
    expect(cf(f).fields[2]).toMatchObject({ type: "url", required: true });
  });
  it("system email field label can change but stays required", () => {
    const f = nf({ fields: [{ id: "email", label: "E-mail", type: "url", required: false }] }, d2);
    expect(cf(f).fields[1]).toMatchObject({ id: "email", label: "E-mail", type: "short", required: true });
  });
  it("reorders dropdown options", () => {
    expect(moveOption(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveOption(["a"], 0, -1)).toEqual(["a"]);
  });
});
