import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from './useCurrentStoreId';

interface OutsideValleyStats {
  quantity: number;
  totalSales: number;
  averagePrice: number;
}

export function useOutsideValleyOrderStats(productId: string | undefined, date: string | undefined) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['outside-valley-stats', productId, date, storeId],
    queryFn: async (): Promise<OutsideValleyStats> => {
      if (!productId || !date || !storeId) {
        return { quantity: 0, totalSales: 0, averagePrice: 0 };
      }

      // Get confirmed orders for this product on this date in Outside Valley
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          total_price,
          orders!inner (
            id,
            order_status,
            order_date,
            delivery_location,
            store_id
          )
        `)
        .eq('product_id', productId)
        .eq('orders.order_date', date)
        .eq('orders.store_id', storeId)
        .eq('orders.order_status', 'CONFIRMED')
        .eq('orders.delivery_location', 'OUTSIDE_VALLEY');

      if (error) {
        console.error('Error fetching outside valley stats:', error);
        return { quantity: 0, totalSales: 0, averagePrice: 0 };
      }

      if (!orderItems || orderItems.length === 0) {
        return { quantity: 0, totalSales: 0, averagePrice: 0 };
      }

      const totalQuantity = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const totalSales = orderItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
      const averagePrice = totalQuantity > 0 ? Math.round(totalSales / totalQuantity) : 0;

      return {
        quantity: totalQuantity,
        totalSales,
        averagePrice,
      };
    },
    enabled: !!productId && !!date && !!storeId,
  });
}
