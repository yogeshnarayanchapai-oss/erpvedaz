import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { formatNPR } from '@/lib/currency';
import { adToBS, getBSMonthName } from '@/lib/nepaliDate';
import { useDateMode } from '@/contexts/DateModeContext';

interface SalesData {
  month: string;
  amount: number;
}

interface AuditSalesChartNepaliProps {
  data: SalesData[];
  title?: string;
}

export function AuditSalesChartNepali({ data, title = 'Monthly Sales' }: AuditSalesChartNepaliProps) {
  const { dateMode } = useDateMode();

  const formattedData = data.map(item => {
    let displayMonth = item.month;
    
    if (dateMode === 'BS' || dateMode === 'AD+BS') {
      try {
        // Convert YYYY-MM to BS month name
        const [year, month] = item.month.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 15);
        const bs = adToBS(date);
        displayMonth = `${getBSMonthName(bs.month).substring(0, 3)} ${bs.year}`;
      } catch {
        displayMonth = item.month;
      }
    } else {
      // Show AD month abbreviation
      const [year, month] = item.month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      displayMonth = `${monthNames[parseInt(month) - 1]} ${year.substring(2)}`;
    }

    return {
      ...item,
      displayMonth,
      originalMonth: item.month,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No sales data available for selected period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="displayMonth" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number) => [formatNPR(value), 'Sales']}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    const original = payload[0].payload.originalMonth;
                    return `${label} (${original})`;
                  }
                  return label;
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar 
                dataKey="amount" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                name="Sales"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
