import jsPDF from "jspdf";
import { notoSansRegularBase64, notoSansBoldBase64 } from "./notoSansFont";

export type SignedControl = {
  id: string;
  type: "required_checkbox" | "optional_checkbox" | "typed_acknowledgement";
  label: string;
  required?: boolean;
};

export type SignedAgreementData = {
  title: string;
  sections: Array<{ id?: string; heading?: string; body?: string }>;
  sessionFormats?: Array<{ id: string; label?: string; durationMinutes?: number | "" | null; price?: number | "" | null; currency?: string }> | null;
  cycleLength?: number | "" | null;
  frequency?: string | null;
  controls: SignedControl[];
  answers: Record<string, boolean | string>;
  clientName: string;
  therapistName: string;
  signedName: string;
  acceptedAt: string;
  language: string;
  documentId: string;
  versionLabel: string;
  evidenceHash?: string;
};

export type SignedPdfLabels = {
  acknowledgements: string;
  signature: string;
  signedAt: string;
  client: string;
  therapist: string;
  language: string;
  documentId: string;
  version: string;
  evidenceHash: string;
  sessionFormats: string;
};

export function generateSignedAgreementPdf(data: SignedAgreementData, labels: SignedPdfLabels): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.addFileToVFS("NotoSans-Regular.ttf", notoSansRegularBase64);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", notoSansBoldBase64);
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  doc.setFont("NotoSans", "normal");

  const pageW = 210;
  const pageH = 297;
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  const dark: [number, number, number] = [30, 30, 30];
  const gray: [number, number, number] = [120, 120, 120];

  function ensure(h: number) {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function write(text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) {
    const size = opts.size ?? 10;
    doc.setFontSize(size);
    doc.setFont("NotoSans", opts.bold ? "bold" : "normal");
    doc.setTextColor(...(opts.color ?? dark));
    const lines = doc.splitTextToSize(String(text ?? ""), contentW) as string[];
    const lh = size * 0.42 + 1.2;
    lines.forEach((line) => {
      ensure(lh);
      doc.text(line, margin, y);
      y += lh;
    });
    y += opts.gap ?? 2;
  }

  function rule() {
    ensure(6);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  }

  write(data.title || "", { size: 18, bold: true, gap: 3 });
  write(`${labels.therapist}: ${data.therapistName || "—"}`, { size: 9, color: gray, gap: 0.5 });
  write(`${labels.client}: ${data.clientName || "—"}`, { size: 9, color: gray, gap: 3 });
  rule();

  (data.sections || []).forEach((s) => {
    if (s.heading) write(s.heading, { size: 12, bold: true, gap: 1 });
    if (s.body) write(s.body, { size: 10, gap: 3 });
  });

  const formats = data.sessionFormats ?? [];
  if (formats.length > 0) {
    write(labels.sessionFormats, { size: 12, bold: true, gap: 1 });
    formats.forEach((f) => {
      const parts = [f.label || "—"];
      if (f.durationMinutes) parts.push(`${f.durationMinutes} min`);
      if (f.price !== "" && f.price != null) parts.push(`${f.price} ${f.currency || ""}`.trim());
      write(`• ${parts.join(" · ")}`, { size: 10, gap: 0.5 });
    });
    y += 2;
  }

  rule();
  write(labels.acknowledgements, { size: 12, bold: true, gap: 2 });

  (data.controls || []).forEach((c) => {
    const val = data.answers?.[c.id];
    if (c.type === "typed_acknowledgement") {
      write(`${c.label}`, { size: 10, gap: 0.5 });
      write(`   → "${String(val ?? "")}"`, { size: 10, bold: true, gap: 2 });
    } else {
      write(`${val === true ? "[X]" : "[ ]"}  ${c.label}`, { size: 10, gap: 1.5 });
    }
  });

  rule();
  write(`${labels.signature}: ${data.signedName}`, { size: 11, bold: true, gap: 1 });
  write(`${labels.signedAt}: ${formatDateTime(data.acceptedAt, data.language)}`, { size: 10, gap: 3 });

  write(`${labels.language}: ${data.language.toUpperCase()}`, { size: 8, color: gray, gap: 0.5 });
  write(`${labels.version}: ${data.versionLabel}`, { size: 8, color: gray, gap: 0.5 });
  write(`${labels.documentId}: ${data.documentId}`, { size: 8, color: gray, gap: 0.5 });
  if (data.evidenceHash) write(`${labels.evidenceHash}: ${data.evidenceHash}`, { size: 8, color: gray, gap: 0 });

  return doc;
}

export function formatDateTime(iso: string, language: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleString(language || undefined, {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return d.toLocaleString();
  }
}

export function downloadSignedAgreementPdf(data: SignedAgreementData, labels: SignedPdfLabels) {
  const doc = generateSignedAgreementPdf(data, labels);
  const safe = (data.title || "agreement").replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60);
  doc.save(`${safe}-${data.documentId.slice(0, 8)}.pdf`);
}
