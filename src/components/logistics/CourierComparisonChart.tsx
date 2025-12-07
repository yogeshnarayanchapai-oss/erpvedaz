import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CourierStats } from '@/hooks/useLogisticsStats';

interface CourierComparisonChartProps {
  data: CourierStats[];
}

export function CourierComparisonChart({ data }: CourierComparisonChartProps) {
  const chartData = data.map(stat => ({
    name: stat.courier,
    Total: stat.total,
    Delivered: stat.delivered,
    'In Transit': stat.inTransit,
    RTO: stat.rto,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Courier Performance Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Total" fill="hsl(var(--chart-1))" />
            <Bar dataKey="Delivered" fill="hsl(var(--chart-2))" />
            <Bar dataKey="In Transit" fill="hsl(var(--chart-3))" />
            <Bar dataKey="RTO" fill="hsl(var(--chart-5))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
