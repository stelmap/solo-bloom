import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Check, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { describeError } from "@/lib/errorMessages";
import {
  usePaymentMethods, useUpsertPaymentMethod, useDeletePaymentMethod, useSetDefaultPaymentMethod,
  useUpdatePaymentMethodFlags, localizedMethodName, paymentMethodUsageCount, type PaymentMethod,
} from "@/hooks/usePaymentMethods";
import { pmCopy } from "./paymentMethodsCopy";

/** Single shared CRUD UI for payment methods (Finance settings + Session shortcut). */
export function PaymentMethodsManager() {
  const { t, lang } = useLanguage();
  const L = pmCopy(lang);
  const { toast } = useToast();
  const { data: methods = [], isLoading } = usePaymentMethods();
  const upsert = useUpsertPaymentMethod();
  const del = useDeletePaymentMethod();
  const setDefault = useSetDefaultPaymentMethod();
  const flags = useUpdatePaymentMethodFlags();

  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDel, setConfirmDel] = useState<{ m: PaymentMethod; used: boolean } | null>(null);

  const run = async (fn: () => Promise<any>) => {
    try { await fn(); } catch (e: any) {
      toast({ title: t("common.error"), description: describeError(e), variant: "destructive" });
    }
  };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    run(async () => { await upsert.mutateAsync({ name }); setNewName(""); });
  };

  const askDelete = (m: PaymentMethod) =>
    run(async () => setConfirmDel({ m, used: (await paymentMethodUsageCount(m.code)) > 0 }));

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {isLoading && <li className="p-3 text-sm text-muted-foreground">…</li>}
        {methods.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
            <div className="flex-1 min-w-[140px]">
              {editId === m.id ? (
                <div className="flex items-center gap-1">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget.nextSibling as HTMLButtonElement)?.click(); }} />
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={L.save}
                    onClick={() => run(async () => {
                      if (!editName.trim()) return;
                      await flags.mutateAsync({ id: m.id, name: editName.trim() }); setEditId(null);
                    })}><Check className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={t("common.cancel")} onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={m.is_active ? "text-sm font-medium text-foreground" : "text-sm text-muted-foreground line-through"}>
                    {localizedMethodName(m, t)}
                  </span>
                  {m.is_default && <Badge variant="secondary" className="text-[10px]">{L.default}</Badge>}
                </div>
              )}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Switch checked={m.is_active} onCheckedChange={(v) => run(() => flags.mutateAsync({ id: m.id, is_active: v, ...(v ? {} : {}) }))} aria-label={L.active} />
              {L.active}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Switch checked={m.show_on_invoice} onCheckedChange={(v) => run(() => flags.mutateAsync({ id: m.id, show_on_invoice: v }))} aria-label={L.onInvoice} />
              {L.onInvoice}
            </label>
            <div className="flex items-center">
              {!m.is_default && m.is_active && (
                <Button size="icon" variant="ghost" className="h-8 w-8" title={L.makeDefault} aria-label={L.makeDefault}
                  onClick={() => run(() => setDefault.mutateAsync(m.id))}><Star className="h-4 w-4" /></Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={L.edit}
                onClick={() => { setEditId(m.id); setEditName(localizedMethodName(m, t)); }}><Pencil className="h-4 w-4" /></Button>
              {!m.is_built_in && (
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={L.delete}
                  onClick={() => askDelete(m)}><Trash2 className="h-4 w-4" /></Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={L.newPlaceholder}
          onKeyDown={(e) => e.key === "Enter" && add()} className="h-9" maxLength={60} />
        <Button variant="outline" size="sm" className="h-9" onClick={add} disabled={!newName.trim() || upsert.isPending}>
          <Plus className="h-4 w-4 mr-1" /> {L.add}
        </Button>
      </div>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{L.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDel?.used ? L.deleteUsed : L.deleteUnused}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDel && run(() => del.mutateAsync(confirmDel.m.id))}>{L.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PaymentMethodsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { lang } = useLanguage();
  const L = pmCopy(lang);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{L.title}</DialogTitle>
          <DialogDescription>{L.desc}</DialogDescription>
        </DialogHeader>
        <PaymentMethodsManager />
      </DialogContent>
    </Dialog>
  );
}
