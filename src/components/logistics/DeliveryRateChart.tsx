import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { CourierStats } from '@/hooks/useLogisticsStats';

interface DeliveryRateChartProps {
  data: CourierStats[];
}

export function DeliveryRateChart({ data }: DeliveryRateChartProps) {
  const chartData = data.map(stat => ({
    name: stat.courier,
    rate: stat.deliveryRate,
  }));

  const getColor = (rate: number) => {
    if (rate >= 90) return 'hsl(var(--chart-2))'; // green
    if (rate >= 75) return 'hsl(var(--chart-3))'; // yellow
    return 'hsl(var(--chart-5))'; // red
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Rate by Courier</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Bar dataKey="rate" label={{ position: 'top', formatter: (v: number) => `${v}%` }}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.rate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
