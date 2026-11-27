import { isHtmlNote, noteToHtml, sanitizeProfileHtml } from "@/lib/richText";

/** One safe representation for editor, owner preview and published descriptions. */
export function groupDescriptionHtml(value?: string | null): string {
  const text = value ?? "";
  return sanitizeProfileHtml(isHtmlNote(text) ? text : noteToHtml(text));
}