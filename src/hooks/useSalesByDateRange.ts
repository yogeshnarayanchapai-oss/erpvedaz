import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const VALID_ORDER_STATUSES = ['CONFIRMED', 'DISPATCHED', 'DELIVERED'];

export interface DateRange {
  from: Date;
  to: Date;
}

export function useSalesByDateRange(dateRange: DateRange) {
  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['sales_by_date_range', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('delivery_location, amount, order_status')
        .eq('is_deleted', false)
        .gte('order_date', `${fromDate}T00:00:00`)
        .lte('order_date', `${toDate}T23:59:59`);

      if (error) throw error;

      const insideValley = (data || [])
        .filter(o => o.delivery_location === 'INSIDE_VALLEY' && ['CONFIRMED', 'DELIVERED'].includes(o.order_status || ''))
        .reduce((sum, o) => sum + (o.amount || 0), 0);

      const outsideValley = (data || [])
        .filter(o => o.delivery_location === 'OUTSIDE_VALLEY' && VALID_ORDER_STATUSES.includes(o.order_status || ''))
        .reduce((sum, o) => sum + (o.amount || 0), 0);

      return {
        insideValley,
        outsideValley,
        total: insideValley + outsideValley,
      };
    },
  });
}

export function useDailyDeliveryByDateRange(dateRange: DateRange) {
  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['daily_delivery_by_range', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('order_date, delivery_location, order_status')
        .eq('is_deleted', false)
        .gte('order_date', `${fromDate}T00:00:00`)
        .lte('order_date', `${toDate}T23:59:59`);

      if (error) throw error;

      // Group by day
      const dailyMap: Record<string, { inside: number; outside: number; total: number }> = {};
      
      (data || []).forEach(o => {
        if (!VALID_ORDER_STATUSES.includes(o.order_status || '')) return;
        const orderDay = o.order_date?.split('T')[0];
        if (!orderDay) return;
        
        if (!dailyMap[orderDay]) {
          dailyMap[orderDay] = { inside: 0, outside: 0, total: 0 };
        }
        
        if (o.delivery_location === 'INSIDE_VALLEY') {
          dailyMap[orderDay].inside++;
        } else if (o.delivery_location === 'OUTSIDE_VALLEY') {
          dailyMap[orderDay].outside++;
        }
        dailyMap[orderDay].total++;
      });

      // Convert to array sorted by date
      return Object.entries(dailyMap)
        .map(([date, counts]) => ({
          day: format(new Date(date), 'MMM d'),
          ...counts,
        }))
        .sort((a, b) => a.day.localeCompare(b.day));
    },
  });
}

export function useStaffPerformanceByDateRange(dateRange: DateRange, staffList: { id: string; name: string }[]) {
  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['staff_performance_by_range', fromDate, toDate, staffList.map(s => s.id)],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('sales_person_id, delivery_location, order_status')
        .eq('is_deleted', false)
        .gte('order_date', `${fromDate}T00:00:00`)
        .lte('order_date', `${toDate}T23:59:59`);

      if (error) throw error;

      const perfMap: Record<string, { name: string; confirmed: number; inside: number; outside: number }> = {};
      staffList.forEach(s => {
        perfMap[s.id] = { name: s.name, confirmed: 0, inside: 0, outside: 0 };
      });

      (orders || []).forEach(order => {
        if (order.sales_person_id && VALID_ORDER_STATUSES.includes(order.order_status || '')) {
          if (perfMap[order.sales_person_id]) {
            perfMap[order.sales_person_id].confirmed++;
            if (order.delivery_location === 'INSIDE_VALLEY') {
              perfMap[order.sales_person_id].inside++;
            } else if (order.delivery_location === 'OUTSIDE_VALLEY') {
              perfMap[order.sales_person_id].outside++;
            }
          }
        }
      });

      return Object.values(perfMap).filter(p => p.confirmed > 0 || staffList.find(s => s.name === p.name));
    },
    enabled: staffList.length > 0,
  });
}

export function useProductDaybookByDateRange(dateRange: DateRange, products: { id: string; name: string; target_per_day: number | null; cost_price: number | null; sell_price: number | null }[]) {
  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['product_daybook_by_range', fromDate, toDate, products.map(p => p.id)],
    queryFn: async () => {
      // Fetch orders for confirmed/dispatched status
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('product_id, amount, order_status')
        .eq('is_deleted', false)
        .gte('order_date', `${fromDate}T00:00:00`)
        .lte('order_date', `${toDate}T23:59:59`);

      if (ordersError) throw ordersError;

      // Fetch ads spend targets for the date range
      const { data: adsData, error: adsError } = await supabase
        .from('ads')
        .select('product_id, target_orders')
        .gte('date', fromDate)
        .lte('date', toDate);

      if (adsError) throw adsError;

      // Calculate target per product from ads spend
      const targetByProduct: Record<string, number> = {};
      (adsData || []).forEach(ad => {
        if (ad.product_id) {
          targetByProduct[ad.product_id] = (targetByProduct[ad.product_id] || 0) + (ad.target_orders || 0);
        }
      });

      return products.map(product => {
        // Filter orders for CONFIRMED or DISPATCHED status
        const productOrders = (orders || []).filter(
          o => o.product_id === product.id && ['CONFIRMED', 'DISPATCHED'].includes(o.order_status || '')
        );
        const sales = productOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
        const count = productOrders.length;
        
        // Use ads spend target instead of product.target_per_day
        const adsTarget = targetByProduct[product.id] || 0;
        
        return {
          name: product.name,
          target: adsTarget,
          sales: count,
          revenue: sales,
          costPrice: product.cost_price || 0,
          sellPrice: product.sell_price || 0,
          pl: sales - (count * (product.cost_price || 0)),
        };
      });
    },
    enabled: products.length > 0,
  });
}
