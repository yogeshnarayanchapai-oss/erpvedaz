import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, startOfWeek, endOfWeek, subWeeks, getDaysInMonth, startOfYear, endOfYear } from 'date-fns';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';

const VALID_ORDER_STATUSES = ['CONFIRMED', 'DISPATCHED', 'DELIVERED'];

export function useTodaySalesByLocation() {
  const today = new Date().toISOString().split('T')[0];
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  return useQuery({
    queryKey: ['today_sales_by_location', today, storeId],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('delivery_location, amount, order_status, store_id')
        .eq('is_deleted', false)
        .gte('order_date', `${today}T00:00:00`)
        .lte('order_date', `${today}T23:59:59`);

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

export function useDailyDeliveryChart(year: number, month: number) {
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  return useQuery({
    queryKey: ['daily_delivery_chart', year, month, storeId],
    queryFn: async () => {
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');

      let query = supabase
        .from('orders')
        .select('order_date, delivery_location, order_status, store_id')
        .eq('is_deleted', false)
        .gte('order_date', `${startDate}T00:00:00`)
        .lte('order_date', `${endDate}T23:59:59`);

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const daysInMonth = getDaysInMonth(new Date(year, month - 1));
      const dailyData: { day: number; inside: number; outside: number; total: number }[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = format(new Date(year, month - 1, d), 'yyyy-MM-dd');
        const dayOrders = (data || []).filter(o => {
          const orderDay = o.order_date?.split('T')[0];
          return orderDay === dayStr && VALID_ORDER_STATUSES.includes(o.order_status || '');
        });

        const outside = dayOrders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length;
        const inside = dayOrders.filter(o => o.delivery_location === 'INSIDE_VALLEY').length;

        dailyData.push({ day: d, inside, outside, total: inside + outside });
      }

      return dailyData;
    },
    enabled: !!storeId,
  });
}

export function useMonthlySalesChart(year: number) {
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  return useQuery({
    queryKey: ['monthly_sales_chart', year, storeId],
    queryFn: async () => {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      let query = supabase
        .from('orders')
        .select('order_date, amount, order_status, store_id')
        .eq('is_deleted', false)
        .gte('order_date', `${startDate}T00:00:00`)
        .lte('order_date', `${endDate}T23:59:59`);

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const monthlyData: { month: string; sales: number }[] = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      for (let m = 0; m < 12; m++) {
        const monthOrders = (data || []).filter(o => {
          const orderMonth = new Date(o.order_date || '').getMonth();
          return orderMonth === m && VALID_ORDER_STATUSES.includes(o.order_status || '');
        });

        const sales = monthOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
        monthlyData.push({ month: monthNames[m], sales });
      }

      return monthlyData;
    },
    enabled: !!storeId,
  });
}

export function useMonthlyPLData(year: number) {
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  return useQuery({
    queryKey: ['monthly_pl_data', year, storeId],
    queryFn: async () => {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      // Fetch stock_movements for sales data (same as Daily P/L)
      const { data: stockMovements, error: stockError } = await supabase
        .from('stock_movements')
        .select('movement_date, qty, total_value, movement_type, products:product_id(store_id)')
        .eq('movement_type', 'OUT')
        .gte('movement_date', startDate)
        .lte('movement_date', endDate);

      if (stockError) throw stockError;

      // Filter by store
      const filteredMovements = (stockMovements || []).filter((m: any) => m.products?.store_id === storeId);

      // Fetch ads with USD conversion
      const { data: ads, error: adsError } = await supabase
        .from('ads')
        .select('date, amount_spent, amount_usd')
        .eq('store_id', storeId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (adsError) throw adsError;

      // Fetch "office management" category for expenses (same as Daily P/L)
      const { data: categories, error: catError } = await supabase
        .from('transaction_categories')
        .select('id')
        .ilike('name', '%office management%');

      if (catError) throw catError;
      const categoryIds = (categories || []).map(c => c.id);

      // Fetch transactions with office management category
      let officeExpenses: { date: string; amount: number }[] = [];
      if (categoryIds.length > 0) {
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('date, amount')
          .eq('store_id', storeId)
          .eq('type', 'expense')
          .in('category_id', categoryIds)
          .gte('date', startDate)
          .lte('date', endDate);

        if (txError) throw txError;
        officeExpenses = txData || [];
      }

      // Fetch delivery costs from orders (for delivery cost calculation)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('order_date, quantity, product_id')
        .eq('store_id', storeId)
        .eq('is_deleted', false)
        .in('order_status', ['CONFIRMED', 'DISPATCHED', 'DELIVERED'])
        .gte('order_date', `${startDate}T00:00:00`)
        .lte('order_date', `${endDate}T23:59:59`);

      if (ordersError) throw ordersError;

      // Fetch products for delivery cost
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, delivery_cost');

      if (productsError) throw productsError;

      const productDeliveryCosts = new Map((products || []).map(p => [p.id, p.delivery_cost || 0]));

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const plData: { 
        month: string; 
        productSold: number; 
        adsSpend: number; 
        adsSpendUSD: number;
        deliveryCost: number;
        officeCost: number; 
        pl: number 
      }[] = [];

      for (let m = 0; m < 12; m++) {
        // Sales from stock_movements (same as Daily P/L)
        const monthMovements = filteredMovements.filter((mv: any) => {
          const movementMonth = new Date(mv.movement_date).getMonth();
          return movementMonth === m;
        });
        const productSold = monthMovements.reduce((sum: number, mv: any) => sum + (mv.total_value || 0), 0);

        // Delivery cost from orders
        const monthOrders = (orders || []).filter(o => {
          const orderMonth = new Date(o.order_date || '').getMonth();
          return orderMonth === m;
        });
        const deliveryCost = monthOrders.reduce((sum, o) => {
          const unitDeliveryCost = productDeliveryCosts.get(o.product_id) || 0;
          return sum + (unitDeliveryCost * (o.quantity || 1));
        }, 0);

        // Ads spend from ads table (same as Daily P/L)
        const monthAds = (ads || []).filter(a => {
          const adMonth = new Date(a.date).getMonth();
          return adMonth === m;
        });
        const adsSpend = monthAds.reduce((sum, a) => sum + (a.amount_spent || 0), 0);
        const adsSpendUSD = monthAds.reduce((sum, a) => sum + (a.amount_usd || 0), 0);

        // Office cost from transactions with "office management" category (same as Daily P/L)
        const monthExpenses = officeExpenses.filter(e => {
          const expMonth = new Date(e.date).getMonth();
          return expMonth === m;
        });
        const officeCost = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        // P/L = Sales - Ads Spend - Delivery Cost - Office Cost
        const pl = productSold - adsSpend - deliveryCost - officeCost;

        plData.push({ month: monthNames[m], productSold, adsSpend, adsSpendUSD, deliveryCost, officeCost, pl });
      }

      return plData;
    },
    enabled: !!storeId,
  });
}

export function useWeeklySales() {
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  return useQuery({
    queryKey: ['weekly_sales', storeId],
    queryFn: async () => {
      const today = new Date();
      
      // This week
      const thisWeekStart = format(startOfWeek(today, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      const thisWeekEnd = format(endOfWeek(today, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      
      // Last week
      const lastWeekStart = format(startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 }), 'yyyy-MM-dd');
      const lastWeekEnd = format(endOfWeek(subWeeks(today, 1), { weekStartsOn: 0 }), 'yyyy-MM-dd');

      let thisWeekQuery = supabase
        .from('orders')
        .select('amount, order_status, store_id')
        .eq('is_deleted', false)
        .gte('order_date', `${thisWeekStart}T00:00:00`)
        .lte('order_date', `${thisWeekEnd}T23:59:59`);

      if (storeId) {
        thisWeekQuery = thisWeekQuery.eq('store_id', storeId);
      }

      const { data: thisWeekData, error: thisWeekError } = await thisWeekQuery;

      if (thisWeekError) throw thisWeekError;

      let lastWeekQuery = supabase
        .from('orders')
        .select('amount, order_status, store_id')
        .eq('is_deleted', false)
        .gte('order_date', `${lastWeekStart}T00:00:00`)
        .lte('order_date', `${lastWeekEnd}T23:59:59`);

      if (storeId) {
        lastWeekQuery = lastWeekQuery.eq('store_id', storeId);
      }

      const { data: lastWeekData, error: lastWeekError } = await lastWeekQuery;

      if (lastWeekError) throw lastWeekError;

      const thisWeekSales = (thisWeekData || [])
        .filter(o => VALID_ORDER_STATUSES.includes(o.order_status || ''))
        .reduce((sum, o) => sum + (o.amount || 0), 0);

      const lastWeekSales = (lastWeekData || [])
        .filter(o => VALID_ORDER_STATUSES.includes(o.order_status || ''))
        .reduce((sum, o) => sum + (o.amount || 0), 0);

      return { thisWeekSales, lastWeekSales };
    },
    enabled: !!storeId,
  });
}
