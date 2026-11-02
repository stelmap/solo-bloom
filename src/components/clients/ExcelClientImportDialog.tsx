import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientLanguageSelect } from "@/components/ClientLanguageSelect";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useDemoWriteGuard } from "@/hooks/useDemoWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { clientImportCopy } from "@/lib/clientExcelImportCopy";
import { emptyImportRow, importFields, importRowSchema, pasteImportRows, type ImportDraft } from "@/lib/clientExcelImport";
import type { ClientLanguage } from "@/lib/clientLanguage";

export function ExcelClientImportDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void }) {
  const { lang } = useLanguage();
  const copy = clientImportCopy(lang);
  const { toast } = useToast();
  const qc = useQueryClient();
  const assertCanWrite = useDemoWriteGuard();
  const [rows, setRows] = useState<ImportDraft[]>([emptyImportRow()]);
  const [language, setLanguage] = useState<ClientLanguage>(lang as ClientLanguage);
  const [errorsVisible, setErrorsVisible] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const activeRows = rows.filter(row => importFields.some(field => row[field].trim()));
  function update(next: ImportDraft[]) {
    setRows(next); setError(""); requestId.current = crypto.randomUUID();
  }
  async function save() {
    if (savingRef.current) return;
    setErrorsVisible(true);
    if (!activeRows.length || activeRows.some(row => !importRowSchema.safeParse(row).success)) return;
    savingRef.current = true; setSaving(true); setError("");
    try {
      assertCanWrite();
      const payload = activeRows.map(row => ({ ...importRowSchema.parse(row), price: row.price.trim() ? importRowSchema.parse(row).price : null }));
      const { data, error: rpcError } = await supabase.rpc("import_excel_clients", { p_rows: payload, p_request_id: requestId.current, p_language: language });
      if (rpcError) throw rpcError;
      await Promise.all(["clients", "plan-active-client-count", "client-credit-balance", "client-debt", "expected-payments", "dashboard-stats"].map(key => qc.invalidateQueries({ queryKey: [key] })));
      toast({ title: copy.success, description: `${data?.length ?? activeRows.length}` });
      update([emptyImportRow()]); setErrorsVisible(false); onSuccess(); onOpenChange(false);
    } catch (e) {
      const message = e && typeof e === "object" && "message" in e ? String(e.message) : "";
      setError(message.includes("CLIENT_LIMIT_REACHED") ? copy.limit : copy.failed);
    } finally { savingRef.current = false; setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={value => { if (!savingRef.current) onOpenChange(value); }}>
    <DialogContent className="w-[calc(100%-2rem)] max-w-6xl max-h-[90dvh] flex flex-col overflow-hidden">
      <DialogHeader><DialogTitle>{copy.title}</DialogTitle></DialogHeader>
      <div className="max-w-xs"><ClientLanguageSelect id="excel-client-language" value={language} onChange={value => { if (!saving) { setLanguage(value); requestId.current = crypto.randomUUID(); } }} showHelp={false} required /></div>
      <fieldset disabled={saving} className="min-h-0 overflow-auto border border-border rounded-md">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted"><tr><th className="p-2 w-10">#</th>{importFields.map(field => <th key={field} className="p-2 text-left font-medium whitespace-nowrap">{copy[field]}{field === "name" ? " *" : ""}</th>)}<th className="w-10" /></tr></thead>
          <tbody>{rows.map((row, i) => {
            const result = importRowSchema.safeParse(row);
            const show = errorsVisible && activeRows.includes(row);
            return <tr key={i} className="border-t border-border"><td className="p-2 text-muted-foreground align-top">{i + 1}</td>{importFields.map((field, j) => {
              const invalid = show && !result.success && result.error.issues.some(issue => issue.path[0] === field);
              const fieldError = field === "name" ? copy.nameError : field === "phone" ? copy.phoneError : field === "email" ? copy.emailError : copy.amountError;
              return <td key={field} className="p-1.5 align-top">
                <Input aria-label={`${copy[field]} ${i + 1}`} aria-invalid={invalid} value={row[field]} className="min-w-28" inputMode={j >= 3 ? "decimal" : field === "phone" ? "tel" : field === "email" ? "email" : "text"}
                  onChange={e => update(rows.map((r, k) => k === i ? { ...r, [field]: e.target.value } : r))}
                  onPaste={e => {
                    const text = e.clipboardData.getData("text/plain");
                    if (!/[\t\r\n]/.test(text)) return;
                    e.preventDefault();
                    try { update(pasteImportRows(rows, text, i, j)); }
                    catch (e) { setError(e instanceof Error && e.message === "columns" ? copy.columns : copy.tooMany); }
                  }} />
                {invalid && <p className="text-xs text-destructive mt-1 max-w-44">{fieldError}</p>}
              </td>;
            })}<td className="p-1 align-top"><Button type="button" variant="ghost" size="icon" title={copy.remove} aria-label={`${copy.remove} ${i + 1}`} onClick={() => update(rows.length === 1 ? [emptyImportRow()] : rows.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button></td></tr>;
          })}</tbody>
        </table>
      </fieldset>
      <Button variant="outline" className="self-start" disabled={saving || rows.length >= 200} onClick={() => update([...rows, emptyImportRow()])}><Plus className="h-4 w-4 mr-2" />{copy.add}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-sm font-medium">{copy.count}: <span className="tabular-nums">{activeRows.length}</span></p>
        <div className="flex gap-2"><Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>{copy.cancel}</Button><Button disabled={saving || !activeRows.length} onClick={save}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{saving ? copy.saving : copy.save}</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}