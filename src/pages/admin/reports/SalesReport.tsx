import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useLeads } from '@/hooks/useLeads';
import { useOrders } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, ShoppingCart, TrendingUp, DollarSign, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function SalesReport() {
  const navigate = useNavigate();
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(today),
    to: endOfDay(today),
  });

  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  const { data: orders = [] } = useOrders({ dateFrom, dateTo });
  const { data: products = [] } = useProducts();

  const activeOrders = orders.filter(o => !['CANCELLED', 'RETURNED'].includes(o.order_status || ''));
  const totalRevenue = activeOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalOrders = activeOrders.length;
  const deliveredOrders = orders.filter(o => o.order_status === 'DELIVERED');
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Product-wise sales
  const productSales = useMemo(() => {
    return products.map(product => {
      const productOrders = activeOrders.filter(o => o.product_id === product.id);
      return {
        name: product.name,
        orders: productOrders.length,
        revenue: productOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
      };
    }).filter(p => p.orders > 0).sort((a, b) => b.revenue - a.revenue);
  }, [products, activeOrders]);

  // Status distribution
  const statusData = useMemo(() => {
    const statusMap: Record<string, number> = {};
    orders.forEach(o => {
      const status = o.order_status || 'Unknown';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const exportCSV = () => {
    const headers = ['Product', 'Orders', 'Revenue'];
    const rows = productSales.map(p => [p.name, p.orders, p.revenue]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateFrom}-${dateTo}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/reports')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Sales Report</h1>
            <p className="text-muted-foreground">Order revenue, product sales & trends</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <ShoppingCart className="w-4 h-4" /> Total Orders
            </div>
            <p className="text-2xl font-bold mt-1">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="w-4 h-4" /> Total Revenue
            </div>
            <p className="text-2xl font-bold mt-1">Rs {totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="w-4 h-4" /> Delivered
            </div>
            <p className="text-2xl font-bold mt-1">{deliveredOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Package className="w-4 h-4" /> Avg Order Value
            </div>
            <p className="text-2xl font-bold mt-1">Rs {avgOrderValue.toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Product-wise Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Product-wise Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productSales.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip formatter={(value: number) => `Rs ${value.toLocaleString()}`} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Product Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Sales Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Avg Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productSales.map(p => (
                <TableRow key={p.name}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">{p.orders}</TableCell>
                  <TableCell className="text-right">Rs {p.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">Rs {p.orders > 0 ? (p.revenue / p.orders).toFixed(0) : 0}</TableCell>
                </TableRow>
              ))}
              {productSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No sales data for this period</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
