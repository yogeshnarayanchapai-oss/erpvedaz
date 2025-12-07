import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { subDays, format, eachDayOfInterval } from 'date-fns';
import { ArrowLeft, Package, TrendingUp, Clock, XCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LogisticsStatsCard } from '@/components/logistics/LogisticsStatsCard';
import { useCourierDetail } from '@/hooks/useLogisticsStats';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CourierDetailPage() {
  const { courier } = useParams<{ courier: string }>();
  const courierName = courier?.toUpperCase() || '';

  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: orders, isLoading } = useCourierDetail(courierName, dateRange.from, dateRange.to);

  // Calculate stats
  const totalSent = orders?.length || 0;
  const delivered = orders?.filter(o => o.delivery_status === 'DELIVERED').length || 0;
  const undelivered = totalSent - delivered;
  const rto = orders?.filter(o => ['RETURNED_TO_SELLER', 'RTO'].includes(o.delivery_status)).length || 0;
  const rtoPercent = totalSent > 0 ? ((rto / totalSent) * 100).toFixed(2) : '0';
  const codCollected = orders?.filter(o => o.cod_collected).reduce((sum, o) => sum + (o.cod_amount || 0), 0) || 0;
  const codPending = orders?.reduce((sum, o) => sum + (o.cod_amount || 0), 0) - codCollected || 0;

  // Daily packets chart data
  const dailyData = eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayOrders = orders?.filter(o => format(new Date(o.created_at), 'yyyy-MM-dd') === dayStr) || [];
    return {
      date: format(day, 'MMM dd'),
      packets: dayOrders.length,
      value: dayOrders.reduce((sum, o) => sum + (o.cod_amount || 0), 0),
    };
  });

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/logistics-dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{courierName} Analytics</h1>
            <p className="text-muted-foreground">Detailed courier performance metrics</p>
          </div>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <LogisticsStatsCard
          title="Total Sent"
          value={totalSent}
          icon={Package}
        />
        <LogisticsStatsCard
          title="Delivered"
          value={delivered}
          icon={TrendingUp}
          description={`${totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(1) : 0}% delivery rate`}
          className="border-success/20"
        />
        <LogisticsStatsCard
          title="Undelivered"
          value={undelivered}
          icon={Clock}
          className="border-warning/20"
        />
        <LogisticsStatsCard
          title="RTO"
          value={rto}
          icon={XCircle}
          description={`${rtoPercent}% RTO rate`}
          className="border-destructive/20"
        />
      </div>

      {/* COD Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LogisticsStatsCard
          title="COD Collected"
          value={`NPR ${codCollected.toLocaleString()}`}
          icon={DollarSign}
          className="border-success/20"
        />
        <LogisticsStatsCard
          title="COD Pending"
          value={`NPR ${codPending.toLocaleString()}`}
          icon={Clock}
          className="border-warning/20"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Packets</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="packets" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Packet Value (NPR)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>COD Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tracking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading orders...
                    </TableCell>
                  </TableRow>
                ) : orders && orders.length > 0 ? (
                  orders.slice(0, 50).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{format(new Date(order.created_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="font-medium">{order.customer_name}</TableCell>
                      <TableCell>{order.customer_phone}</TableCell>
                      <TableCell>NPR {order.cod_amount?.toLocaleString() || 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.delivery_status}</Badge>
                      </TableCell>
                      <TableCell>
                        {order.tracking_id ? (
                          <span className="font-mono text-xs">{order.tracking_id}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
