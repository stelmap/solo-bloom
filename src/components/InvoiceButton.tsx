import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useProfile } from "@/hooks/useData";
import { useInvoicesByAppointment, useCreateInvoice } from "@/hooks/useInvoices";
import { useAuth } from "@/contexts/AuthContext";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";
import type { Language } from "@/i18n/translations";

interface InvoiceButtonProps {
  appointment: any;
  client: any;
  service: any;
}

export function InvoiceButton({ appointment, client, service }: InvoiceButtonProps) {
  const { t, lang } = useLanguage();
  const { code: currency } = useCurrency();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const { data: invoices = [] } = useInvoicesByAppointment(appointment?.id);
  const createInvoice = useCreateInvoice();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  if (!appointment || !client || !service) return null;

  const buildInvoiceData = (invoiceNumber: string) => {
    const price = appointment.price || service.price || 0;
    const vatMode = (profile as any)?.vat_mode || "none";
    const vatRate = Number((profile as any)?.vat_rate) || 0;

    let netAmount = price;
    let vatAmount = 0;
    let totalAmount = price;

    if (vatMode === "included" && vatRate > 0) {
      netAmount = price / (1 + vatRate / 100);
      vatAmount = price - netAmount;
      totalAmount = price;
    } else if (vatMode === "excluded" && vatRate > 0) {
      netAmount = price;
      vatAmount = price * (vatRate / 100);
      totalAmount = price + vatAmount;
    }

    const sessionDate = appointment.scheduled_at
      ? new Date(appointment.scheduled_at).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    return {
      appointment_id: appointment.id,
      client_id: client.id,
      invoice_date: new Date().toISOString().split("T")[0],
      session_date: sessionDate,
      service_name: service.name,
      client_name: client.name,
      client_email: client.email || undefined,
      client_phone: client.phone || undefined,
      client_billing_address: (client as any).billing_address || undefined,
      client_billing_country: (client as any).billing_country || undefined,
      client_billing_tax_id: (client as any).billing_tax_id || undefined,
      client_billing_company: (client as any).billing_company_name || undefined,
      provider_name: profile?.full_name || undefined,
      provider_business_name: (profile as any)?.business_name || undefined,
      provider_email: user?.email || undefined,
      provider_phone: profile?.phone || undefined,
      provider_business_id: (profile as any)?.business_id || undefined,
      provider_address: (profile as any)?.business_address || undefined,
      payment_status: appointment.payment_status || undefined,
      net_amount: Math.round(netAmount * 100) / 100,
      vat_rate: vatRate,
      vat_amount: Math.round(vatAmount * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      vat_mode: vatMode,
      currency,
      language: lang,
      invoice_number: invoiceNumber,
    };
  };

  const downloadPdf = (doc: any, filename: string) => {
    // Try multiple strategies — preview iframes and some browsers block one or
    // another. Try jsPDF's built-in save first (most reliable cross-env).
    let lastError: unknown = null;
    try {
      doc.save(filename, { returnPromise: false });
      return;
    } catch (e) { lastError = e; }

    try {
      const blob: Blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return;
    } catch (e) { lastError = e; }

    try {
      const blob: Blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank", "noopener");
      if (w) return;
    } catch (e) { lastError = e; }

    try {
      const dataUri = doc.output("datauristring", { filename });
      const w = window.open();
      if (w) {
        w.location.href = dataUri;
        return;
      }
    } catch (e) { lastError = e; }

    console.error("[invoice] download failed", lastError);
    throw lastError instanceof Error ? lastError : new Error("Unable to download PDF");
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await createInvoice.mutateAsync(buildInvoiceData(""));
      const invoiceData = {
        ...result,
        language: lang as Language,
      };
      const doc = generateInvoicePdf(invoiceData);
      downloadPdf(doc, `invoice_${result.invoice_number.replace(/\//g, "-")}.pdf`);
      track("invoice_downloaded", { kind: "new" });
      toast({ title: t("invoice.generated") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadExisting = (invoice: any) => {
    const doc = generateInvoicePdf({ ...invoice, language: invoice.language as Language });
    downloadPdf(doc, `invoice_${invoice.invoice_number.replace(/\//g, "-")}.pdf`);
    track("invoice_downloaded", { kind: "existing" });
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={generating}
        className="w-full"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        {t("invoice.generate")}
      </Button>
      {invoices.length > 0 && (
        <div className="space-y-1">
          {invoices.map((inv: any) => (
            <Button
              key={inv.id}
              variant="ghost"
              size="sm"
              onClick={() => handleDownloadExisting(inv)}
              className="w-full justify-start text-xs"
            >
              <Download className="h-3 w-3 mr-2" />
              {inv.invoice_number} — {inv.invoice_date}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
