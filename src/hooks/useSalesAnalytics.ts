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

      // Fetch directly from daily_records table (same data source as Daily P/L page)
      const { data: dailyRecords, error } = await supabase
        .from('daily_records')
        .select('*')
        .eq('store_id', storeId)
        .gte('record_date', startDate)
        .lte('record_date', endDate);

      if (error) throw error;

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const plData: { 
        month: string; 
        productSold: number; 
        adsSpend: number; 
        officeCost: number; 
        pl: number 
      }[] = [];

      for (let m = 0; m < 12; m++) {
        // Filter records for this month
        const monthRecords = (dailyRecords || []).filter(r => {
          const recordMonth = new Date(r.record_date).getMonth();
          return recordMonth === m;
        });

        // Aggregate values directly from daily_records (no recalculation)
        const productSold = monthRecords.reduce((sum, r) => sum + (r.sell || 0), 0);
        const adsSpend = monthRecords.reduce((sum, r) => sum + (r.ads_spent_npr || 0), 0);
        const officeCost = monthRecords.reduce((sum, r) => sum + (r.staff_office_cost || 0), 0);
        const pl = monthRecords.reduce((sum, r) => sum + (r.profit_loss || 0), 0);

        plData.push({
          month: monthNames[m],
          productSold,
          adsSpend,
          officeCost,
          pl,
        });
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
