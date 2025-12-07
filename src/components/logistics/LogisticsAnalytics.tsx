import { useMemo } from 'react';
import { format, eachDayOfInterval, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DateRange } from '@/components/ui/DateRangeFilter';
import { LogisticsOrder } from '@/hooks/useLogistics';

interface LogisticsAnalyticsProps {
  dateRange: DateRange;
  orders: LogisticsOrder[];
}

const COLORS = {
  NCM: 'hsl(var(--chart-1))',
  PATHAO: 'hsl(var(--chart-2))',
  GBL: 'hsl(var(--chart-3))',
  OTHER: 'hsl(var(--chart-4))',
};

export function LogisticsAnalytics({ dateRange, orders }: LogisticsAnalyticsProps) {
  // Delivery Performance per Courier
  const courierPerformance = useMemo(() => {
    const stats: Record<string, { total: number; delivered: number; rto: number; pending: number }> = {};
    
    orders.forEach(order => {
      if (!stats[order.courier]) {
        stats[order.courier] = { total: 0, delivered: 0, rto: 0, pending: 0 };
      }
      stats[order.courier].total++;
      if (order.delivery_status === 'DELIVERED') stats[order.courier].delivered++;
      else if (['RTO', 'RETURNED_TO_SELLER'].includes(order.delivery_status)) stats[order.courier].rto++;
      else stats[order.courier].pending++;
    });

    return Object.entries(stats).map(([courier, data]) => ({
      courier,
      ...data,
      deliveryRate: data.total > 0 ? ((data.delivered / data.total) * 100).toFixed(1) : '0',
    }));
  }, [orders]);

  // RTO Rate per Courier
  const rtoRates = useMemo(() => {
    return courierPerformance.map(stat => ({
      courier: stat.courier,
      rtoRate: stat.total > 0 ? ((stat.rto / stat.total) * 100).toFixed(1) : '0',
    }));
  }, [courierPerformance]);

  // Daily Delivery Volume
  const dailyVolume = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const volumeMap: Record<string, Record<string, number>> = {};

    days.forEach(day => {
      const dateStr = format(day, 'MMM dd');
      volumeMap[dateStr] = { NCM: 0, PATHAO: 0, GBL: 0, OTHER: 0 };
    });

    orders.forEach(order => {
      const dateStr = format(new Date(order.created_at), 'MMM dd');
      if (volumeMap[dateStr]) {
        const courier = ['NCM', 'PATHAO', 'GBL'].includes(order.courier) ? order.courier : 'OTHER';
        volumeMap[dateStr][courier]++;
      }
    });

    return Object.entries(volumeMap).map(([date, data]) => ({
      date,
      ...data,
    }));
  }, [orders, dateRange]);

  // Daily Courier Cost (estimated)
  const dailyCost = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const costMap: Record<string, number> = {};

    days.forEach(day => {
      const dateStr = format(day, 'MMM dd');
      costMap[dateStr] = 0;
    });

    orders.forEach(order => {
      if (order.delivery_status === 'DELIVERED') {
        const dateStr = format(new Date(order.actual_delivery || order.updated_at), 'MMM dd');
        if (costMap[dateStr] !== undefined) {
          // Estimated courier charges: 150 NPR per delivery
          costMap[dateStr] += 150;
        }
      }
    });

    return Object.entries(costMap).map(([date, cost]) => ({
      date,
      cost,
    }));
  }, [orders, dateRange]);

  // Average Delivery Time (in days)
  const avgDeliveryTime = useMemo(() => {
    const deliveryTimes: Record<string, number[]> = {};

    orders.forEach(order => {
      if (order.delivery_status === 'DELIVERED' && order.actual_delivery) {
        const created = new Date(order.created_at);
        const delivered = new Date(order.actual_delivery);
        const days = Math.ceil((delivered.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        
        if (!deliveryTimes[order.courier]) deliveryTimes[order.courier] = [];
        deliveryTimes[order.courier].push(days);
      }
    });

    return Object.entries(deliveryTimes).map(([courier, times]) => ({
      courier,
      avgDays: times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : '0',
    }));
  }, [orders]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Logistics Analytics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Performance per Courier */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Performance by Courier</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={courierPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="courier" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="delivered" fill="hsl(var(--success))" name="Delivered" />
                <Bar dataKey="pending" fill="hsl(var(--warning))" name="Pending" />
                <Bar dataKey="rto" fill="hsl(var(--destructive))" name="RTO" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* RTO Rate per Courier */}
        <Card>
          <CardHeader>
            <CardTitle>RTO Rate by Courier</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rtoRates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="courier" />
                <YAxis />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="rtoRate" fill="hsl(var(--destructive))" label={{ position: 'top', formatter: (v: number) => `${v}%` }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Delivery Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Delivery Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyVolume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="NCM" stackId="a" fill={COLORS.NCM} />
                <Bar dataKey="PATHAO" stackId="a" fill={COLORS.PATHAO} />
                <Bar dataKey="GBL" stackId="a" fill={COLORS.GBL} />
                <Bar dataKey="OTHER" stackId="a" fill={COLORS.OTHER} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Courier Cost */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Courier Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyCost}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `NPR ${value}`} />
                <Line type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Average Delivery Time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Average Delivery Time (Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={avgDeliveryTime} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="courier" type="category" />
                <Tooltip formatter={(value) => `${value} days`} />
                <Bar dataKey="avgDays" fill="hsl(var(--info))" label={{ position: 'right', formatter: (v: number) => `${v}d` }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
