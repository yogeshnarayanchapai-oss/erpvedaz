import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

export interface HighAlertData {
  productId: string;
  warehouseId: string;
  totalOutXDays: number;
  avgOutPerDay: number;
  daysCover: number | null;
  isHighAlert: boolean;
}

export function useHighAlertData(
  warehouseFilter: string,
  highAlertDays: number | null,
  currentStockMap: Map<string, number>
) {
  return useQuery({
    queryKey: ['high_alert_data', warehouseFilter, highAlertDays],
    queryFn: async (): Promise<Map<string, HighAlertData>> => {
      const result = new Map<string, HighAlertData>();
      
      if (!highAlertDays || highAlertDays < 1) {
        return result;
      }

      // Calculate date range: today - (X-1) days to today
      const today = new Date();
      const startDate = format(subDays(today, highAlertDays - 1), 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');

      // Fetch OUT movements in the date range
      let query = supabase
        .from('stock_movements')
        .select('product_id, warehouse_id, from_warehouse_id, to_warehouse_id, movement_type, qty, movement_date, adjustment_direction, products!inner(store_id)')
        .or('is_deleted.is.null,is_deleted.eq.false')
        .gte('movement_date', startDate)
        .lte('movement_date', endDate);

      if (warehouseFilter !== 'all') {
        query = query.or(`warehouse_id.eq.${warehouseFilter},from_warehouse_id.eq.${warehouseFilter},to_warehouse_id.eq.${warehouseFilter}`);
      }

      const { data: movements, error } = await query;

      if (error) throw error;

      // Calculate OUT totals per product-warehouse
      const outTotals: Record<string, number> = {};

      movements?.forEach((m: any) => {
        // Only count pure OUT movements for High Alert calculation
        if (m.movement_type === 'OUT' && m.warehouse_id) {
          const key = `${m.product_id}_${m.warehouse_id}`;
          if (!outTotals[key]) outTotals[key] = 0;
          outTotals[key] += m.qty || 0;
        }
      });

      // Calculate avg and high alert for each product-warehouse with current stock
      currentStockMap.forEach((currentStock, key) => {
        const totalOutXDays = outTotals[key] || 0;
        const avgOutPerDay = totalOutXDays / highAlertDays;
        
        let daysCover: number | null = null;
        let isHighAlert = false;

        if (avgOutPerDay >= 1) {
          // Only products with avgOutPerDay >= 1 can be High Alert
          daysCover = currentStock / avgOutPerDay;
          isHighAlert = daysCover < highAlertDays;
        }
        // If avgOutPerDay < 1, isHighAlert stays false (not included in High Alert)

        const [productId, warehouseId] = key.split('_');
        result.set(key, {
          productId,
          warehouseId,
          totalOutXDays,
          avgOutPerDay,
          daysCover,
          isHighAlert,
        });
      });

      return result;
    },
    enabled: !!highAlertDays && highAlertDays > 0 && currentStockMap.size > 0,
    staleTime: 30000,
  });
}
