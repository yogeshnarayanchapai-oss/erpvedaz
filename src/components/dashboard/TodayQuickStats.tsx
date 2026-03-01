import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getNepalDate, getNepalDayStart, getNepalDayEnd } from '@/hooks/useDashboardStats';
import { ShoppingCart, Package, AlertTriangle, TrendingUp, Clock, Truck } from 'lucide-react';

export function TodayQuickStats() {
  // Use Nepal timezone for today's date
  const today = getNepalDate();

  // Realtime removed — polling handles freshness

  const { data: stats } = useQuery({
    queryKey: ['today-quick-stats', today],
    queryFn: async () => {
      // Use Nepal timezone-aware date boundaries
      const todayStart = getNepalDayStart(today);
      const todayEnd = getNepalDayEnd(today);

      // Today's confirmed orders
      const { count: confirmedToday } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .eq('order_status', 'CONFIRMED')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      // Pending dispatch (confirmed but not sent to courier)
      const { count: pendingDispatch } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .eq('order_status', 'CONFIRMED')
        .is('courier_provider', null);

      // Today's total sales value
      const { data: salesData } = await supabase
        .from('orders')
        .select('amount')
        .eq('is_deleted', false)
        .eq('order_status', 'CONFIRMED')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      const todaySales = salesData?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0;

      // In transit orders
      const { count: inTransit } = await supabase
        .from('logistics_orders')
        .select('*', { count: 'exact', head: true })
        .in('delivery_status', ['IN_TRANSIT', 'OUT_FOR_DELIVERY']);

      // Low stock products (excluding reorder_level = 0)
      const { count: lowStock } = await supabase
        .from('product_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('reorder_required', true)
        .gt('reorder_level', 0);

      // Pending inside valley deliveries
      const { count: pendingInsideValley } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .eq('delivery_location', 'INSIDE_VALLEY')
        .eq('inside_delivery_status', 'PENDING');

      return {
        confirmedToday: confirmedToday || 0,
        pendingDispatch: pendingDispatch || 0,
        todaySales,
        inTransit: inTransit || 0,
        lowStock: lowStock || 0,
        pendingInsideValley: pendingInsideValley || 0,
      };
    },
    refetchInterval: 600000, // Refresh every 10 minutes to save Cloud balance
  });

  const items = [
    { 
      label: "Today's Orders", 
      value: stats?.confirmedToday || 0, 
      icon: ShoppingCart, 
      color: 'text-green-500 bg-green-500/10' 
    },
    { 
      label: 'Pending Dispatch', 
      value: stats?.pendingDispatch || 0, 
      icon: Clock, 
      color: 'text-orange-500 bg-orange-500/10',
      alert: (stats?.pendingDispatch || 0) > 10
    },
    { 
      label: 'In Transit', 
      value: stats?.inTransit || 0, 
      icon: Truck, 
      color: 'text-blue-500 bg-blue-500/10' 
    },
    { 
      label: 'Low Stock', 
      value: stats?.lowStock || 0, 
      icon: AlertTriangle, 
      color: 'text-red-500 bg-red-500/10',
      alert: (stats?.lowStock || 0) > 0
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} className={`${item.alert ? 'border-destructive/50' : ''}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-bold">{item.value}</p>
                </div>
              </div>
              {item.alert && (
                <Badge variant="destructive" className="text-xs">!</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
