import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Receipt, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { checkIsAdmin } from '@/lib/sessionGuard';
import type { Tables } from '@/integrations/supabase/types';

type Row = Tables<'paddle_webhook_events'>;
type Json = Record<string, any>;

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString() : '—');
const statusVariant = (s: string): 'default' | 'destructive' | 'secondary' | 'outline' =>
  s === 'processed' ? 'default' : s === 'failed' ? 'destructive' : s === 'received' ? 'secondary' : 'outline';

function summary(r: Row): { kind: string; amount: string; detail: string } {
  const d: Json = ((r.payload as Json)?.data ?? {}) as Json;
  const kind = r.event_type.startsWith('transaction') ? 'Payment' : r.event_type.startsWith('subscription') ? 'Subscription' : 'Other';
  const cur = d.currency_code ?? '';
  const total = d.details?.totals?.grand_total ?? d.details?.totals?.total;
  const amount = total != null ? `${(Number(total) / 100).toFixed(2)} ${cur}` : '—';
  const item = d.items?.[0];
  const price = item?.price?.description ?? item?.price?.name ?? item?.price?.id ?? '';
  const interval = item?.price?.billing_cycle?.interval ?? d.billing_cycle?.interval ?? '';
  const detail = [d.status, price, interval].filter(Boolean).join(' · ');
  return { kind, amount, detail };
}

export default function AdminPaddleEventsPage() {
  const { user, loading } = useAuth();
  const admin = useQuery({ queryKey: ['admin-access', user?.id], queryFn: checkIsAdmin, enabled: !!user });
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Row | null>(null);

  const q = useQuery({
    queryKey: ['admin-paddle-events'], enabled: admin.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.from('paddle_webhook_events').select('*').order('received_at', { ascending: false }).limit(1000);
      if (error) throw error;
      return data as Row[];
    },
  });
  const names = useQuery({
    queryKey: ['admin-paddle-event-names', q.data?.length], enabled: !!q.data,
    queryFn: async () => {
      const ids = [...new Set((q.data ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
      if (!ids.length) return {} as Record<string, string>;
      const { data } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
      return Object.fromEntries((data ?? []).map((p) => [p.user_id, p.full_name ?? ''])) as Record<string, string>;
    },
  });

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((r) => {
      const k = summary(r).kind;
      if (kind !== 'all' && k !== kind) return false;
      if (status !== 'all' && !r.status.startsWith(status)) return false;
      if (!s) return true;
      return [r.event_type, r.subscription_id, r.customer_id, r.event_id, names.data?.[r.user_id ?? '']].some((v) => v?.toLowerCase().includes(s));
    });
  }, [q.data, kind, status, search, names.data]);

  if (loading || (user && admin.isLoading)) return <div className="p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!user || admin.data !== true) return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Receipt className="h-6 w-6" /> Paddle events</h1>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search customer, subscription, event" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="Payment">Payments</SelectItem>
                <SelectItem value="Subscription">Subscriptions</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
                <SelectItem value="received">Received</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => void q.refetch()} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Read-only record of every message Paddle sent. Nothing here changes subscriptions or moves money.</p>
        {q.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : q.error ? <p className="text-destructive">{(q.error as Error).message}</p> : rows.length === 0 ? (
          <p className="text-muted-foreground">No Paddle events yet. They appear here as soon as Paddle sends the next payment or subscription change.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Received</TableHead><TableHead>Event</TableHead><TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead><TableHead>Details</TableHead><TableHead>Status</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const s = summary(r);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{fmtDate(r.occurred_at ?? r.received_at)}</TableCell>
                      <TableCell><div className="font-medium">{r.event_type}</div><div className="text-xs text-muted-foreground">{s.kind}</div></TableCell>
                      <TableCell><div>{names.data?.[r.user_id ?? ''] || '—'}</div><div className="text-xs text-muted-foreground">{r.subscription_id ?? r.customer_id ?? ''}</div></TableCell>
                      <TableCell className="whitespace-nowrap">{s.amount}</TableCell>
                      <TableCell className="text-sm">{s.detail || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                        {r.attempts > 1 && <div className="text-xs text-muted-foreground">{r.attempts} attempts</div>}
                        {r.error && <div className="text-xs text-destructive max-w-xs truncate" title={r.error}>{r.error}</div>}
                      </TableCell>
                      <TableCell><Button variant="ghost" size="sm" onClick={() => setOpen(r)}>View</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{open?.event_type} · {open?.event_id}</DialogTitle></DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-xs">{open ? JSON.stringify(open.payload, null, 2) : ''}</pre>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
