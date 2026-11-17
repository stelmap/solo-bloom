// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { normalizeProfile, profileSlugBase, toPublished } from "../therapistProfile";

describe("SEC-001 readable address base", () => {
  it("transliterates Ukrainian names", () => {
    expect(profileSlugBase({ first_name: "Ольга", last_name: "Стельмах" })).toBe("olha-stelmakh");
  });
  it("strips Polish diacritics", () => {
    expect(profileSlugBase({ first_name: "Łukasz", last_name: "Żółć" })).toBe("lukasz-zolc");
  });
  it("gives identical names the same base (database adds -2, -3…)", () => {
    expect(profileSlugBase({ first_name: "Anna", last_name: "Nowak" })).toBe(profileSlugBase({ first_name: "anna", last_name: "NOWAK" }));
  });
  it("never produces unsafe URL characters", () => {
    expect(profileSlugBase({ first_name: "<script>", last_name: "../../admin" })).toMatch(/^[a-z0-9-]*$/);
  });
});

describe("SEC-006 only own files can be published", () => {
  it("drops another therapist's file paths", () => {
    const p = normalizeProfile({ first_name: "A", photo: "other-user/p.jpg", documents: [{ path: "me/c.pdf", kind: "pdf" }, { path: "other-user/d.pdf", kind: "pdf" }] });
    const { files } = toPublished(p, "me");
    expect(files).toEqual(["me/c.pdf"]);
  });
});

describe("XSS in About me text", () => {
  it("removes scripts, event handlers and javascript links", () => {
    const p = normalizeProfile({ about_html: '<p onclick="x()">Hi<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">l</a></p>' });
    expect(p.about_html).not.toMatch(/script|onerror|onclick|javascript|<img/i);
  });
  it("rejects non-http social links", () => {
    const { data } = toPublished(normalizeProfile({ first_name: "A", socials: [{ label: "x", url: "javascript:alert(1)" }, { label: "ok", url: "https://ok.example" }] }), "me");
    expect(data.socials.map((s) => s.url)).toEqual(["https://ok.example"]);
  });
});
