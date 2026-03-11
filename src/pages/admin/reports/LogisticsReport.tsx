import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useOrders } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Truck, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--chart-3))', 'hsl(var(--destructive))', 'hsl(var(--primary))'];

export default function LogisticsReport() {
  const navigate = useNavigate();
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfDay(today), to: endOfDay(today) });
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');
  const { data: orders = [] } = useOrders({ dateFrom, dateTo });

  const ivdOrders = orders.filter(o => o.delivery_location === 'INSIDE_VALLEY');
  const ovdOrders = orders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY');

  const ivdStats = {
    total: ivdOrders.length,
    delivered: ivdOrders.filter(o => o.order_status === 'DELIVERED').length,
    pending: ivdOrders.filter(o => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.order_status || '')).length,
    returned: ivdOrders.filter(o => o.order_status === 'RETURNED').length,
  };
  const ovdStats = {
    total: ovdOrders.length,
    delivered: ovdOrders.filter(o => o.order_status === 'DELIVERED').length,
    pending: ovdOrders.filter(o => !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(o.order_status || '')).length,
    returned: ovdOrders.filter(o => o.order_status === 'RETURNED').length,
  };

  const zoneData = [
    { name: 'Inside Valley', ...ivdStats },
    { name: 'Outside Valley', ...ovdStats },
  ];

  const courierSummary = useMemo(() => {
    const map: Record<string, { orders: number; delivered: number; pending: number; returned: number }> = {};
    ovdOrders.forEach(o => {
      const c = o.shipping_partner || 'Unassigned';
      if (!map[c]) map[c] = { orders: 0, delivered: 0, pending: 0, returned: 0 };
      map[c].orders++;
      if (o.order_status === 'DELIVERED') map[c].delivered++;
      else if (o.order_status === 'RETURNED') map[c].returned++;
      else map[c].pending++;
    });
    return Object.entries(map).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => b.orders - a.orders);
  }, [ovdOrders]);

  const branchSummary = useMemo(() => {
    const map: Record<string, { orders: number; delivered: number; amount: number }> = {};
    orders.forEach(o => {
      const b = o.destination_branch || 'Unknown';
      if (!map[b]) map[b] = { orders: 0, delivered: 0, amount: 0 };
      map[b].orders++;
      map[b].amount += o.amount || 0;
      if (o.order_status === 'DELIVERED') map[b].delivered++;
    });
    return Object.entries(map).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => b.orders - a.orders);
  }, [orders]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/reports')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Logistics Report</h1>
            <p className="text-muted-foreground">Inside/Outside valley, courier & branch summary</p>
          </div>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">IVD Orders</p><p className="text-2xl font-bold">{ivdStats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">OVD Orders</p><p className="text-2xl font-bold">{ovdStats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Delivered</p><p className="text-2xl font-bold text-success">{ivdStats.delivered + ovdStats.delivered}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Returned</p><p className="text-2xl font-bold text-destructive">{ivdStats.returned + ovdStats.returned}</p></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Zone Comparison</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={zoneData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="delivered" fill="hsl(var(--success))" name="Delivered" />
                <Bar dataKey="pending" fill="hsl(var(--warning))" name="Pending" />
                <Bar dataKey="returned" fill="hsl(var(--destructive))" name="Returned" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Courier Performance (OVD)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Courier</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Returned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courierSummary.map(c => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right">{c.orders}</TableCell>
                    <TableCell className="text-right text-success">{c.delivered}</TableCell>
                    <TableCell className="text-right text-destructive">{c.returned}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Branch Summary</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branchSummary.map(b => (
                <TableRow key={b.name}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-right">{b.orders}</TableCell>
                  <TableCell className="text-right text-success">{b.delivered}</TableCell>
                  <TableCell className="text-right">Rs {b.amount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
