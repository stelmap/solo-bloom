import { describe, it, expect } from "vitest";
import { effectiveMemberPrice, filterParticipants, parsePriceInput } from "./groupParticipants";

describe("group participants", () => {
  it("individual price overrides standard", () => {
    expect(effectiveMemberPrice(30, 50)).toEqual({ price: 30, individual: true });
  });
  it("no override falls back to standard price", () => {
    expect(effectiveMemberPrice(null, 50)).toEqual({ price: 50, individual: false });
  });
  it("search matches name, email or phone", () => {
    const m = [{ clients: { name: "Anna", email: "a@x.com", phone: "123" } }, { clients: { name: "Bob", email: null, phone: "999" } }];
    expect(filterParticipants(m, "ann").length).toBe(1);
    expect(filterParticipants(m, "999")[0].clients.name).toBe("Bob");
  });
  it("rejects negative or empty price input", () => {
    expect(parsePriceInput("-1")).toBeNull();
    expect(parsePriceInput("")).toBeNull();
    expect(parsePriceInput("12,5")).toBe(12.5);
  });
});
