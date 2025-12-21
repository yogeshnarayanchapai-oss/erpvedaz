import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from './useCurrentStoreId';

// Fetch all metrics needed for a daily record
export function useDailyRecordMetrics(date: string, warehouseId?: string | null) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['daily-record-metrics', storeId, date, warehouseId],
    queryFn: async () => {
      if (!storeId || !date) {
        return {
          sell: 0,
          productCost: 0,
          productValue: 0,
          adsSpentNpr: 0,
          totalOrders: 0,
          rtoPercent: 0,
        };
      }

      // 1. Get stock movements for the date (OUT type = sales)
      let movementQuery = supabase
        .from('stock_movements')
        .select('qty, total_cost, total_value, warehouse_id, products:product_id(store_id)')
        .eq('movement_type', 'OUT')
        .eq('movement_date', date)
        .or('is_deleted.is.null,is_deleted.eq.false');

      if (warehouseId && warehouseId !== 'all') {
        movementQuery = movementQuery.eq('warehouse_id', warehouseId);
      }

      const { data: movements, error: movError } = await movementQuery;
      if (movError) throw movError;

      // Filter by store
      const filteredMovements = movements?.filter((m: any) => m.products?.store_id === storeId) || [];
      
      const sell = filteredMovements.reduce((sum, m) => sum + (m.qty || 0), 0);
      const productCost = filteredMovements.reduce((sum, m) => sum + (m.total_cost || 0), 0);
      const productValue = filteredMovements.reduce((sum, m) => sum + (m.total_value || 0), 0);

      // 2. Get actual order count from orders table for that date
      const startOfDay = `${date}T00:00:00`;
      const endOfDay = `${date}T23:59:59`;
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('store_id', storeId)
        .eq('is_deleted', false)
        .gte('order_date', startOfDay)
        .lte('order_date', endOfDay)
        .not('order_status', 'eq', 'CANCELLED');

      if (ordersError) throw ordersError;
      
      const totalOrders = ordersData?.length || 0;

      // 3. Get ads spend for the date from ads table
      const { data: adSpendData, error: adsError } = await supabase
        .from('ads')
        .select('amount_spent')
        .eq('store_id', storeId)
        .eq('date', date);

      if (adsError) throw adsError;

      const adsSpentNpr = adSpendData?.reduce((sum, a) => sum + (a.amount_spent || 0), 0) || 0;

      // 4. Get RTO% for the month
      const yearMonth = date.substring(0, 7); // YYYY-MM
      const { data: rtoSetting, error: rtoError } = await supabase
        .from('rto_settings')
        .select('rto_percent')
        .eq('store_id', storeId)
        .eq('year_month', yearMonth)
        .maybeSingle();

      if (rtoError) throw rtoError;

      const rtoPercent = rtoSetting?.rto_percent || 0;

      return {
        sell,
        productCost,
        productValue,
        adsSpentNpr,
        totalOrders,
        rtoPercent,
      };
    },
    enabled: !!storeId && !!date,
  });
}
