import { useState, useMemo } from 'react';
import { useAds } from '@/hooks/useAds';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, TrendingUp, Package, Megaphone, 
  ArrowRight, BarChart3 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { format, subDays } from 'date-fns';

export default function MarketingDashboard() {
  const navigate = useNavigate();
  const today = new Date();
  const [dollarRate, setDollarRate] = useState(133.5);
  
  const { data: products = [] } = useProducts();
  const { data: todayAds = [] } = useAds({ 
    dateFrom: format(today, 'yyyy-MM-dd'), 
    dateTo: format(today, 'yyyy-MM-dd') 
  });
  const { data: monthAds = [] } = useAds({ 
    dateFrom: format(subDays(today, 30), 'yyyy-MM-dd'), 
    dateTo: format(today, 'yyyy-MM-dd') 
  });
  const { data: orders = [] } = useOrders({ 
    dateFrom: format(today, 'yyyy-MM-dd'), 
    dateTo: format(today, 'yyyy-MM-dd') 
  });

  const todayAdsSpendUSD = todayAds.reduce((sum, ad) => sum + (ad.amount_spent / dollarRate), 0);
  const todayAdsSpendNPR = todayAdsSpendUSD * dollarRate;
  const monthAdsSpendNPR = monthAds.reduce((sum, ad) => sum + ad.amount_spent, 0);

  const todaySales = orders
    .filter(o => ['CONFIRMED', 'DISPATCHED', 'DELIVERED'].includes(o.order_status || ''))
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  const productDaybook = useMemo(() => {
    return products.map(product => {
      const productOrders = orders.filter(o => o.product_id === product.id);
      const count = productOrders.length;
      const revenue = productOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
      const productAds = todayAds.filter(a => a.product_id === product.id);
      const adSpend = productAds.reduce((sum, a) => sum + a.amount_spent, 0);
      return {
        name: product.name,
        target: product.target_per_day || 0,
        sold: count,
        revenue,
        adSpend,
        roi: adSpend > 0 ? ((revenue - adSpend) / adSpend * 100).toFixed(1) : '∞',
      };
    });
  }, [products, orders, todayAds]);

  // Last 7 days trend
  const adsTrend = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayAds = monthAds.filter(a => a.date === dateStr);
      const spend = dayAds.reduce((sum, a) => sum + a.amount_spent, 0);
      days.push({
        day: format(date, 'EEE'),
        spend,
      });
    }
    return days;
  }, [monthAds, today]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing Dashboard</h1>
          <p className="text-muted-foreground">Ads spend and product performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">USD Rate:</Label>
          <Input
            type="number"
            className="w-24"
            value={dollarRate}
            onChange={(e) => setDollarRate(parseFloat(e.target.value) || 133.5)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Today's Ads (USD)" 
          value={`$${todayAdsSpendUSD.toFixed(2)}`} 
          icon={<DollarSign className="w-5 h-5" />} 
          variant="primary" 
        />
        <StatCard 
          title="Today's Ads (NPR)" 
          value={`₹${todayAdsSpendNPR.toLocaleString()}`} 
          icon={<Megaphone className="w-5 h-5" />} 
          variant="info" 
        />
        <StatCard 
          title="Monthly Ads Spend" 
          value={`₹${monthAdsSpendNPR.toLocaleString()}`} 
          icon={<TrendingUp className="w-5 h-5" />} 
          variant="warning" 
        />
        <StatCard 
          title="Today's Sales" 
          value={`₹${todaySales.toLocaleString()}`} 
          icon={<Package className="w-5 h-5" />} 
          variant="success" 
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/marketing/ads')}>
          <Megaphone className="w-5 h-5" />
          <span>Manage Ads</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/marketing/daybook')}>
          <BarChart3 className="w-5 h-5" />
          <span>Product Daybook</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/marketing/performance')}>
          <TrendingUp className="w-5 h-5" />
          <span>Performance</span>
        </Button>
      </div>

      {/* Ads Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Last 7 Days Ads Spend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={adsTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Ad Spend']}
                />
                <Line 
                  type="monotone" 
                  dataKey="spend" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-1))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Product Daybook */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Today's Product Performance
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/marketing/daybook')}>
            Full Daybook <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Ad Spend</TableHead>
                <TableHead className="text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productDaybook.map((product, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-right">{product.target}</TableCell>
                  <TableCell className="text-right">{product.sold}</TableCell>
                  <TableCell className="text-right">₹{product.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">₹{product.adSpend.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-emerald-600">{product.roi}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
