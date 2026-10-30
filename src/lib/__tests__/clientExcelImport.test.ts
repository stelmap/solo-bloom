import { describe, expect, it } from "vitest";
import { emptyImportRow, importRowSchema, parseExcelPaste, pasteImportRows } from "../clientExcelImport";

describe("Excel client import", () => {
  it("pastes multiple clients with all six fields", () => {
    const rows = pasteImportRows([emptyImportRow()], "Олена\t+380501234567\tolena@example.com\t700\t1400\t300\r\nІрина\t\t\t0\t0\t0", 0, 0);
    expect(rows).toHaveLength(2);
    expect(importRowSchema.parse(rows[0])).toEqual({ name: "Олена", phone: "+380501234567", email: "olena@example.com", price: 700, prepayment: 1400, debt: 300 });
  });
  it("preserves quoted Excel cells", () => expect(parseExcelPaste('"Анна ""А"""\t\t\t40\t0\t0')).toEqual([['Анна "А"', "", "", "40", "0", "0"]]));
  it("requires a name", () => expect(importRowSchema.safeParse(emptyImportRow()).success).toBe(false));
  it("rejects malformed email and phone", () => {
    expect(importRowSchema.safeParse({ ...emptyImportRow(), name: "A", email: "bad" }).success).toBe(false);
    expect(importRowSchema.safeParse({ ...emptyImportRow(), name: "A", phone: "abc" }).success).toBe(false);
  });
  it("accepts free prices and optional contacts", () => expect(importRowSchema.parse({ ...emptyImportRow(), name: "A", price: "0" }).price).toBe(0));
  it("accepts decimal comma and spaced money", () => expect(importRowSchema.parse({ ...emptyImportRow(), name: "A", prepayment: "1 400,50" }).prepayment).toBe(1400.5));
  it("rejects negative balances and invalid precision", () => {
    expect(importRowSchema.safeParse({ ...emptyImportRow(), name: "A", debt: "-1" }).success).toBe(false);
    expect(importRowSchema.safeParse({ ...emptyImportRow(), name: "A", price: "4.555" }).success).toBe(false);
  });
  it("does not silently discard extra columns", () => expect(() => pasteImportRows([emptyImportRow()], "a\tb\tc\td\te\tf\tg", 0, 0)).toThrow("columns"));
});