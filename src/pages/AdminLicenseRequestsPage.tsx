import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkIsAdmin } from '@/lib/sessionGuard';
import type { Tables } from '@/integrations/supabase/types';

type Row = Tables<'license_requests'>;
type Action = 'approve' | 'decline' | 'reviewed';

const ERRORS: Record<string, string> = {
  status_changed: 'This request was changed by someone else. The list has been refreshed.',
  final_state: 'Approved or declined requests can no longer be changed.',
  invalid_until: 'Choose an end date in the future.',
  invalid_plan: 'Choose Solo or Pro.',
  not_admin: 'Only admins can review license requests.',
};
const errText = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return Object.entries(ERRORS).find(([k]) => m.includes(k))?.[1] ?? m;
};
const statusVariant = (s: string): 'default' | 'destructive' | 'secondary' | 'outline' => (s === 'approved' ? 'default' : s === 'declined' ? 'destructive' : s === 'new' ? 'secondary' : 'outline');
const inOneYear = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); };

export default function AdminLicenseRequestsPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const admin = useQuery({ queryKey: ['admin-access', user?.id], queryFn: checkIsAdmin, enabled: !!user });
  const [filter, setFilter] = useState('open');
  const [open, setOpen] = useState<{ row: Row; action: Action } | null>(null);
  const [plan, setPlan] = useState<'solo' | 'pro'>('pro');
  const [until, setUntil] = useState(inOneYear());
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');

  const q = useQuery({
    queryKey: ['admin-license-requests'], enabled: admin.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.from('license_requests').select('*').order('created_at', { ascending: false }).limit(1000);
      if (error) throw error;
      return data as Row[];
    },
  });

  const m = useMutation({
    mutationFn: async () => {
      if (!open) return;
      const { error } = await supabase.rpc('admin_review_license_request', {
        p_id: open.row.id, p_action: open.action, p_expected_status: open.row.status,
        p_plan: open.action === 'approve' ? plan : undefined,
        p_until: open.action === 'approve' ? new Date(`${until}T23:59:59Z`).toISOString() : undefined,
        p_note: note.trim() || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: open?.action === 'approve' ? 'Access granted' : 'Request updated' });
      setOpen(null);
      void qc.invalidateQueries({ queryKey: ['admin-license-requests'] });
    },
    onError: (e) => { setFormError(errText(e)); void qc.invalidateQueries({ queryKey: ['admin-license-requests'] }); },
  });

  if (loading || admin.isLoading) return <AppLayout><div className="p-8"><Loader2 className="h-5 w-5 animate-spin" /></div></AppLayout>;
  if (!user || admin.data !== true) return <Navigate to="/dashboard" replace />;

  const rows = (q.data ?? []).filter((r) => filter === 'all' || (filter === 'open' ? ['new', 'reviewed'].includes(r.status) : r.status === filter));
  const start = (row: Row, action: Action) => { setOpen({ row, action }); setPlan('pro'); setUntil(inOneYear()); setNote(row.admin_note ?? ''); setFormError(''); };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold flex items-center gap-2"><KeyRound className="h-6 w-6" /> License requests</h1>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {q.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : q.error ? <p className="text-destructive">{errText(q.error)}</p> : rows.length === 0 ? (
          <p className="text-muted-foreground">No license requests here.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Email</TableHead><TableHead>Message</TableHead>
                <TableHead>Status</TableHead><TableHead>Result</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const final = r.status === 'approved' || r.status === 'declined';
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell className="max-w-xs whitespace-pre-wrap text-sm">{r.message || '—'}</TableCell>
                      <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                      <TableCell className="text-sm">
                        {r.status === 'approved' && r.granted_plan ? `${r.granted_plan.toUpperCase()} until ${r.granted_until ? new Date(r.granted_until).toLocaleDateString() : '—'}` : ''}
                        {r.admin_note ? <div className="text-muted-foreground">{r.admin_note}</div> : null}
                      </TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        {!final && <>
                          {r.status === 'new' && <Button size="sm" variant="ghost" onClick={() => start(r, 'reviewed')}>Mark reviewed</Button>}
                          <Button size="sm" variant="outline" onClick={() => start(r, 'decline')}>Decline</Button>
                          <Button size="sm" onClick={() => start(r, 'approve')}>Approve</Button>
                        </>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{open?.action === 'approve' ? 'Approve license' : open?.action === 'decline' ? 'Decline request' : 'Mark as reviewed'}</DialogTitle>
            <DialogDescription>
              {open?.row.email}. {open?.action === 'approve' ? 'This gives access in the app only. It does not create or charge a Paddle subscription.' : 'Access does not change.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {open?.action === 'approve' && <>
              <div className="space-y-2"><Label>Plan</Label>
                <Select value={plan} onValueChange={(v) => setPlan(v as 'solo' | 'pro')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="solo">Solo Practice</SelectItem><SelectItem value="pro">Pro Practice</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="lr-until">Access until</Label>
                <Input id="lr-until" type="date" value={until} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setUntil(e.target.value)} />
              </div>
            </>}
            <div className="space-y-2"><Label htmlFor="lr-note">Note (optional)</Label>
              <Textarea id="lr-note" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button disabled={m.isPending || (open?.action === 'approve' && !until)} onClick={() => { setFormError(''); m.mutate(); }}>
              {m.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
