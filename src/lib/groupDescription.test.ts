import { describe, expect, it } from "vitest";
import { groupDescriptionHtml } from "./groupDescription";

describe("group form rich descriptions", () => {
  it("preserves legacy paragraphs and line breaks", () => {
    expect(groupDescriptionHtml("First line\nSecond line\n\nNew paragraph")).toBe("<p>First line<br>Second line</p><p>New paragraph</p>");
  });
  it("preserves formatted headings, lists and safe hyperlinks", () => {
    const html = groupDescriptionHtml('<h2>Welcome</h2><p><strong>Bold</strong> <u>Underlined</u></p><ol><li>One</li></ol><p><a href="https://example.com">Site</a></p>');
    expect(html).toContain("<h2>Welcome</h2>");
    expect(html).toContain("<ol><li>One</li></ol>");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });
  it("removes scripts, unsafe links and executable attributes", () => {
    const html = groupDescriptionHtml('<p onclick="alert(1)">Text<script>alert(1)</script><a href="javascript:alert(1)">Unsafe</a><img src=x onerror="alert(1)"></p>');
    expect(html).toBe("<p>TextUnsafe</p>");
  });
});