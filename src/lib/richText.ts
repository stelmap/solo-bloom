import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "del", "mark",
  "ul", "ol", "li", "h1", "h2", "h3", "blockquote", "code", "pre", "span",
];

/** Strip scripts / unsafe HTML and unsupported styling from note content. */
export function sanitizeNoteHtml(html: string): string {
  return DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["class"],
    FORBID_ATTR: ["style", "onerror", "onclick"],
  });
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** True when the stored value looks like HTML produced by the rich editor. */
export function isHtmlNote(value: string): boolean {
  return /<\/?(p|ul|ol|li|strong|em|u|s|mark|h[1-3]|blockquote|br)\b/i.test(value ?? "");
}

/** Legacy plain-text notes are upgraded to HTML paragraphs, preserving line breaks. */
export function noteToHtml(value?: string | null): string {
  const raw = value ?? "";
  if (!raw.trim()) return "";
  if (isHtmlNote(raw)) return sanitizeNoteHtml(raw);
  return raw
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Plain-text projection, used for previews and empty checks. */
export function noteToPlainText(value?: string | null): string {
  const raw = value ?? "";
  if (!raw) return "";
  if (!isHtmlNote(raw)) return raw;
  const el = document.createElement("div");
  el.innerHTML = sanitizeNoteHtml(raw);
  return (el.textContent ?? "").trim();
}
