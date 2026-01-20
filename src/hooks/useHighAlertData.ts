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
        // For TRANSFER movements, source warehouse loses stock
        if (m.movement_type === 'TRANSFER') {
          if (m.from_warehouse_id) {
            const key = `${m.product_id}_${m.from_warehouse_id}`;
            if (!outTotals[key]) outTotals[key] = 0;
            outTotals[key] += m.qty || 0;
          }
        } else {
          // OUT types: OUT, WHOLESALE_OUT, TRANSFER_OUT, RTO_OUT, ADJUSTMENT with MINUS
          const isOut = ['OUT', 'TRANSFER_OUT', 'RTO_OUT', 'WHOLESALE_OUT'].includes(m.movement_type) ||
                        (m.movement_type === 'ADJUSTMENT' && m.adjustment_direction === 'MINUS');

          if (isOut && m.warehouse_id) {
            const key = `${m.product_id}_${m.warehouse_id}`;
            if (!outTotals[key]) outTotals[key] = 0;
            outTotals[key] += m.qty || 0;
          }
        }
      });

      // Calculate avg and high alert for each product-warehouse with current stock
      currentStockMap.forEach((currentStock, key) => {
        const totalOutXDays = outTotals[key] || 0;
        const avgOutPerDay = totalOutXDays / highAlertDays;
        
        let daysCover: number | null = null;
        let isHighAlert = false;

        if (avgOutPerDay > 0) {
          daysCover = currentStock / avgOutPerDay;
          isHighAlert = daysCover < highAlertDays;
        }
        // If avgOutPerDay = 0, isHighAlert stays false

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
