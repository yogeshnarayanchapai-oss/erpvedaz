import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export function useProductDaybookStats(productId: string | undefined, date: string | undefined) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['product-daybook-stats', productId, date, storeId],
    queryFn: async () => {
      if (!productId || !date || !storeId) {
        return { orderCount: 0, totalQty: 0, totalSales: 0, avgPrice: 0 };
      }

      // Fetch OUTSIDE VALLEY orders (CONFIRMED, DISPATCHED, DELIVERED) for this product on this date
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          total_price,
          orders!inner (id, order_status, order_date, store_id, delivery_location)
        `)
        .eq('product_id', productId)
        .gte('orders.order_date', `${date}T00:00:00`)
        .lte('orders.order_date', `${date}T23:59:59`)
        .eq('orders.store_id', storeId)
        .eq('orders.delivery_location', 'OUTSIDE_VALLEY')
        .in('orders.order_status', ['CONFIRMED', 'DISPATCHED', 'DELIVERED']);

      if (error) {
        console.error('Error fetching product daybook stats:', error);
        return { orderCount: 0, totalQty: 0, totalSales: 0, avgPrice: 0 };
      }

      const orderCount = orderItems?.length || 0;
      const totalQty = orderItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      const totalSales = orderItems?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
      const avgPrice = totalQty > 0 ? Math.round(totalSales / totalQty) : 0;

      return { orderCount, totalQty, totalSales, avgPrice };
    },
    enabled: !!productId && !!date && !!storeId,
  });
}
