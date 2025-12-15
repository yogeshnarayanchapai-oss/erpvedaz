import { useState, useMemo } from 'react';
import { useAds } from '@/hooks/useAds';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, TrendingUp, Package, Megaphone, 
  ArrowRight, BarChart3, Calendar
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { format, subDays } from 'date-fns';
import { AdSpendReferenceModal } from '@/components/marketing/AdSpendReferenceModal';

export default function MarketingDashboard() {
  const navigate = useNavigate();
  const today = new Date();
  const [dollarRate, setDollarRate] = useState(133.5);
  const [showAdSpendModal, setShowAdSpendModal] = useState(false);
  const storeId = useCurrentStoreId();
  
  const { data: products = [] } = useProducts();
  
  // Fetch product inventory for stock quantities
  const { data: productInventory = [] } = useQuery({
    queryKey: ['product-inventory-summary', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from('product_inventory')
        .select('product_id, current_stock')
        .order('product_id');
      if (error) throw error;
      return data || [];
    },
    enabled: !!storeId,
  });
  
  // Create a map of product_id -> total stock
  const stockMap = useMemo(() => {
    const map: Record<string, number> = {};
    productInventory.forEach(inv => {
      map[inv.product_id] = (map[inv.product_id] || 0) + (inv.current_stock || 0);
    });
    return map;
  }, [productInventory]);
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
      const orderCount = productOrders.length;
      const qtySold = productOrders.reduce((sum, o) => sum + (o.quantity || 1), 0);
      const revenue = productOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
      const productAds = todayAds.filter(a => a.product_id === product.id);
      const adSpend = productAds.reduce((sum, a) => sum + a.amount_spent, 0);
      return {
        name: product.name,
        stockQty: stockMap[product.id] || 0,
        target: product.target_per_day || 0,
        orders: orderCount,
        qtySold,
        revenue,
        adSpend,
        roi: adSpend > 0 ? ((revenue - adSpend) / adSpend * 100).toFixed(1) : '∞',
      };
    });
  }, [products, orders, todayAds, stockMap]);

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
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Marketing Dashboard</h1>
          <p className="text-sm text-muted-foreground">Ads spend and product performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs md:text-sm whitespace-nowrap">USD Rate:</Label>
          <Input
            type="number"
            className="w-20 md:w-24 h-8"
            value={dollarRate}
            onChange={(e) => setDollarRate(parseFloat(e.target.value) || 133.5)}
          />
        </div>
      </div>

      {/* Stats - 2 cols on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <StatCard 
          title="Today's Ads (USD)" 
          value={`$${todayAdsSpendUSD.toFixed(2)}`} 
          icon={<DollarSign className="w-4 h-4 md:w-5 md:h-5" />} 
          variant="primary" 
        />
        <StatCard 
          title="Today's Ads (NPR)" 
          value={`₹${todayAdsSpendNPR.toLocaleString()}`} 
          icon={<Megaphone className="w-4 h-4 md:w-5 md:h-5" />} 
          variant="info" 
        />
        <StatCard 
          title="Monthly Ads" 
          value={`₹${monthAdsSpendNPR.toLocaleString()}`} 
          icon={<TrendingUp className="w-4 h-4 md:w-5 md:h-5" />} 
          variant="warning" 
        />
        <StatCard 
          title="Today's Sales" 
          value={`₹${todaySales.toLocaleString()}`} 
          icon={<Package className="w-4 h-4 md:w-5 md:h-5" />} 
          variant="success" 
        />
      </div>

      {/* Quick Actions - 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Button variant="outline" className="h-16 md:h-20 flex-col gap-1 md:gap-2 text-xs md:text-sm" onClick={() => navigate('/marketing/ads')}>
          <Megaphone className="w-4 h-4 md:w-5 md:h-5" />
          <span>Manage Ads</span>
        </Button>
        <Button variant="outline" className="h-16 md:h-20 flex-col gap-1 md:gap-2 text-xs md:text-sm" onClick={() => navigate('/marketing/daybook')}>
          <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
          <span>Product Daybook</span>
        </Button>
        <Button variant="outline" className="h-16 md:h-20 flex-col gap-1 md:gap-2 text-xs md:text-sm" onClick={() => navigate('/marketing/performance')}>
          <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
          <span>Performance</span>
        </Button>
        <Button variant="outline" className="h-16 md:h-20 flex-col gap-1 md:gap-2 text-xs md:text-sm" onClick={() => setShowAdSpendModal(true)}>
          <Calendar className="w-4 h-4 md:w-5 md:h-5" />
          <span>Ad Spend Table</span>
        </Button>
      </div>

      {/* Ad Spend Reference Modal */}
      <AdSpendReferenceModal open={showAdSpendModal} onOpenChange={setShowAdSpendModal} />

      {/* Ads Trend Chart */}
      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            Last 7 Days Ads Spend
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 md:px-6">
          <div className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={adsTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-[10px] md:text-xs" tick={{ fontSize: 10 }} />
                <YAxis className="text-[10px] md:text-xs" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Ad Spend']}
                />
                <Line 
                  type="monotone" 
                  dataKey="spend" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-1))', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Product Daybook */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Package className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            Today's Product Performance
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/marketing/daybook')} className="text-xs md:text-sm">
            Full Daybook <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {/* Mobile card view */}
          <div className="md:hidden space-y-2 p-4 pt-0">
            {productDaybook.map((product, idx) => (
              <Card key={idx} className="p-3">
                <p className="font-medium text-sm mb-2 truncate">{product.name}</p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Stock</span>
                    <p className="font-medium text-blue-600">{product.stockQty}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Orders</span>
                    <p className="font-medium">{product.orders}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sold</span>
                    <p className="font-medium text-green-600">{product.qtySold}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ROI</span>
                    <p className="font-medium text-emerald-600">{product.roi}%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs">
                  <span>Revenue: ₹{product.revenue.toLocaleString()}</span>
                  <span className="text-muted-foreground">Ad: ₹{product.adSpend.toLocaleString()}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Stock Qty</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Ad Spend</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productDaybook.map((product, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right text-blue-600 font-medium">{product.stockQty}</TableCell>
                    <TableCell className="text-right">{product.target}</TableCell>
                    <TableCell className="text-right">{product.orders}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{product.qtySold}</TableCell>
                    <TableCell className="text-right">₹{product.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{product.adSpend.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600">{product.roi}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
