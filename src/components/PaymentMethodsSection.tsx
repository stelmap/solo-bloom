import { useState } from "react";
import { Wallet, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  usePaymentMethods,
  useUpsertPaymentMethod,
  useTogglePaymentMethod,
  useDeletePaymentMethod,
  localizedMethodName,
  type PaymentMethod,
} from "@/hooks/usePaymentMethods";
import { cn } from "@/lib/utils";

export function PaymentMethodsSection() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: methods = [] } = usePaymentMethods();
  const upsert = useUpsertPaymentMethod();
  const toggle = useTogglePaymentMethod();
  const remove = useDeletePaymentMethod();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const activeCount = methods.filter(m => m.is_active).length;

  const handleToggle = async (m: PaymentMethod, next: boolean) => {
    if (!next && activeCount <= 1 && m.is_active) {
      toast({ title: t("paymentMethods.atLeastOne"), variant: "destructive" });
      return;
    }
    try { await toggle.mutateAsync({ id: m.id, is_active: next }); }
    catch (e: any) { toast({ title: t("common.error"), description: e.message, variant: "destructive" }); }
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await upsert.mutateAsync({ name });
      setNewName("");
      toast({ title: t("paymentMethods.added") });
    } catch (e: any) { toast({ title: t("common.error"), description: e.message, variant: "destructive" }); }
  };

  const startEdit = (m: PaymentMethod) => {
    setEditingId(m.id);
    setEditingName(localizedMethodName(m, t));
  };
  const saveEdit = async (m: PaymentMethod) => {
    const name = editingName.trim();
    if (!name) return;
    try {
      await upsert.mutateAsync({ id: m.id, name });
      setEditingId(null);
    } catch (e: any) { toast({ title: t("common.error"), description: e.message, variant: "destructive" }); }
  };

  const handleDelete = async (m: PaymentMethod) => {
    try { await remove.mutateAsync(m.id); toast({ title: t("paymentMethods.deleted") }); }
    catch (e: any) { toast({ title: t("common.error"), description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-semibold text-foreground">{t("paymentMethods.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("paymentMethods.description")}</p>
        </div>
      </div>

      <div className="space-y-2">
        {methods.map(m => {
          const isEditing = editingId === m.id;
          return (
            <div key={m.id} className={cn("p-3 rounded-lg border flex items-center gap-3", m.is_active ? "bg-card border-border" : "bg-muted/30 border-border opacity-70")}>
              <Switch checked={m.is_active} onCheckedChange={v => handleToggle(m, v)} />
              <div className="flex-1 min-w-0">
                {isEditing && !m.is_built_in ? (
                  <Input value={editingName} onChange={e => setEditingName(e.target.value)} className="h-8" autoFocus />
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{localizedMethodName(m, t)}</span>
                    {m.is_built_in && <Badge variant="secondary" className="text-[10px]">{t("paymentMethods.builtIn")}</Badge>}
                    {!m.is_active && <Badge variant="outline" className="text-[10px]">{t("paymentMethods.disabled")}</Badge>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!m.is_built_in && !isEditing && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                )}
                {!m.is_built_in && isEditing && (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => saveEdit(m)}><Check className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                  </>
                )}
                {!m.is_built_in && !isEditing && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(m)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-end gap-2 pt-2 border-t border-border">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">{t("paymentMethods.addCustom")}</Label>
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={t("paymentMethods.customPlaceholder")}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          />
        </div>
        <Button onClick={handleAdd} disabled={!newName.trim() || upsert.isPending}>
          <Plus className="h-4 w-4 mr-1" /> {t("common.add")}
        </Button>
      </div>
    </div>
  );
}
