import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Wallet, PiggyBank, ArrowDownToLine, Eye, Trash2 } from 'lucide-react';
import { useCompanyHoldSummary, useEmployeeHoldLedger, useReleaseHold, useDeleteHoldEntry, EmployeeHoldSummary } from '@/hooks/useCompanyHold';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { adToBS, getBSMonthName } from '@/lib/nepaliDate';

const formatNPR = (v: number) => `रू ${v.toLocaleString()}`;

function bsLabel(dateStr: string | null) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(15);
  const bs = adToBS(d);
  return `${getBSMonthName(bs.month)} ${bs.year}`;
}

export default function HRMCompanyHold() {
  const { profile } = useAuth();
  const { data: summary = [], isLoading } = useCompanyHoldSummary();
  const [selected, setSelected] = useState<EmployeeHoldSummary | null>(null);
  const [search, setSearch] = useState('');

  const canEdit = ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(profile?.role || '');

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return summary.filter(s => s.full_name.toLowerCase().includes(t));
  }, [summary, search]);

  const totals = useMemo(() => ({
    held: summary.reduce((s, r) => s + r.total_held, 0),
    released: summary.reduce((s, r) => s + r.total_released, 0),
    balance: summary.reduce((s, r) => s + r.balance, 0),
  }), [summary]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><PiggyBank className="w-6 h-6 text-primary" /> Company Hold / Staff Savings</h1>
          <p className="text-muted-foreground">Track salary hold balances and release history</p>
        </div>
        <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total Held</div><div className="text-2xl font-bold text-primary">{formatNPR(totals.held)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total Released</div><div className="text-2xl font-bold text-destructive">{formatNPR(totals.released)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Current Balance</div><div className="text-2xl font-bold text-success">{formatNPR(totals.balance)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Employees</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Total Held</TableHead>
                <TableHead className="text-right">Total Released</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No hold records yet</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.employee_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell className="text-right text-primary">{formatNPR(r.total_held)}</TableCell>
                  <TableCell className="text-right text-destructive">{formatNPR(r.total_released)}</TableCell>
                  <TableCell className="text-right font-bold text-success">{formatNPR(r.balance)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm"><Eye className="w-4 h-4 mr-1" />View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <HoldDetailDialog employee={selected} onClose={() => setSelected(null)} canEdit={canEdit} />
    </div>
  );
}

function HoldDetailDialog({ employee, onClose, canEdit }: { employee: EmployeeHoldSummary | null; onClose: () => void; canEdit: boolean }) {
  const { data: entries = [] } = useEmployeeHoldLedger(employee?.employee_id || null);
  const release = useReleaseHold();
  const del = useDeleteHoldEntry();
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const totals = useMemo(() => {
    let held = 0, released = 0;
    entries.forEach(e => {
      if (e.entry_type === 'HOLD') held += Number(e.amount);
      else released += Number(e.amount);
    });
    return { held, released, balance: held - released };
  }, [entries]);

  const handleRelease = async () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) return;
    if (a > totals.balance) {
      alert('Release amount exceeds current balance');
      return;
    }
    await release.mutateAsync({ employee_id: employee!.employee_id, amount: a, notes });
    setAmount(''); setNotes(''); setReleaseOpen(false);
  };

  return (
    <Dialog open={!!employee} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> {employee?.full_name} — Hold Details</DialogTitle>
        </DialogHeader>
        {employee && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-primary/10 rounded-lg"><div className="text-xs text-muted-foreground">Held</div><div className="font-bold text-primary">{formatNPR(totals.held)}</div></div>
              <div className="p-3 bg-destructive/10 rounded-lg"><div className="text-xs text-muted-foreground">Released</div><div className="font-bold text-destructive">{formatNPR(totals.released)}</div></div>
              <div className="p-3 bg-success/10 rounded-lg"><div className="text-xs text-muted-foreground">Balance</div><div className="font-bold text-success">{formatNPR(totals.balance)}</div></div>
            </div>

            {canEdit && (
              <div className="flex justify-end">
                <Button onClick={() => setReleaseOpen(true)} disabled={totals.balance <= 0}>
                  <ArrowDownToLine className="w-4 h-4 mr-2" /> Release Amount
                </Button>
              </div>
            )}


            <div>
              <h3 className="font-semibold mb-2">All Entries</h3>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Month</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Notes</TableHead>{canEdit && <TableHead></TableHead>}</TableRow></TableHeader>
                <TableBody>
                  {entries.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{format(new Date(e.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell><Badge variant={e.entry_type === 'HOLD' ? 'secondary' : 'default'}>{e.entry_type}</Badge></TableCell>
                      <TableCell className="text-sm">{bsLabel(e.month_start)}</TableCell>
                      <TableCell className={`text-right font-medium ${e.entry_type === 'HOLD' ? 'text-primary' : 'text-destructive'}`}>{formatNPR(Number(e.amount))}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.notes || '-'}</TableCell>
                      {canEdit && (
                        <TableCell>
                          {e.entry_type === 'RELEASE' && (
                            <Button variant="ghost" size="icon" onClick={() => del.mutate(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <Dialog open={releaseOpen} onOpenChange={setReleaseOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Release Hold Amount</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Amount (Available: {formatNPR(employee?.balance || 0)})</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
              <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason / reference..." /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReleaseOpen(false)}>Cancel</Button>
              <Button onClick={handleRelease} disabled={release.isPending}>Release</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
