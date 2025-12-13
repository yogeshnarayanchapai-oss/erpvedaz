import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';

const VALID_ORDER_STATUSES = ['CONFIRMED', 'DISPATCHED', 'DELIVERED'];

export interface DateRange {
  from: Date;
  to: Date;
}

export function useSalesByDateRange(dateRange: DateRange) {
  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  return useQuery({
    queryKey: ['sales_by_date_range', fromDate, toDate, storeId],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('delivery_location, amount, order_status, store_id')
        .eq('is_deleted', false)
        .gte('order_date', `${fromDate}T00:00:00`)
        .lte('order_date', `${toDate}T23:59:59`);

      // Filter by store_id
      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;

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
    enabled: !!storeId,
  });
}

export function useDailyDeliveryByDateRange(dateRange: DateRange) {
  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  return useQuery({
    queryKey: ['daily_delivery_by_range', fromDate, toDate, storeId],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('order_date, delivery_location, order_status, store_id')
        .eq('is_deleted', false)
        .gte('order_date', `${fromDate}T00:00:00`)
        .lte('order_date', `${toDate}T23:59:59`);

      // Filter by store_id
      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;

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
    enabled: !!storeId,
  });
}

export function useStaffPerformanceByDateRange(dateRange: DateRange, staffList: { id: string; name: string }[]) {
  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  return useQuery({
    queryKey: ['staff_performance_by_range', fromDate, toDate, staffList.map(s => s.id), storeId],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('sales_person_id, delivery_location, order_status, store_id')
        .eq('is_deleted', false)
        .gte('order_date', `${fromDate}T00:00:00`)
        .lte('order_date', `${toDate}T23:59:59`);

      // Filter by store_id
      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data: orders, error } = await query;

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
    enabled: staffList.length > 0 && !!storeId,
  });
}

export function useProductDaybookByDateRange(dateRange: DateRange, products: { id: string; name: string; target_per_day: number | null; cost_price: number | null; sell_price: number | null }[]) {
  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  return useQuery({
    queryKey: ['product_daybook_by_range', fromDate, toDate, products.map(p => p.id), storeId],
    queryFn: async () => {
      // Fetch orders for confirmed/dispatched status, filtered by store
      let ordersQuery = supabase
        .from('orders')
        .select('id, product_id, amount, order_status, store_id')
        .eq('is_deleted', false)
        .gte('order_date', `${fromDate}T00:00:00`)
        .lte('order_date', `${toDate}T23:59:59`);

      if (storeId) {
        ordersQuery = ordersQuery.eq('store_id', storeId);
      }

      const { data: orders, error: ordersError } = await ordersQuery;

      if (ordersError) throw ordersError;

      // Fetch order_items to get quantities
      const orderIds = (orders || [])
        .filter(o => ['CONFIRMED', 'DISPATCHED'].includes(o.order_status || ''))
        .map(o => o.id);

      let orderItemsData: { product_id: string | null; quantity: number | null }[] = [];
      if (orderIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .in('order_id', orderIds);

        if (itemsError) throw itemsError;
        orderItemsData = items || [];
      }

      // Fetch ALL ad_spend_reference entries to find latest per product (carry-forward logic)
      const { data: adsData, error: adsError } = await supabase
        .from('ad_spend_reference')
        .select('product_id, amount, spend_date')
        .eq('store_id', storeId)
        .order('spend_date', { ascending: false });

      if (adsError) throw adsError;

      // Fetch default USD rate from company_info
      const { data: companyData } = await supabase
        .from('company_info')
        .select('other_details')
        .limit(1)
        .maybeSingle();

      let dollarRate = 133.5; // Default rate
      if (companyData?.other_details) {
        try {
          const details = JSON.parse(companyData.other_details);
          if (details.default_usd_rate) {
            dollarRate = details.default_usd_rate;
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Calculate number of days in filter range (inclusive)
      const daysDiff = Math.ceil(
        (new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      // For each product, find the LATEST ad_spend_reference (carry-forward)
      const latestAdsByProduct: Record<string, number> = {};
      (adsData || []).forEach(ad => {
        if (ad.product_id && !latestAdsByProduct[ad.product_id]) {
          // First occurrence is the latest due to descending order
          latestAdsByProduct[ad.product_id] = ad.amount || 0;
        }
      });

      // Calculate target per product from ads table (for target column)
      const { data: adsTargetData } = await supabase
        .from('ads')
        .select('product_id, target_orders')
        .gte('date', fromDate)
        .lte('date', toDate);

      const targetByProduct: Record<string, number> = {};
      (adsTargetData || []).forEach(ad => {
        if (ad.product_id) {
          targetByProduct[ad.product_id] = (targetByProduct[ad.product_id] || 0) + (ad.target_orders || 0);
        }
      });

      // Calculate qty sold per product from order_items
      const qtySoldByProduct: Record<string, number> = {};
      orderItemsData.forEach(item => {
        if (item.product_id) {
          qtySoldByProduct[item.product_id] = (qtySoldByProduct[item.product_id] || 0) + (item.quantity || 0);
        }
      });

      // Fetch RTO% for the month (use first day of date range)
      const yearMonth = fromDate.substring(0, 7); // YYYY-MM
      const { data: rtoSetting } = await supabase
        .from('rto_settings')
        .select('rto_percent')
        .eq('store_id', storeId)
        .eq('year_month', yearMonth)
        .maybeSingle();

      const rtoPercent = rtoSetting?.rto_percent || 0;

      return products.map(product => {
        // Filter orders for CONFIRMED or DISPATCHED status
        const productOrders = (orders || []).filter(
          o => o.product_id === product.id && ['CONFIRMED', 'DISPATCHED'].includes(o.order_status || '')
        );
        const revenue = productOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
        const orderCount = productOrders.length;
        
        // Use ads spend target for target column
        const adsTarget = targetByProduct[product.id] || 0;
        const qtySold = qtySoldByProduct[product.id] || 0;
        
        // Get ads spend: latest reference × days × dollar rate (carry-forward logic)
        const dailyAdsUsd = latestAdsByProduct[product.id] || 0;
        const adsSpend = dailyAdsUsd * daysDiff * dollarRate;
        
        // Calculate P/L with CORRECTED formulas:
        // Product Cost = qtySold × costPrice (not orderCount)
        // Redirect = orderCount × 20% × 50 (not qtySold)
        // RTO = orderCount × RTO% × 200 (not qtySold)
        const productCost = qtySold * (product.cost_price || 0);
        const staffOfficeCost = orderCount * 50;
        const deliveryCost = orderCount * 250;
        const redirectCost = Math.round(orderCount * 0.2 * 50);
        const rtoUnits = Math.round(orderCount * (rtoPercent / 100));
        const rtoCost = rtoUnits * 200;
        
        const pl = revenue - productCost - staffOfficeCost - adsSpend - deliveryCost - redirectCost - rtoCost;
        
        return {
          name: product.name,
          target: adsTarget,
          sales: orderCount,
          qtySold,
          revenue,
          costPrice: product.cost_price || 0,
          sellPrice: product.sell_price || 0,
          pl,
        };
      });
    },
    enabled: products.length > 0 && !!storeId,
  });
}
