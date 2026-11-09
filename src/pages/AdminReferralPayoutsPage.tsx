import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Eye, Loader2, RefreshCw, Wallet } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkIsAdmin } from '@/lib/sessionGuard';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { adminReferralCopy } from '@/lib/adminReferralCopy';
import { canReviewPayout, payoutReviewError, type ReviewAction } from '@/lib/referralPayoutReview';
import type { Tables } from '@/integrations/supabase/types';

type Row = Tables<'referral_payouts'> & { full_name: string | null; email: string | null };

export default function AdminReferralPayoutsPage() {
  const { user, loading } = useAuth();
  const { lang } = useLanguage();
  const c = adminReferralCopy[lang];
  const { toast } = useToast();
  const qc = useQueryClient();
  const admin = useQuery({ queryKey: ['admin-access', user?.id], queryFn: checkIsAdmin, enabled: !!user });
  const q = useQuery({
    queryKey: ['admin-referral-payouts', user?.id], enabled: admin.data === true,
    queryFn: () => fetchAllPages<Row>(async (from, to) => {
      const { data, error } = await supabase.rpc('admin_list_referral_payouts', { p_offset: from, p_limit: Math.min(to - from + 1, 100) });
      const result = data as unknown as { rows: Row[] } | null;
      return { data: result?.rows ?? null, error };
    }),
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Row | null>(null);
  const [action, setAction] = useState<ReviewAction>('processing');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [transferred, setTransferred] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const money = (r: Row) => new Intl.NumberFormat(lang, { style: 'currency', currency: r.currency }).format(r.amount);
  const date = (value: string | null) => value ? new Date(value).toLocaleString(lang) : '—';
  const rows = (q.data ?? []).filter(r => (filter === 'all' || r.status === filter) && `${r.full_name ?? ''} ${r.email ?? ''} ${r.id}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  const visibleRows = rows.slice(page * 20, (page + 1) * 20);
  const active = selected && (selected.status === 'pending' || selected.status === 'processing');
  const errorText = (e: unknown) => {
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? '';
    return Object.entries(c.errors).find(([key]) => message.includes(key))?.[1] ?? c.error;
  };
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('not_updatable');
      const validation = payoutReviewError(selected.status, action, reference, note, transferred);
      if (validation) throw new Error(validation);
      const { error } = await supabase.rpc('admin_review_referral_payout', {
        p_id: selected.id, p_status: action, p_expected_status: selected.status,
        p_reference: reference.trim() || null, p_note: note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setSelected(null);
      await Promise.all([qc.invalidateQueries({ queryKey: ['admin-referral-payouts'] }), qc.invalidateQueries({ queryKey: ['referral-dashboard'] })]);
      toast({ title: c.saved });
    },
    onError: (e) => { setFormError(errorText(e)); void qc.invalidateQueries({ queryKey: ['admin-referral-payouts'] }); },
  });
  const open = (r: Row) => {
    setSelected(r); setAction(r.status === 'processing' ? 'paid' : 'processing');
    setReference(r.transaction_reference ?? ''); setNote(r.admin_note ?? ''); setTransferred(false); setFormError(null);
  };
  if (loading || admin.isPending) return <AppLayout><Loader2 className="mx-auto my-12 h-6 w-6 animate-spin text-muted-foreground" /></AppLayout>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!admin.data) return <Navigate to="/calendar" replace />;

  return <AppLayout>
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Wallet className="h-6 w-6 text-primary" />{c.title}</h1>
        <Button variant="outline" disabled={q.isFetching} onClick={() => void q.refetch()}><RefreshCw className={`mr-2 h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} />{c.refresh}</Button>
      </header>
      <p className="border-l-2 border-primary pl-3 text-sm text-muted-foreground">{c.warning}</p>
      <div className="grid grid-cols-2 gap-4 border-y border-border py-4 sm:grid-cols-3">
        {['pending', 'processing', 'paid'].map(s => <div key={s}><p className="text-sm text-muted-foreground">{c.states[s]}</p><p className="text-2xl font-semibold">{(q.data ?? []).filter(r => r.status === s).length}</p></div>)}
      </div>
      <div className="flex flex-wrap gap-3">
        <Input aria-label={c.search} placeholder={c.search} className="max-w-md" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        <Select value={filter} onValueChange={v => { setFilter(v); setPage(0); }}><SelectTrigger className="w-full sm:w-56" aria-label={c.status}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{c.all}</SelectItem>{Object.entries(c.states).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
      </div>
      {q.isError ? <div role="alert" className="space-y-3 text-destructive"><p>{c.error}</p><Button variant="outline" onClick={() => void q.refetch()}>{c.retry}</Button></div> : <>
        <div className="overflow-x-auto border-y border-border"><Table>
          <TableHeader><TableRow><TableHead>{c.recipient}</TableHead><TableHead>{c.requested}</TableHead><TableHead>{c.amount}</TableHead><TableHead>{c.method}</TableHead><TableHead>{c.status}</TableHead><TableHead>{c.reference}</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{visibleRows.map(r => <TableRow key={r.id}>
            <TableCell><p className="font-medium">{r.full_name || '—'}</p><p className="text-xs text-muted-foreground">{r.email || r.referrer_user_id}</p></TableCell>
            <TableCell className="whitespace-nowrap">{date(r.requested_at)}</TableCell><TableCell className="whitespace-nowrap font-semibold">{money(r)}</TableCell>
            <TableCell>{r.payout_method === 'bank_card' ? 'Card' : r.payout_method === 'iban' ? 'IBAN' : 'PayPal'}</TableCell>
            <TableCell><Badge variant={r.status === 'paid' ? 'default' : 'outline'} className="whitespace-nowrap">{c.states[r.status]}</Badge></TableCell>
            <TableCell className="max-w-48 break-all text-xs">{r.transaction_reference || '—'}</TableCell>
            <TableCell><Button variant="outline" size="sm" onClick={() => open(r)}><Eye className="mr-2 h-4 w-4" />{c.review}</Button></TableCell>
          </TableRow>)}{visibleRows.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">{q.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : c.empty}</TableCell></TableRow>}</TableBody>
        </Table></div>
        <div className="flex items-center justify-end gap-3"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>{c.prev}</Button><span className="text-sm text-muted-foreground">{page + 1} / {pages}</span><Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>{c.next}</Button></div>
      </>}
      <Dialog open={!!selected} onOpenChange={value => { if (!value && !mutation.isPending) setSelected(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{c.review}</DialogTitle><DialogDescription>{selected ? `${selected.full_name || selected.email || selected.referrer_user_id} · ${money(selected)}` : ''}</DialogDescription></DialogHeader>
        {selected && <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">{c.status}</dt><dd>{c.states[selected.status]}</dd></div><div><dt className="text-muted-foreground">{c.requested}</dt><dd>{date(selected.requested_at)}</dd></div><div className="col-span-2"><dt className="text-muted-foreground">{c.details} · {selected.payout_method}</dt><dd className="select-text break-all rounded-md bg-muted p-3 font-mono">{selected.payout_details}</dd></div></dl>
          {active ? <>
            <div className="flex flex-wrap gap-2">{(['processing','paid','rejected'] as ReviewAction[]).filter(a => canReviewPayout(selected.status,a)).map(a => <Button key={a} disabled={mutation.isPending} variant={action === a ? 'default' : 'outline'} onClick={() => { setAction(a); setFormError(null); }} aria-pressed={action === a}>{a === 'processing' ? c.approve : a === 'paid' ? c.paid : c.reject}</Button>)}</div>
            {action === 'paid' && <><div className="space-y-2"><Label htmlFor="payout-reference">{c.reference} *</Label><Input id="payout-reference" maxLength={200} value={reference} disabled={mutation.isPending} onChange={e => setReference(e.target.value)} /></div><div className="flex items-start gap-2"><Checkbox id="payout-transferred" checked={transferred} disabled={mutation.isPending} onCheckedChange={v => setTransferred(v === true)} /><Label htmlFor="payout-transferred" className="leading-5">{c.transferred}</Label></div></>}
            <div className="space-y-2"><Label htmlFor="payout-note">{c.note}{action === 'rejected' ? ' *' : ''}</Label><Textarea id="payout-note" maxLength={1000} value={note} disabled={mutation.isPending} onChange={e => setNote(e.target.value)} /></div>
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
          </> : <dl className="space-y-2 text-sm"><dt className="text-muted-foreground">{c.processed}</dt><dd>{date(selected.processed_at)}</dd><dt className="text-muted-foreground">{c.reference}</dt><dd className="break-all">{selected.transaction_reference || '—'}</dd><dt className="text-muted-foreground">{c.note}</dt><dd className="whitespace-pre-wrap break-words">{selected.admin_note || '—'}</dd></dl>}
        </div>}
        <DialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={() => setSelected(null)}>{c.cancel}</Button>{active && <Button disabled={mutation.isPending || !!payoutReviewError(selected?.status ?? '', action, reference, note, transferred)} onClick={() => mutation.mutate()}>{mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{c.save}</Button>}</DialogFooter>
      </DialogContent></Dialog>
    </div>
  </AppLayout>;
}