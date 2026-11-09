import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, Eye, Loader2, Printer, Search, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { FinanceSubnav } from "@/components/finance/FinanceSubnav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InvoiceDetailsDialog } from "@/components/finance/InvoiceDetailsDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useInvoices, useDeleteInvoice } from "@/hooks/useInvoices";
import { useProfile } from "@/hooks/useData";
import { useLanguage } from "@/i18n/LanguageContext";
import { filterInvoiceRegister, invoiceRegisterCopy } from "@/lib/invoiceRegister";
import { loadSignatureAssetFromPath } from "@/lib/invoiceSignature";
import { useToast } from "@/hooks/use-toast";
import { describeError } from "@/lib/errorMessages";

export default function InvoiceRegisterPage() {
  const { t, lang } = useLanguage();
  const copy = invoiceRegisterCopy[lang];
  const { data: invoices = [], isLoading, isError, refetch } = useInvoices();
  const { data: profile } = useProfile();
  const remove = useDeleteInvoice();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const rows = filterInvoiceRegister(invoices, search, from, to);
  const money = (invoice: any) => new Intl.NumberFormat(lang, { style: "currency", currency: invoice.currency }).format(Number(invoice.total_amount));
  const meetingLinks = (invoice: any) => {
    const links = new Map<string, string>();
    if (invoice.appointment_id) links.set(invoice.appointment_id, invoice.appointments?.scheduled_at || invoice.session_date);
    for (const allocation of invoice.income?.income_session_allocations ?? []) {
      links.set(allocation.appointment_id, allocation.appointments?.scheduled_at || invoice.session_date);
    }
    return [...links].map(([id, date]) => <Link key={id} className="text-primary underline underline-offset-4 whitespace-nowrap" to={`/calendar?date=${date.slice(0, 10)}&appointmentId=${id}`}>{date.slice(0, 10)}</Link>);
  };
  const pdf = async (invoice: any, print: boolean) => {
    // Open synchronously so a browser's popup blocker doesn't prevent printing.
    const printWindow = print ? window.open("", "_blank") : null;
    if (printWindow) printWindow.opener = null;
    setBusy(true);
    try {
      const p = profile as any;
      const [module, signature, stamp] = await Promise.all([
        import("@/lib/invoicePdf"),
        p?.use_scanned_invoice_signature && p.invoice_signature_path ? loadSignatureAssetFromPath(p.invoice_signature_path) : null,
        p?.use_scanned_invoice_signature && p.invoice_stamp_path ? loadSignatureAssetFromPath(p.invoice_stamp_path) : null,
      ]);
      const doc = module.generateInvoicePdf({ ...invoice, signature, stamp });
      if (print) {
        if (!printWindow) throw new Error("Please allow pop-ups to print");
        doc.autoPrint();
        const url = URL.createObjectURL(doc.output("blob"));
        printWindow.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        doc.save(`invoice_${String(invoice.invoice_number).replace(/[\/\\]/g, "-")}.pdf`);
      }
    } catch (error) {
      printWindow?.close();
      toast({ title: t("common.error"), description: describeError(error instanceof Error ? error.message : "PDF error"), variant: "destructive" });
    } finally { setBusy(false); }
  };
  return <AppLayout>
    <div className="space-y-6">
      <FinanceSubnav />
      <header><h1 className="text-2xl font-semibold">{copy.title}</h1></header>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder={copy.search} aria-label={copy.search} /></div>
        <Input type="date" className="w-auto max-w-full" aria-label={t("common.date") + " ≥"} value={from} onChange={e => setFrom(e.target.value)} />
        <Input type="date" className="w-auto max-w-full" aria-label={t("common.date") + " ≤"} value={to} onChange={e => setTo(e.target.value)} />
        <span className="text-sm text-muted-foreground">{rows.length}</span>
      </div>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : isError ? <Button variant="outline" onClick={() => void refetch()}>{t("common.error")} · ↻</Button> : !rows.length ? <p className="py-12 text-muted-foreground">{copy.empty}</p> :
        <div className="overflow-x-auto"><table className="w-full text-sm text-left">
          <thead className="border-b border-border text-muted-foreground"><tr>{[t("invoice.title"), t("common.date"), t("nav.clients"), copy.meeting, t("common.amount"), ""].map((label, i) => <th key={i} className="px-3 py-3 font-medium whitespace-nowrap">{label}</th>)}</tr></thead>
          <tbody>{rows.map((invoice: any) => <tr key={invoice.id} className="border-b border-border">
            <td className="px-3 py-3 whitespace-nowrap font-medium">{invoice.invoice_number}</td><td className="px-3 py-3 whitespace-nowrap">{invoice.invoice_date}</td><td className="px-3 py-3">{invoice.client_name}</td>
            <td className="px-3 py-3"><div className="flex flex-col gap-1">{meetingLinks(invoice).length ? meetingLinks(invoice) : <span className="text-muted-foreground">{copy.noMeeting}</span>}</div></td>
            <td className="px-3 py-3 whitespace-nowrap tabular-nums">{money(invoice)}</td>
            <td className="px-3 py-3"><div className="flex gap-1">
              <Button variant="ghost" size="icon" title={copy.view} aria-label={copy.view} onClick={() => setSelected(invoice)}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="PDF" aria-label="PDF" disabled={busy} onClick={() => void pdf(invoice, false)}><Download className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title={copy.print} aria-label={copy.print} disabled={busy} onClick={() => void pdf(invoice, true)}><Printer className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title={t("invoice.delete")} aria-label={t("invoice.delete")} onClick={() => setDeleteTarget(invoice)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div></td>
          </tr>)}</tbody>
        </table></div>}
    </div>
    <InvoiceDetailsDialog invoice={selected} busy={busy} onClose={() => setSelected(null)} onPdf={(inv, print) => void pdf(inv, print)} onDelete={inv => setDeleteTarget(inv)} />
    <ConfirmDeleteDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }} title={t("invoice.deleteTitle")} description={t("invoice.deleteConfirm")} loading={remove.isPending} onConfirm={async () => { if (!deleteTarget) return; try { await remove.mutateAsync(deleteTarget.id); if (selected?.id === deleteTarget.id) setSelected(null); setDeleteTarget(null); } catch (error) { toast({ title: t("common.error"), description: describeError(error instanceof Error ? error.message : "Error"), variant: "destructive" }); } }} />
  </AppLayout>;
}