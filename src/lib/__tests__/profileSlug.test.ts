import { describe, it, expect } from "vitest";
import { profileSlugBase, profileUrl } from "../therapistProfile";
describe("public profile address", () => {
  it("builds a readable address from a Cyrillic name", () => {
    expect(profileSlugBase({ first_name: "Ольга", last_name: "Стельмах" })).toBe("olha-stelmakh");
  });
  it("uses the solo-bizz.com/therapist/ address", () => {
    expect(profileUrl("olga-stelmakh")).toBe("https://solo-bizz.com/therapist/olga-stelmakh");
  });
});
