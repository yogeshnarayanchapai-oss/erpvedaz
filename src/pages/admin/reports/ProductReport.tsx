import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useLeads } from '@/hooks/useLeads';
import { useOrders } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProductReport() {
  const navigate = useNavigate();
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfDay(today), to: endOfDay(today) });
  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  const { data: leads = [] } = useLeads({ dateFrom, dateTo });
  const { data: orders = [] } = useOrders({ dateFrom, dateTo });
  const { data: products = [] } = useProducts();

  const productPerformance = useMemo(() => {
    return products.map(product => {
      const productLeads = leads.filter(l => l.product_id === product.id);
      const productOrders = orders.filter(o => o.product_id === product.id);
      const confirmed = productLeads.filter(l => l.status === 'CONFIRMED').length;
      const delivered = productOrders.filter(o => o.order_status === 'DELIVERED').length;
      const returned = productOrders.filter(o => o.order_status === 'RETURNED').length;
      return {
        name: product.name,
        leads: productLeads.length,
        confirmed,
        orders: productOrders.length,
        revenue: productOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
        delivered,
        returned,
        conversion: productLeads.length > 0 ? ((confirmed / productLeads.length) * 100).toFixed(1) : '0',
      };
    }).filter(p => p.leads > 0 || p.orders > 0).sort((a, b) => b.revenue - a.revenue);
  }, [products, leads, orders]);

  const exportCSV = () => {
    const headers = ['Product', 'Leads', 'Confirmed', 'Orders', 'Revenue', 'Delivered', 'Returned', 'Conversion%'];
    const rows = productPerformance.map(p => [p.name, p.leads, p.confirmed, p.orders, p.revenue, p.delivered, p.returned, p.conversion]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `product-report-${dateFrom}-${dateTo}.csv`; a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/reports')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Product Report</h1>
            <p className="text-muted-foreground">Product-wise leads, orders, revenue & conversion</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> Export</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Product Performance Chart</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={productPerformance.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="leads" fill="hsl(var(--chart-1))" name="Leads" />
              <Bar dataKey="orders" fill="hsl(var(--chart-2))" name="Orders" />
              <Bar dataKey="delivered" fill="hsl(var(--success))" name="Delivered" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Product Breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Confirmed</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Returned</TableHead>
                <TableHead className="text-right">Conv %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productPerformance.map(p => (
                <TableRow key={p.name}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">{p.leads}</TableCell>
                  <TableCell className="text-right">{p.confirmed}</TableCell>
                  <TableCell className="text-right">{p.orders}</TableCell>
                  <TableCell className="text-right">Rs {p.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-success">{p.delivered}</TableCell>
                  <TableCell className="text-right text-destructive">{p.returned}</TableCell>
                  <TableCell className="text-right">{p.conversion}%</TableCell>
                </TableRow>
              ))}
              {productPerformance.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
