import { describe, it, expect } from "vitest";
import { validateAnswer, validateSignup, parseServerError } from "./groupSignupValidation";
const f = (type: any, required = false, options?: string[]) => ({ id: "x", label: "X", type, required, options });

describe("public group signup validation", () => {
  it("required field must be filled; unchecked required checkbox fails", () => {
    expect(validateAnswer(f("short", true), " ")).toBe("required");
    expect(validateAnswer(f("checkbox", true), "false")).toBe("required");
  });
  it("accepts international phones, rejects letters and too few digits", () => {
    expect(validateAnswer(f("phone"), "+48 (22) 123-45-67")).toBeNull();
    expect(validateAnswer(f("phone"), "+380501234567")).toBeNull();
    expect(validateAnswer(f("phone"), "call me")).toBe("phone");
    expect(validateAnswer(f("phone"), "12")).toBe("phone");
  });
  it("validates email and url", () => {
    expect(validateAnswer(f("email"), "a@b.co")).toBeNull();
    expect(validateAnswer(f("email"), "a@b")).toBe("email");
    expect(validateAnswer(f("url"), "https://solo-bizz.com/x")).toBeNull();
    expect(validateAnswer(f("url"), "solo-bizz.com")).toBe("url");
  });
  it("dropdown value must be a configured option", () => {
    expect(validateAnswer(f("dropdown", false, ["A", "B"]), "C")).toBe("option");
  });
  it("optional empty fields pass; name and email required", () => {
    expect(validateSignup([f("url") as any], "", "bad", {})).toEqual({ name: "required", email: "email" });
  });
  it("parses server field errors", () => {
    expect(parseServerError("INVALID_FORMAT:f_ab12")).toEqual({ field: "f_ab12", kind: "INVALID_FORMAT" });
    expect(parseServerError("INVALID_EMAIL")).toEqual({ field: "email", kind: "INVALID_EMAIL" });
  });
});
