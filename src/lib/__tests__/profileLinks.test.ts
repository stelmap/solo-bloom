// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { sanitizeProfileHtml } from "../richText";
describe("public profile links", () => {
  it("keeps https links and opens them in a new tab", () => {
    const out = sanitizeProfileHtml('<p><a href="https://example.com">site</a></p>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('target="_blank"');
  });
  it("drops unsafe javascript links", () => {
    expect(sanitizeProfileHtml('<p><a href="javascript:alert(1)">x</a></p>')).not.toContain("javascript");
  });
});
