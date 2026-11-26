import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserPlus, UserMinus, MoreHorizontal, Search, Pencil, ExternalLink, Inbox } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useUpdateGroupMemberPrice } from "@/hooks/useGroups";
import { groupParticipantsText } from "@/i18n/groupParticipantsText";
import { effectiveMemberPrice, filterParticipants, parsePriceInput } from "@/lib/groupParticipants";

export function GroupMembersSection({ group, members, membersLoading, onAdd, onRemove, onOpenApplications }: {
  group: any; members: any[]; membersLoading: boolean; onAdd: () => void; onRemove: (memberId: string) => void; onOpenApplications?: () => void;
}) {
  const { t, lang } = useLanguage();
  const tx = groupParticipantsText(lang);
  const { symbol, code } = useCurrency();
  const navigate = useNavigate();
  const updatePrice = useUpdateGroupMemberPrice();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [mode, setMode] = useState<"standard" | "individual">("standard");
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const list = useMemo(() => filterParticipants(members, q), [members, q]);
  const standard = group.price_amount;
  const money = (n: number | null) => (n == null ? "—" : `${symbol}${n.toFixed(2)}`);
  const cap = group.capacity ? Number(group.capacity) : null;
  const inactive = group.status === "inactive";

  const openEdit = (m: any) => {
    setEditing(m);
    const ind = m.price_per_session != null;
    setMode(ind ? "individual" : "standard");
    setValue(ind ? String(m.price_per_session) : standard != null ? String(standard) : "");
    setErr(null);
  };
  const save = async () => {
    let p: number | null = null;
    if (mode === "individual") {
      p = parsePriceInput(value);
      if (p == null) { setErr(tx.invalid); return; }
    }
    try {
      await updatePrice.mutateAsync({ id: editing.id, pricePerSession: p, groupId: group.id });
      toast.success(tx.saved);
      setEditing(null);
    } catch { toast.error(tx.saveError); }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{tx.title} ({members.length}{cap ? `/${cap}` : ""})</h2>
          {cap != null && (
            <Badge variant={members.length >= cap ? "destructive" : "secondary"}>
              {members.length >= cap ? tx.full : tx.placesLeft.replace("{n}", String(cap - members.length))}
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={onAdd} disabled={inactive}><UserPlus className="h-4 w-4 mr-1" /> {tx.add}</Button>
      </div>

      {membersLoading ? (
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center text-center py-10 gap-3">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center"><Users className="h-7 w-7 text-primary" /></div>
          <p className="font-semibold">{tx.emptyTitle}</p>
          <p className="text-sm text-muted-foreground max-w-md">{tx.emptyHint}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button size="sm" onClick={onAdd} disabled={inactive}><UserPlus className="h-4 w-4 mr-1" /> {tx.add}</Button>
            {onOpenApplications && <Button size="sm" variant="outline" onClick={onOpenApplications}><Inbox className="h-4 w-4 mr-1" /> {tx.toApplications}</Button>}
          </div>
        </div>
      ) : (
        <>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx.search} aria-label={tx.search} className="pl-9" />
          </div>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{tx.noResults}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tx.name}</TableHead>
                  <TableHead className="hidden md:table-cell">{tx.contact}</TableHead>
                  <TableHead className="hidden sm:table-cell">{tx.joined}</TableHead>
                  <TableHead>{tx.price}</TableHead>
                  <TableHead className="w-10"><span className="sr-only">{tx.actions}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((m: any) => {
                  const eff = effectiveMemberPrice(m.price_per_session);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.clients?.name || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {[m.clients?.email, m.clients?.phone].filter(Boolean).join(" · ") || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{format(new Date(m.joined_at), "dd.MM.yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={eff.individual ? "" : "text-sm text-muted-foreground"}>{eff.individual ? `${money(eff.price)} ${code}` : tx.noPrice}</span>
                          {eff.individual && <Badge>{tx.individual}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={tx.actions}><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(m)}><Pencil className="h-4 w-4 mr-2" />{tx.editPrice}</DropdownMenuItem>
                            {m.client_id && <DropdownMenuItem onClick={() => navigate(`/clients/${m.client_id}`)}><ExternalLink className="h-4 w-4 mr-2" />{tx.openClient}</DropdownMenuItem>}
                            <DropdownMenuItem className="text-destructive" onClick={() => onRemove(m.id)}><UserMinus className="h-4 w-4 mr-2" />{tx.remove}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {list.length > 0 && (
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              {standard != null && <p>{tx.groupDefault.replace("{p}", `${money(Number(standard))} ${code}`)}</p>}
              <p>{tx.appliesHint}</p>
            </div>
          )}
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tx.priceTitle.replace("{name}", editing?.clients?.name || "")}</DialogTitle></DialogHeader>
          <RadioGroup value={mode} onValueChange={(v) => { setMode(v as any); setErr(null); }} className="space-y-3">
            <div className="flex items-start gap-2">
              <RadioGroupItem value="standard" id="p-std" className="mt-1" />
              <Label htmlFor="p-std" className="font-normal">
                {tx.useStandard}
                <span className="block text-xs text-muted-foreground">{tx.standardHint}{standard != null ? ` ${tx.groupDefault.replace("{p}", `${money(Number(standard))} ${code}`)}` : ""}</span>
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="individual" id="p-ind" className="mt-1" />
              <Label htmlFor="p-ind" className="font-normal">{tx.setIndividual}</Label>
            </div>
          </RadioGroup>
          {mode === "individual" && (
            <div className="flex items-center gap-2">
              <Input inputMode="decimal" value={value} onChange={(e) => { setValue(e.target.value); setErr(null); }} aria-label={tx.setIndividual} className="max-w-[160px]" />
              <span className="text-sm text-muted-foreground">{code}</span>
            </div>
          )}
          {err && <p className="text-sm text-destructive">{err}</p>}
          <p className="text-xs text-muted-foreground">{tx.appliesHint}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{tx.cancel}</Button>
            <Button onClick={save} disabled={updatePrice.isPending}>{tx.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
