import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export type DeliveryLocationFilter = 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY' | 'all';

export function useProductDaybookStats(
  productId: string | undefined, 
  date: string | undefined,
  deliveryLocation: DeliveryLocationFilter = 'OUTSIDE_VALLEY'
) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['product-daybook-stats', productId, date, storeId, deliveryLocation],
    queryFn: async () => {
      if (!productId || !date || !storeId) {
        return { orderCount: 0, totalQty: 0, totalSales: 0, avgPrice: 0 };
      }

      // Build query for orders
      // For INSIDE_VALLEY (VD): order_status = CONFIRMED AND delivery_status = DELIVERED
      // For OUTSIDE_VALLEY (OVD): CONFIRMED, DISPATCHED, DELIVERED orders
      let query = supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          total_price,
          orders!inner (id, order_status, order_date, store_id, delivery_location, delivery_status)
        `)
        .eq('product_id', productId)
        .gte('orders.order_date', `${date}T00:00:00`)
        .lte('orders.order_date', `${date}T23:59:59`)
        .eq('orders.store_id', storeId);

      // Apply filters based on delivery location
      if (deliveryLocation === 'INSIDE_VALLEY') {
        // VD: order_status = CONFIRMED AND delivery_status = DELIVERED
        query = query
          .eq('orders.order_status', 'CONFIRMED')
          .eq('orders.delivery_status', 'DELIVERED')
          .eq('orders.delivery_location', 'INSIDE_VALLEY');
      } else if (deliveryLocation === 'OUTSIDE_VALLEY') {
        // OVD: CONFIRMED, DISPATCHED, DELIVERED orders
        query = query
          .in('orders.order_status', ['CONFIRMED', 'DISPATCHED', 'DELIVERED'])
          .eq('orders.delivery_location', 'OUTSIDE_VALLEY');
      } else {
        // All locations
        query = query.in('orders.order_status', ['CONFIRMED', 'DISPATCHED', 'DELIVERED']);
      }

      const { data: orderItems, error } = await query;

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
