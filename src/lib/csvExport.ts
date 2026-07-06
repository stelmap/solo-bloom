import { track } from "@/lib/analytics";

// Neutralize CSV/Excel/Sheets formula injection: prefix a leading
// '=', '+', '-', '@', TAB, or CR with a single quote so spreadsheet
// apps treat it as text instead of executing a formula.
function sanitizeCell(v: string): string {
  if (v.length > 0 && /^[=+\-@\t\r]/.test(v)) {
    return "'" + v;
  }
  return v;
}

export function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const escape = (raw: string) => {
    const v = sanitizeCell(raw);
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const csv = [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  // Derive entity from filename ("expenses.csv" -> "expenses").
  const entity = filename.replace(/\.csv$/i, "").toLowerCase();
  track("csv_exported", { entity, row_count: rows.length });
}
