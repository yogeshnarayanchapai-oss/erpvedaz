import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from './useCurrentStoreId';
import { DEFAULT_COST_SETTINGS } from './useCostSettings';

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
          rtoPercent: DEFAULT_COST_SETTINGS.rto_percent,
          usdRate: DEFAULT_COST_SETTINGS.usd_rate,
          deliveryChargePerOrder: DEFAULT_COST_SETTINGS.delivery_charge_per_order,
          rtoChargePerUnit: DEFAULT_COST_SETTINGS.rto_charge_per_unit,
          redirectChargePerUnit: DEFAULT_COST_SETTINGS.redirect_charge_per_unit,
          officeCostPerOrder: DEFAULT_COST_SETTINGS.office_cost_per_order,
          redirectPercent: DEFAULT_COST_SETTINGS.redirect_percent,
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

      // 2. Get order counts for delivery charge calculation
      const startOfDay = `${date}T00:00:00`;
      const endOfDay = `${date}T23:59:59`;
      
      // Get all orders for the date
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, delivery_location, order_status, inside_delivery_status')
        .eq('store_id', storeId)
        .eq('is_deleted', false)
        .gte('order_date', startOfDay)
        .lte('order_date', endOfDay);
      
      if (ordersError) throw ordersError;
      
      // OVD orders with status CONFIRMED
      const ovdCount = ordersData?.filter(o => 
        o.delivery_location === 'OUTSIDE_VALLEY' && o.order_status === 'CONFIRMED'
      ).length || 0;
      
      // VD orders with status CONFIRMED and inside_delivery_status DELIVERED
      const vdCount = ordersData?.filter(o => 
        o.delivery_location === 'INSIDE_VALLEY' && o.order_status === 'CONFIRMED' && o.inside_delivery_status === 'DELIVERED'
      ).length || 0;
      
      const totalOrders = ovdCount + vdCount;

      // 3. Get ads spend for the date from ads table
      const { data: adSpendData, error: adsError } = await supabase
        .from('ads')
        .select('amount_spent')
        .eq('store_id', storeId)
        .eq('date', date);

      if (adsError) throw adsError;

      const adsSpentNpr = adSpendData?.reduce((sum, a) => sum + (a.amount_spent || 0), 0) || 0;

      // 4. Get cost settings for the store (single row, not per month)
      const { data: costSettings, error: costError } = await supabase
        .from('cost_settings')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();

      if (costError) throw costError;

      return {
        sell,
        productCost,
        productValue,
        adsSpentNpr,
        totalOrders,
        rtoPercent: costSettings?.rto_percent ?? DEFAULT_COST_SETTINGS.rto_percent,
        usdRate: costSettings?.usd_rate ?? DEFAULT_COST_SETTINGS.usd_rate,
        deliveryChargePerOrder: costSettings?.delivery_charge_per_order ?? DEFAULT_COST_SETTINGS.delivery_charge_per_order,
        rtoChargePerUnit: costSettings?.rto_charge_per_unit ?? DEFAULT_COST_SETTINGS.rto_charge_per_unit,
        redirectChargePerUnit: costSettings?.redirect_charge_per_unit ?? DEFAULT_COST_SETTINGS.redirect_charge_per_unit,
        officeCostPerOrder: costSettings?.office_cost_per_order ?? DEFAULT_COST_SETTINGS.office_cost_per_order,
        redirectPercent: costSettings?.redirect_percent ?? DEFAULT_COST_SETTINGS.redirect_percent,
      };
    },
    enabled: !!storeId && !!date,
  });
}
