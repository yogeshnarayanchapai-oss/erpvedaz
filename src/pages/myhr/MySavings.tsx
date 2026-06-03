import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PiggyBank } from 'lucide-react';
import { useMyHoldLedger } from '@/hooks/useCompanyHold';
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

export default function MySavings() {
  const { data: entries = [], isLoading } = useMyHoldLedger();

  const totals = useMemo(() => {
    let held = 0, released = 0;
    entries.forEach(e => { if (e.entry_type === 'HOLD') held += Number(e.amount); else released += Number(e.amount); });
    return { held, released, balance: held - released };
  }, [entries]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><PiggyBank className="w-6 h-6 text-primary" /> My Savings</h1>
        <p className="text-muted-foreground">Your salary hold balance and release history</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total Saved</div><div className="text-2xl font-bold text-primary">{formatNPR(totals.held)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total Released</div><div className="text-2xl font-bold text-destructive">{formatNPR(totals.released)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Available Balance</div><div className="text-2xl font-bold text-success">{formatNPR(totals.balance)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Month-wise Summary</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Saved</TableHead><TableHead className="text-right">Released</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center">Loading...</TableCell></TableRow>
              ) : monthly.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No savings yet</TableCell></TableRow>
              ) : monthly.map(m => (
                <TableRow key={m.month}>
                  <TableCell>{m.month}</TableCell>
                  <TableCell className="text-right text-primary">{formatNPR(m.held)}</TableCell>
                  <TableCell className="text-right text-destructive">{formatNPR(m.released)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Month</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No entries</TableCell></TableRow>
              ) : entries.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{format(new Date(e.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell><Badge variant={e.entry_type === 'HOLD' ? 'secondary' : 'default'}>{e.entry_type === 'HOLD' ? 'Saved' : 'Released'}</Badge></TableCell>
                  <TableCell className="text-sm">{bsLabel(e.month_start)}</TableCell>
                  <TableCell className={`text-right font-medium ${e.entry_type === 'HOLD' ? 'text-primary' : 'text-destructive'}`}>{formatNPR(Number(e.amount))}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
