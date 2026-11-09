import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, ChevronRight, CreditCard, Download, FileText, Link2, Loader2, MoreHorizontal, Pencil, Printer, Trash2, User } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoWriteGuard } from "@/hooks/useDemoWorkspace";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import type { AppLanguage } from "@/i18n/translations";
import { localizedMethodName, storedMethodLabel, usePaymentMethods } from "@/hooks/usePaymentMethods";
import { describeError } from "@/lib/errorMessages";

const COPY: Record<AppLanguage, Record<string, string>> = {
  uk: { title: "Рахунок", paid: "Оплачено", unpaid: "Не оплачено", partial: "Частково оплачено", invoiceDate: "Дата рахунку", source: "Підстава", meeting: "Зустріч", finance: "Фінансовий запис", manual: "Створено вручну", payment: "Платіж", services: "Послуги", pay: "Оплата", method: "Спосіб оплати", payDate: "Дата оплати", total: "Разом до сплати", sum: "Сума", note: "Примітка", save: "Зберегти", print: "Друк", saved: "Рахунок збережено", emptyNumber: "Номер рахунку не може бути порожнім", dupNumber: "Рахунок з таким номером уже існує", unsaved: "Є незбережені зміни. Закрити без збереження?", saveFirst: "Спочатку збережіть зміни", del: "Видалити", editNumber: "Змінити номер" },
  en: { title: "Invoice", paid: "Paid", unpaid: "Unpaid", partial: "Partially paid", invoiceDate: "Invoice date", source: "Source", meeting: "Meeting", finance: "Financial record", manual: "Created manually", payment: "Payment", services: "Services", pay: "Payment", method: "Payment method", payDate: "Payment date", total: "Total due", sum: "Amount", note: "Note", save: "Save", print: "Print", saved: "Invoice saved", emptyNumber: "Invoice number cannot be empty", dupNumber: "An invoice with this number already exists", unsaved: "You have unsaved changes. Close without saving?", saveFirst: "Save your changes first", del: "Delete", editNumber: "Edit number" },
  ru: { title: "Счёт", paid: "Оплачено", unpaid: "Не оплачено", partial: "Частично оплачено", invoiceDate: "Дата счёта", source: "Основание", meeting: "Встреча", finance: "Финансовая запись", manual: "Создано вручную", payment: "Платёж", services: "Услуги", pay: "Оплата", method: "Способ оплаты", payDate: "Дата оплаты", total: "Итого к оплате", sum: "Сумма", note: "Примечание", save: "Сохранить", print: "Печать", saved: "Счёт сохранён", emptyNumber: "Номер счёта не может быть пустым", dupNumber: "Счёт с таким номером уже существует", unsaved: "Есть несохранённые изменения. Закрыть без сохранения?", saveFirst: "Сначала сохраните изменения", del: "Удалить", editNumber: "Изменить номер" },
  pl: { title: "Faktura", paid: "Opłacono", unpaid: "Nieopłacono", partial: "Częściowo opłacono", invoiceDate: "Data faktury", source: "Podstawa", meeting: "Spotkanie", finance: "Zapis finansowy", manual: "Utworzono ręcznie", payment: "Płatność", services: "Usługi", pay: "Płatność", method: "Metoda płatności", payDate: "Data płatności", total: "Do zapłaty", sum: "Kwota", note: "Uwaga", save: "Zapisz", print: "Drukuj", saved: "Faktura zapisana", emptyNumber: "Numer faktury nie może być pusty", dupNumber: "Faktura o tym numerze już istnieje", unsaved: "Masz niezapisane zmiany. Zamknąć bez zapisu?", saveFirst: "Najpierw zapisz zmiany", del: "Usuń", editNumber: "Zmień numer" },
  fr: { title: "Facture", paid: "Payée", unpaid: "Impayée", partial: "Partiellement payée", invoiceDate: "Date de facture", source: "Origine", meeting: "Rendez-vous", finance: "Écriture financière", manual: "Créée manuellement", payment: "Paiement", services: "Services", pay: "Paiement", method: "Moyen de paiement", payDate: "Date de paiement", total: "Total à payer", sum: "Montant", note: "Note", save: "Enregistrer", print: "Imprimer", saved: "Facture enregistrée", emptyNumber: "Le numéro ne peut pas être vide", dupNumber: "Une facture avec ce numéro existe déjà", unsaved: "Modifications non enregistrées. Fermer quand même ?", saveFirst: "Enregistrez d'abord les modifications", del: "Supprimer", editNumber: "Modifier le numéro" },
};

type Draft = { invoice_number: string; invoice_date: string; payment_method: string; payment_date: string; payment_note: string };
const toDraft = (i: any): Draft => ({ invoice_number: i?.invoice_number ?? "", invoice_date: i?.invoice_date ?? "", payment_method: i?.payment_method ?? "", payment_date: i?.payment_date ?? "", payment_note: i?.payment_note ?? "" });

