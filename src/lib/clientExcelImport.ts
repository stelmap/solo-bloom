import { z } from "zod";

export const importFields = ["name", "phone", "email", "price", "prepayment", "debt"] as const;
export type ImportField = typeof importFields[number];
export type ImportDraft = Record<ImportField, string>;
export const emptyImportRow = (): ImportDraft => ({ name: "", phone: "", email: "", price: "", prepayment: "", debt: "" });

const money = z.string().transform(v => v.trim().replace(/[\s\u00a0\u202f]/g, "").replace(",", "."))
  .refine(v => v === "" || /^\d+(\.\d{1,2})?$/.test(v), "amount")
  .transform(v => v === "" ? 0 : Number(v))
  .refine(v => Number.isFinite(v) && v <= 999999999.99, "amount");
export const importRowSchema = z.object({
  name: z.string().trim().min(1, "name").max(100, "name"),
  phone: z.string().trim().max(40, "phone").refine(v => !v || /^[+\d\s().-]+$/.test(v) && /\d/.test(v), "phone"),
  email: z.string().trim().max(255, "email").refine(v => !v || z.email().safeParse(v).success, "email"),
  price: money, prepayment: money, debt: money,
});

// Excel clipboard uses tab-separated cells and quotes multiline/quoted values.
export function parseExcelPaste(text: string): string[][] {
  if (text.length > 500000) throw new Error("tooMany");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' && (quoted || cell === "")) {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (ch === "\t" || ch === "\n" || ch === "\r")) {
      row.push(cell); cell = "";
      if (ch !== "\t") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        if (row.some(v => v.trim())) rows.push(row);
        row = [];
      }
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(v => v.trim())) rows.push(row);
  if (rows.length > 200) throw new Error("tooMany");
  return rows;
}

export function pasteImportRows(current: ImportDraft[], text: string, rowIndex: number, columnIndex: number): ImportDraft[] {
  const pasted = parseExcelPaste(text);
  if (pasted.some(row => row.length + columnIndex > importFields.length)) throw new Error("columns");
  const next = current.map(row => ({ ...row }));
  if (Math.max(next.length, rowIndex + pasted.length) > 200) throw new Error("tooMany");
  pasted.forEach((cells, i) => {
    while (next.length <= rowIndex + i) next.push(emptyImportRow());
    cells.forEach((value, j) => { const field = importFields[columnIndex + j]; if (field) next[rowIndex + i][field] = value; });
  });
  return next;
}