import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useLeads } from '@/hooks/useLeads';
import { useOrders } from '@/hooks/useOrders';
import { useStaff } from '@/hooks/useStaff';
import { useCallLogs } from '@/hooks/useCallLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function CallingReport() {
  const navigate = useNavigate();
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfDay(today), to: endOfDay(today) });
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  const { data: leads = [] } = useLeads({ dateFrom, dateTo });
  const { data: orders = [] } = useOrders({ dateFrom, dateTo });
  const { data: callingStaff = [] } = useStaff('CALLING');
  const { data: callLogs = [] } = useCallLogs({ dateFrom, dateTo });

  const callingPerformance = useMemo(() => {
    return callingStaff.map(staff => {
      const staffLeads = leads.filter(l => l.assigned_to_user_id === staff.id);
      const staffOrders = orders.filter(o => o.sales_person_id === staff.id);
      const staffCalls = callLogs.filter(c => c.staff_id === staff.id);
      const assigned = staffLeads.length;
      const callsDone = staffCalls.length;
      const confirmedOrders = staffOrders.length;
      const ivd = staffOrders.filter(o => o.delivery_location === 'INSIDE_VALLEY').length;
      const ovd = staffOrders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length;
      const totalSales = staffOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
      const conversion = assigned > 0 ? ((confirmedOrders / assigned) * 100).toFixed(1) : '0';
      return { name: staff.name, assigned, callsDone, confirmedOrders, ivd, ovd, totalSales, conversion };
    }).filter(s => s.assigned > 0 || s.confirmedOrders > 0).sort((a, b) => b.confirmedOrders - a.confirmedOrders);
  }, [callingStaff, leads, orders, callLogs]);

  const totalCalls = callLogs.length;
  const totalConfirmed = orders.length;
  const totalSales = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/reports')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Calling Report</h1>
            <p className="text-muted-foreground">Calling team orders, conversion & sales</p>
          </div>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Calls</p><p className="text-2xl font-bold">{totalCalls}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Orders Confirmed</p><p className="text-2xl font-bold text-success">{totalConfirmed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Sales</p><p className="text-2xl font-bold">Rs {totalSales.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Staff Performance</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={callingPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="assigned" fill="hsl(var(--chart-1))" name="Assigned" />
              <Bar dataKey="confirmedOrders" fill="hsl(var(--success))" name="Confirmed" />
              <Bar dataKey="callsDone" fill="hsl(var(--chart-3))" name="Calls" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Calling Team Breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Confirmed</TableHead>
                <TableHead className="text-right">IVD</TableHead>
                <TableHead className="text-right">OVD</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Conv %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callingPerformance.map(s => (
                <TableRow key={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">{s.assigned}</TableCell>
                  <TableCell className="text-right">{s.callsDone}</TableCell>
                  <TableCell className="text-right text-success">{s.confirmedOrders}</TableCell>
                  <TableCell className="text-right">{s.ivd}</TableCell>
                  <TableCell className="text-right">{s.ovd}</TableCell>
                  <TableCell className="text-right">Rs {s.totalSales.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{s.conversion}%</TableCell>
                </TableRow>
              ))}
              {callingPerformance.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