export function InvoiceDetailsDialog({ invoice, onClose, onPdf, onDelete, busy }: {
  invoice: any | null; onClose: () => void; onPdf: (invoice: any, print: boolean) => void; onDelete: (invoice: any) => void; busy: boolean;
}) {
  const { t, lang } = useLanguage();
  const c = COPY[lang];
  const { user } = useAuth();
  const assertCanWrite = useDemoWriteGuard();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: methods = [] } = usePaymentMethods();
  const [current, setCurrent] = useState<any>(invoice);
  const [draft, setDraft] = useState<Draft>(toDraft(invoice));
  const [editingNumber, setEditingNumber] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setCurrent(invoice); setDraft(toDraft(invoice)); setEditingNumber(false); }, [invoice?.id]);

  const dirty = useMemo(() => current && JSON.stringify(toDraft(current)) !== JSON.stringify(draft), [current, draft]);
  const fmt = (v: number) => new Intl.NumberFormat(lang, { style: "currency", currency: current?.currency || "EUR" }).format(Number(v || 0));

  const requestClose = () => { if (dirty && !window.confirm(c.unsaved)) return; onClose(); };

  // Meeting link: direct appointment, or the single allocation of the linked payment.
  const meetings: { id: string; date: string }[] = [];
  if (current?.appointment_id) meetings.push({ id: current.appointment_id, date: current.appointments?.scheduled_at || current.session_date });
  for (const a of current?.income?.income_session_allocations ?? []) if (!meetings.some(m => m.id === a.appointment_id)) meetings.push({ id: a.appointment_id, date: a.appointments?.scheduled_at || current.session_date });
  const fmtMeeting = (iso: string) => {
    const d = new Date(iso);
    if (iso.length <= 10 || isNaN(d.getTime())) return iso.slice(0, 10);
    // Appointment timestamps are UTC-labelled wall clocks.
    return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(d);
  };

  const status = current?.payment_status === "paid" || (current?.income_id && current?.payment_status !== "unpaid") ? "paid" : current?.payment_status === "partial" ? "partial" : current?.payment_status === "unpaid" ? "unpaid" : current?.payment_date ? "paid" : "unpaid";
  const statusClass = status === "paid" ? "bg-success/15 text-success" : status === "partial" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground";

  const methodOptions = useMemo(() => {
    const opts = methods.filter((m: any) => m.is_active || m.code === draft.payment_method).map((m: any) => ({ code: m.code, label: localizedMethodName(m, t) }));
    if (draft.payment_method && !opts.some(o => o.code === draft.payment_method)) opts.push({ code: draft.payment_method, label: storedMethodLabel(current, t) });
    return opts;
  }, [methods, draft.payment_method, current, t]);

  const save = async () => {
    if (!current || !user) return;
    const number = draft.invoice_number.trim();
    if (!number) { toast({ title: c.emptyNumber, variant: "destructive" }); return; }
    if (!draft.invoice_date) return;
    setSaving(true);
    try {
      assertCanWrite();
      if (number !== current.invoice_number) {
        const { data: dup, error: dupErr } = await supabase.from("invoices").select("id").eq("user_id", user.id).eq("invoice_number", number).neq("id", current.id).limit(1);
        if (dupErr) throw dupErr;
        if (dup?.length) { toast({ title: c.dupNumber, variant: "destructive" }); return; }
      }
      const patch = { invoice_number: number, invoice_date: draft.invoice_date, payment_method: draft.payment_method || null, payment_date: draft.payment_date || null, payment_note: draft.payment_note.trim() || null };
      const { data, error } = await supabase.from("invoices").update(patch).eq("id", current.id).eq("user_id", user.id).select().single();
      if (error) throw error;
      // Keep the linked payment record in sync — update it in place, never create a new one.
      const paymentChanged = (draft.payment_method || null) !== (current.payment_method || null) || (draft.payment_date || null) !== (current.payment_date || null);
      if (current.income_id && paymentChanged) {
        const incomePatch: Record<string, string> = {};
        if (draft.payment_method && draft.payment_method !== current.payment_method) incomePatch.payment_method = draft.payment_method;
        if (draft.payment_date && draft.payment_date !== current.payment_date) incomePatch.date = draft.payment_date;
        if (Object.keys(incomePatch).length) {
          const { error: incErr } = await supabase.from("income").update(incomePatch as any).eq("id", current.income_id).eq("user_id", user.id);
          if (incErr) throw incErr;
          ["income", "finance", "dashboard", "client-income"].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
        }
      }
      const next = { ...current, ...data };
      setCurrent(next); setDraft(toDraft(next)); setEditingNumber(false);
      await qc.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: c.saved });
    } catch (e) {
      toast({ title: t("common.error"), description: describeError(e instanceof Error ? e.message : "Error"), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const doc = (print: boolean) => { if (dirty) { toast({ title: c.saveFirst }); return; } onPdf(current, print); };

  return <Dialog open={!!invoice} onOpenChange={open => { if (!open) requestClose(); }}>
    <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:p-0 sm:rounded-2xl">
      {current && <>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-5">
          <div className="space-y-1 pr-8">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl font-bold">{c.title}</DialogTitle>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}>{status === "paid" && <Check className="h-3 w-3" />}{c[status]}</span>
            </div>
            {editingNumber
              ? <Input autoFocus value={draft.invoice_number} onChange={e => setDraft(d => ({ ...d, invoice_number: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") setEditingNumber(false); }} aria-label={c.editNumber} className="h-10 text-lg font-bold" />
              : <button type="button" onClick={() => setEditingNumber(true)} className="flex items-center gap-2 text-left text-2xl font-bold" aria-label={c.editNumber}>
                  <span className="break-all">#{draft.invoice_number}</span><Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>}
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_auto]">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"><User className="h-4 w-4" /></span>
              <div className="min-w-0">
                {current.client_id
                  ? <Link to={`/clients/${current.client_id}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">{current.client_name}<ChevronRight className="h-4 w-4" /></Link>
                  : <p className="font-semibold">{current.client_name}</p>}
                {current.client_email && <p className="truncate text-sm text-muted-foreground">{current.client_email}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <CalendarDays className="h-5 w-5 shrink-0 text-muted-foreground" />
              <label className="space-y-0.5">
                <span className="block text-xs text-muted-foreground">{c.invoiceDate}</span>
                <Input type="date" value={draft.invoice_date} onChange={e => setDraft(d => ({ ...d, invoice_date: e.target.value }))} className="h-8 w-[9.5rem] px-2 font-semibold" />
              </label>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
            <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 text-sm">
              {meetings.length ? meetings.map(m => <div key={m.id}>
                <p>{c.source}: <Link to={`/calendar?date=${m.date.slice(0, 10)}&appointmentId=${m.id}`} className="inline-flex items-center font-semibold text-primary hover:underline">{c.meeting}<ChevronRight className="h-4 w-4" /></Link></p>
                <p className="text-muted-foreground">{fmtMeeting(m.date)} — {current.service_name}</p>
              </div>) : current.income_id ? <>
                <p>{c.source}: <Link to={`/payments?range=all&incomeId=${current.income_id}`} className="inline-flex items-center font-semibold text-primary hover:underline">{c.finance}<ChevronRight className="h-4 w-4" /></Link></p>
                <p className="text-muted-foreground">{current.payment_date || current.session_date} — {c.payment}{current.service_name ? ` · ${current.service_name}` : ""}</p>
              </> : <p>{c.source}: <span className="font-semibold">{c.manual}</span></p>}
            </div>
          </div>

          <section className="space-y-2 border-t border-border pt-3">
            <h3 className="font-semibold">{c.services} (1)</h3>
            <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
              <p className="min-w-0 text-sm font-semibold">{current.service_name}</p>
              <div className="shrink-0 text-right text-sm">
                <p className="text-muted-foreground">1 × {fmt(current.net_amount)}</p>
                <p className="font-semibold">{fmt(current.net_amount)}</p>
              </div>
            </div>
          </section>

          <section className="space-y-2 border-t border-border pt-3">
            <h3 className="font-semibold">{c.pay}</h3>
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
              <span className="flex items-center gap-2 whitespace-nowrap"><CreditCard className="h-4 w-4 text-muted-foreground" />{c.method}</span>
              <Select value={draft.payment_method || undefined} onValueChange={v => setDraft(d => ({ ...d, payment_method: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{methodOptions.map(o => <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <span className="flex items-center gap-2 whitespace-nowrap"><CalendarDays className="h-4 w-4 text-muted-foreground" />{c.payDate}</span>
              <Input type="date" className="h-9" value={draft.payment_date} onChange={e => setDraft(d => ({ ...d, payment_date: e.target.value }))} />
            </div>
          </section>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 p-4">
            <div>
              <p className="font-semibold">{c.total}</p>
              <p className="text-xs text-muted-foreground">{c.sum}: {fmt(current.net_amount)} | VAT ({Number(current.vat_rate)}%): {fmt(current.vat_amount)}</p>
            </div>
            <p className="whitespace-nowrap text-xl font-bold">{fmt(current.total_amount)}</p>
          </div>

          <label className="block space-y-1 border-t border-border pt-3">
            <span className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-muted-foreground" />{c.note}</span>
            <Textarea rows={2} value={draft.payment_note} placeholder="—" onChange={e => setDraft(d => ({ ...d, payment_note: e.target.value }))} />
          </label>
        </div>

        <div className="flex gap-2 border-t border-border bg-background px-5 py-3">
          <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" disabled={saving || !dirty} onClick={() => void save()}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{c.save}
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => doc(false)}><Download className="mr-1.5 h-4 w-4" />PDF</Button>
          <Button variant="outline" disabled={busy} onClick={() => doc(true)}><Printer className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">{c.print}</span></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="…"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(current)}><Trash2 className="mr-2 h-4 w-4" />{c.del}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
