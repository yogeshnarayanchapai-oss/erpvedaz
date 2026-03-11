import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useLeads } from '@/hooks/useLeads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, GitBranch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--success))', 'hsl(var(--warning))'];

export default function SourceAnalysisReport() {
  const navigate = useNavigate();
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfDay(today), to: endOfDay(today) });
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  const { data: leads = [] } = useLeads({ dateFrom, dateTo });

  const sourceData = useMemo(() => {
    const map: Record<string, { total: number; confirmed: number; cancelled: number; cnr: number }> = {};
    leads.forEach(l => {
      const source = l.source || 'Unknown';
      if (!map[source]) map[source] = { total: 0, confirmed: 0, cancelled: 0, cnr: 0 };
      map[source].total++;
      if (l.status === 'CONFIRMED' || l.order_id) map[source].confirmed++;
      if (l.status === 'CANCELLED') map[source].cancelled++;
      if (l.status === 'CALL_NOT_RECEIVED') map[source].cnr++;
    });
    return Object.entries(map).map(([name, stats]) => ({
      name,
      ...stats,
      conversion: stats.total > 0 ? ((stats.confirmed / stats.total) * 100).toFixed(1) : '0',
    })).sort((a, b) => b.total - a.total);
  }, [leads]);

  const pieData = sourceData.map(s => ({ name: s.name, value: s.total }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/reports')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Source Analysis</h1>
            <p className="text-muted-foreground">Lead source performance & conversion rates</p>
          </div>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Lead Distribution by Source</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Source Conversion</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="hsl(var(--chart-1))" name="Total" />
                <Bar dataKey="confirmed" fill="hsl(var(--success))" name="Confirmed" />
                <Bar dataKey="cancelled" fill="hsl(var(--destructive))" name="Cancelled" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Source Breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Confirmed</TableHead>
                <TableHead className="text-right">Cancelled</TableHead>
                <TableHead className="text-right">CNR</TableHead>
                <TableHead className="text-right">Conv %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceData.map(s => (
                <TableRow key={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">{s.total}</TableCell>
                  <TableCell className="text-right text-success">{s.confirmed}</TableCell>
                  <TableCell className="text-right text-destructive">{s.cancelled}</TableCell>
                  <TableCell className="text-right">{s.cnr}</TableCell>
                  <TableCell className="text-right">{s.conversion}%</TableCell>
                </TableRow>
              ))}
              {sourceData.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
