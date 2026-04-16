import jsPDF from "jspdf";
import type { Language } from "@/i18n/translations";

interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  session_date: string;
  service_name: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_billing_address?: string;
  client_billing_country?: string;
  client_billing_tax_id?: string;
  client_billing_company?: string;
  provider_name?: string;
  provider_email?: string;
  provider_phone?: string;
  provider_business_id?: string;
  provider_address?: string;
  net_amount: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  vat_mode: string;
  currency: string;
  language: Language;
  payment_note?: string;
}

const labels: Record<string, Record<Language, string>> = {
  invoice: { en: "INVOICE", uk: "РАХУНОК" },
  invoiceNumber: { en: "Invoice #", uk: "Рахунок №" },
  date: { en: "Date", uk: "Дата" },
  sessionDate: { en: "Session Date", uk: "Дата сеансу" },
  billTo: { en: "Bill To", uk: "Платник" },
  from: { en: "From", uk: "Від" },
  description: { en: "Description", uk: "Опис" },
  amount: { en: "Amount", uk: "Сума" },
  subtotal: { en: "Subtotal", uk: "Проміжний підсумок" },
  vat: { en: "VAT", uk: "ПДВ" },
  vatIncluded: { en: "VAT included", uk: "ПДВ включено" },
  total: { en: "Total", uk: "Разом" },
  paymentNote: { en: "Payment Note", uk: "Примітка до оплати" },
  taxId: { en: "Tax ID", uk: "ЄДРПОУ/ІПН" },
  phone: { en: "Phone", uk: "Телефон" },
  email: { en: "Email", uk: "Email" },
};

function t(key: string, lang: Language): string {
  return labels[key]?.[lang] || labels[key]?.en || key;
}

function formatCurrency(amount: number, currency: string, lang: Language): string {
  const symbol = currency === "UAH" ? "₴" : "€";
  if (lang === "uk") {
    return `${amount.toFixed(2).replace(".", ",")} ${symbol}`;
  }
  return `${symbol}${amount.toFixed(2)}`;
}

function formatDate(dateStr: string, lang: Language): string {
  const d = new Date(dateStr + "T00:00:00");
  if (lang === "uk") {
    const months = [
      "січня", "лютого", "березня", "квітня", "травня", "червня",
      "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function generateInvoicePdf(data: InvoiceData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const lang = data.language;
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Colors
  const primary: [number, number, number] = [41, 98, 255];
  const dark: [number, number, number] = [30, 30, 30];
  const gray: [number, number, number] = [120, 120, 120];

  // Title
  doc.setFontSize(28);
  doc.setTextColor(...primary);
  doc.text(t("invoice", lang), margin, y + 10);
  y += 16;

  // Invoice number & date
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  doc.text(`${t("invoiceNumber", lang)} ${data.invoice_number}`, margin, y);
  doc.text(`${t("date", lang)}: ${formatDate(data.invoice_date, lang)}`, pageW - margin, y, { align: "right" });
  y += 5;
  doc.text(`${t("sessionDate", lang)}: ${formatDate(data.session_date, lang)}`, margin, y);
  y += 12;

  // Separator
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  // Two columns: From / Bill To
  const colW = contentW / 2 - 5;

  // FROM
  doc.setFontSize(9);
  doc.setTextColor(...primary);
  doc.text(t("from", lang), margin, y);
  y += 5;
  doc.setTextColor(...dark);
  doc.setFontSize(10);
  let fromY = y;
  if (data.provider_name) { doc.text(data.provider_name, margin, fromY); fromY += 5; }
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  if (data.provider_email) { doc.text(data.provider_email, margin, fromY); fromY += 4; }
  if (data.provider_phone) { doc.text(`${t("phone", lang)}: ${data.provider_phone}`, margin, fromY); fromY += 4; }
  if (data.provider_business_id) { doc.text(`${t("taxId", lang)}: ${data.provider_business_id}`, margin, fromY); fromY += 4; }
  if (data.provider_address) {
    const lines = doc.splitTextToSize(data.provider_address, colW);
    doc.text(lines, margin, fromY);
    fromY += lines.length * 4;
  }

  // BILL TO
  const col2X = margin + colW + 10;
  let toY = y - 5;
  doc.setFontSize(9);
  doc.setTextColor(...primary);
  doc.text(t("billTo", lang), col2X, toY);
  toY += 5;
  doc.setTextColor(...dark);
  doc.setFontSize(10);
  if (data.client_billing_company) { doc.text(data.client_billing_company, col2X, toY); toY += 5; }
  else { doc.text(data.client_name, col2X, toY); toY += 5; }
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  if (data.client_billing_company && data.client_name) { doc.text(data.client_name, col2X, toY); toY += 4; }
  if (data.client_email) { doc.text(data.client_email, col2X, toY); toY += 4; }
  if (data.client_phone) { doc.text(`${t("phone", lang)}: ${data.client_phone}`, col2X, toY); toY += 4; }
  if (data.client_billing_tax_id) { doc.text(`${t("taxId", lang)}: ${data.client_billing_tax_id}`, col2X, toY); toY += 4; }
  if (data.client_billing_address) {
    const lines = doc.splitTextToSize(data.client_billing_address, colW);
    doc.text(lines, col2X, toY);
    toY += lines.length * 4;
  }
  if (data.client_billing_country) { doc.text(data.client_billing_country, col2X, toY); toY += 4; }

  y = Math.max(fromY, toY) + 10;

  // Table header
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, y, contentW, 8, "F");
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  doc.text(t("description", lang), margin + 3, y + 5.5);
  doc.text(t("amount", lang), pageW - margin - 3, y + 5.5, { align: "right" });
  y += 12;

  // Service line
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text(data.service_name, margin + 3, y);
  doc.text(formatCurrency(data.net_amount, data.currency, lang), pageW - margin - 3, y, { align: "right" });
  y += 10;

  // Separator
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Totals
  const totalsX = pageW - margin - 3;
  const labelsX = pageW - margin - 60;

  if (data.vat_mode === "excluded") {
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text(t("subtotal", lang), labelsX, y, { align: "right" });
    doc.text(formatCurrency(data.net_amount, data.currency, lang), totalsX, y, { align: "right" });
    y += 6;
    doc.text(`${t("vat", lang)} (${data.vat_rate}%)`, labelsX, y, { align: "right" });
    doc.text(formatCurrency(data.vat_amount, data.currency, lang), totalsX, y, { align: "right" });
    y += 8;
  }

  doc.setFontSize(12);
  doc.setTextColor(...primary);
  doc.text(t("total", lang), labelsX, y, { align: "right" });
  doc.text(formatCurrency(data.total_amount, data.currency, lang), totalsX, y, { align: "right" });
  y += 4;

  if (data.vat_mode === "included") {
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(`(${t("vatIncluded", lang)} ${data.vat_rate}%)`, totalsX, y + 4, { align: "right" });
    y += 8;
  }

  // Payment note
  if (data.payment_note) {
    y += 10;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(...primary);
    doc.text(t("paymentNote", lang), margin, y);
    y += 5;
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(data.payment_note, contentW);
    doc.text(noteLines, margin, y);
  }

  return doc;
}
