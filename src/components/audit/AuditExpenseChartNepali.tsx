import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { formatNPR } from '@/lib/currency';

interface ExpenseData {
  name: string;
  value: number;
}

interface AuditExpenseChartNepaliProps {
  data: ExpenseData[];
  title?: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--destructive))',
  'hsl(142, 76%, 36%)', // green
  'hsl(45, 93%, 47%)',  // amber
  'hsl(262, 83%, 58%)', // purple
  'hsl(199, 89%, 48%)', // cyan
  'hsl(25, 95%, 53%)',  // orange
  'hsl(350, 89%, 60%)', // pink
];

export function AuditExpenseChartNepali({ data, title = 'Expense Distribution' }: AuditExpenseChartNepaliProps) {
  const totalExpense = data.reduce((sum, item) => sum + item.value, 0);

  const dataWithPercent = data.map(item => ({
    ...item,
    percent: totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-destructive" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No expense data available for selected period
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={dataWithPercent}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${percent}%`}
                >
                  {dataWithPercent.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [formatNPR(value), name]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend with values */}
            <div className="space-y-2 min-w-[180px]">
              {dataWithPercent.slice(0, 6).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-muted-foreground truncate max-w-[100px]">{item.name}</span>
                  </div>
                  <span className="font-medium">{formatNPR(item.value)}</span>
                </div>
              ))}
              {data.length > 6 && (
                <div className="text-xs text-muted-foreground">
                  +{data.length - 6} more categories
                </div>
              )}
              <div className="pt-2 border-t">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatNPR(totalExpense)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
