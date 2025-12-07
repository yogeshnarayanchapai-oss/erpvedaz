import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  useLogisticsOrders,
  useCODSettlements,
  useLogisticsDashboardMetrics,
  CourierProvider,
  LogisticsDeliveryStatus,
} from '@/hooks/useLogistics';
import {
  Truck,
  Package,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Clock,
  RotateCcw,
  Calendar,
  Search,
  Download,
  ExternalLink,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COURIER_COLORS: Record<CourierProvider, string> = {
  NCM: '#3B82F6',
  GBL: '#22C55E',
  PATHAO: '#F97316',
  GAAUBESI: '#8B5CF6',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_PICKUP: '#6B7280',
  PICKED_UP: '#3B82F6',
  IN_TRANSIT: '#EAB308',
  OUT_FOR_DELIVERY: '#F97316',
  DELIVERED: '#22C55E',
  CANCELED: '#EF4444',
  RTO: '#DC2626',
  RETURNED_TO_SELLER: '#991B1B',
};

export default function AdminLogisticsDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const last30Days = subDays(new Date(), 30).toISOString().split('T')[0];
  
  const [dateFrom, setDateFrom] = useState(last30Days);
  const [dateTo, setDateTo] = useState(today);
  const [courierFilter, setCourierFilter] = useState<CourierProvider | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<LogisticsDeliveryStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const { data: orders = [], isLoading } = useLogisticsOrders({
    dateFrom,
    dateTo,
    courier: courierFilter === 'ALL' ? undefined : courierFilter,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  });

  const { data: settlements = [] } = useCODSettlements({ dateFrom, dateTo });
  const metrics = useLogisticsDashboardMetrics(dateFrom, dateTo);

  // Filtered orders for table
  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const searchLower = search.toLowerCase();
    return orders.filter(o =>
      o.customer_name?.toLowerCase().includes(searchLower) ||
      o.customer_phone?.includes(search) ||
      o.tracking_id?.toLowerCase().includes(searchLower)
    );
  }, [orders, search]);

  // Chart data - orders by courier
  const courierChartData = [
    { name: 'NCM', total: metrics.byCourier.NCM.total, delivered: metrics.byCourier.NCM.delivered, rto: metrics.byCourier.NCM.rto },
    { name: 'GBL', total: metrics.byCourier.GBL.total, delivered: metrics.byCourier.GBL.delivered, rto: metrics.byCourier.GBL.rto },
    { name: 'Pathao', total: metrics.byCourier.PATHAO.total, delivered: metrics.byCourier.PATHAO.delivered, rto: metrics.byCourier.PATHAO.rto },
    { name: 'Gaaubesi', total: metrics.byCourier.GAAUBESI.total, delivered: metrics.byCourier.GAAUBESI.delivered, rto: metrics.byCourier.GAAUBESI.rto },
  ];

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      counts[o.delivery_status] = (counts[o.delivery_status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      value: count,
      color: STATUS_COLORS[status] || '#6B7280',
    }));
  }, [orders]);

  // Calculate delivery rate
  const deliveryRate = metrics.total.orders > 0
    ? ((metrics.total.delivered / metrics.total.orders) * 100).toFixed(1)
    : '0';

  const rtoRate = metrics.total.orders > 0
    ? ((metrics.total.rto / metrics.total.orders) * 100).toFixed(1)
    : '0';

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6" />
            Logistics Dashboard
          </h1>
          <p className="text-muted-foreground">Courier performance and delivery tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard
          title="Total Sent"
          value={metrics.total.orders}
          icon={<Package className="w-5 h-5" />}
          variant="default"
        />
        <StatCard
          title="Delivered"
          value={metrics.total.delivered}
          icon={<CheckCircle className="w-5 h-5" />}
          variant="success"
        />
        <StatCard
          title="In Transit"
          value={metrics.total.inTransit}
          icon={<Truck className="w-5 h-5" />}
          variant="primary"
        />
        <StatCard
          title="Pending Pickup"
          value={metrics.total.pendingPickup}
          icon={<Clock className="w-5 h-5" />}
          variant="warning"
        />
        <StatCard
          title="RTO / Returned"
          value={metrics.total.rto}
          icon={<RotateCcw className="w-5 h-5" />}
          variant="destructive"
        />
        <StatCard
          title="Delivery Rate"
          value={`${deliveryRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          variant={parseFloat(deliveryRate) >= 80 ? 'success' : parseFloat(deliveryRate) >= 60 ? 'warning' : 'destructive'}
        />
      </div>

      {/* COD Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total COD</p>
                <p className="text-2xl font-bold">₹{metrics.cod.total.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">COD Settled</p>
                <p className="text-2xl font-bold text-green-500">₹{metrics.cod.settled.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">COD Pending</p>
                <p className="text-2xl font-bold text-orange-500">₹{metrics.cod.pending.toLocaleString()}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Courier Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Courier Performance</CardTitle>
            <CardDescription>Orders by courier with delivery status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={courierChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="total" name="Total" fill="#6B7280" />
                <Bar dataKey="delivered" name="Delivered" fill="#22C55E" />
                <Bar dataKey="rto" name="RTO" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Distribution</CardTitle>
            <CardDescription>Current order status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Logistics Orders</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-60"
                />
              </div>
              <Select value={courierFilter} onValueChange={(v) => setCourierFilter(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Courier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Couriers</SelectItem>
                  <SelectItem value="NCM">NCM</SelectItem>
                  <SelectItem value="GBL">GBL</SelectItem>
                  <SelectItem value="PATHAO">Pathao</SelectItem>
                  <SelectItem value="GAAUBESI">Gaaubesi</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING_PICKUP">Pending Pickup</SelectItem>
                  <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="RTO">RTO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Courier</TableHead>
                  <TableHead>Tracking ID</TableHead>
                  <TableHead>COD</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.slice(0, 50).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(order.created_at), 'dd MMM HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">{order.customer_name}</TableCell>
                      <TableCell>{order.customer_phone}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ borderColor: COURIER_COLORS[order.courier], color: COURIER_COLORS[order.courier] }}
                        >
                          {order.courier}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{order.tracking_id || '-'}</TableCell>
                      <TableCell>₹{order.cod_amount?.toLocaleString() || '0'}</TableCell>
                      <TableCell>
                        <Badge
                          style={{ backgroundColor: `${STATUS_COLORS[order.delivery_status]}20`, color: STATUS_COLORS[order.delivery_status] }}
                        >
                          {formatStatus(order.delivery_status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredOrders.length > 50 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Showing 50 of {filteredOrders.length} orders
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
