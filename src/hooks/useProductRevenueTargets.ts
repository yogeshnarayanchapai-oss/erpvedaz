import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { format } from 'date-fns';

interface DateRange {
  from: Date;
  to: Date;
}

export interface ProductRevenueTarget {
  product_id: string;
  product_name: string;
  ads_spent_usd: number;
  target_revenue: number; // ads_spent_usd * 0.6 * 1000
  actual_revenue: number;
  achievement_percent: number;
}

/**
 * Hook to calculate revenue-based targets from ad_spend_reference
 * Formula: Target Revenue = Ads Spent (USD) * 60% * 1000
 * Example: $90 USD ads → $90 * 0.6 * 1000 = Rs. 54,000 target revenue
 */
export function useProductRevenueTargets(dateRange: DateRange) {
  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  return useQuery({
    queryKey: ['product_revenue_targets', fromDate, toDate, storeId],
    queryFn: async () => {
      if (!storeId) return [] as ProductRevenueTarget[];

      // Fetch ALL ad spend references for this store (not date-filtered)
      // because ad campaigns are ongoing and we want to show all products with active spend
      const { data: adsData, error: adsError } = await supabase
        .from('ad_spend_reference')
        .select('product_id, amount, spend_date, product:products(id, name)')
        .eq('store_id', storeId)
        .gt('amount', 0);

      if (adsError) throw adsError;

      // Aggregate USD spend per product
      const productAdsSpend: Record<string, { 
        product_id: string; 
        product_name: string; 
        total_usd: number;
      }> = {};

      (adsData || []).forEach(ad => {
        if (ad.product_id && ad.product) {
          const productId = ad.product_id;
          const productName = (ad.product as any)?.name || 'Unknown';
          const usdAmount = ad.amount || 0; // amount is in USD

          if (!productAdsSpend[productId]) {
            productAdsSpend[productId] = {
              product_id: productId,
              product_name: productName,
              total_usd: 0,
            };
          }
          productAdsSpend[productId].total_usd += usdAmount;
        }
      });

      // Now fetch actual revenue from orders for these products in the date range
      const productIds = Object.keys(productAdsSpend);
      if (productIds.length === 0) {
        return [] as ProductRevenueTarget[];
      }

      // Fetch CONFIRMED/DISPATCHED/DELIVERED orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_status, delivery_location, inside_delivery_status')
        .eq('is_deleted', false)
        .eq('store_id', storeId)
        .gte('order_date', `${fromDate}T00:00:00`)
        .lte('order_date', `${toDate}T23:59:59`)
        .in('order_status', ['CONFIRMED', 'DISPATCHED', 'DELIVERED']);

      if (ordersError) throw ordersError;

      // Get valid order IDs based on OVD/VD logic
      const validOrderIds = (ordersData || [])
        .filter(o => {
          // Outside Valley: CONFIRMED or DISPATCHED
          if (o.delivery_location === 'OUTSIDE_VALLEY' && 
              ['CONFIRMED', 'DISPATCHED'].includes(o.order_status || '')) {
            return true;
          }
          // Inside Valley: CONFIRMED with inside_delivery_status = DELIVERED
          if (o.delivery_location === 'INSIDE_VALLEY' && 
              o.order_status === 'CONFIRMED' && 
              o.inside_delivery_status === 'DELIVERED') {
            return true;
          }
          // Also include DELIVERED status regardless of location
          if (o.order_status === 'DELIVERED') {
            return true;
          }
          return false;
        })
        .map(o => o.id);

      // Fetch order items for valid orders
      let revenueByProduct: Record<string, number> = {};
      
      if (validOrderIds.length > 0) {
        // Batch fetch order items
        const batchSize = 500;
        const allOrderItems: { product_id: string | null; quantity: number | null; total_price: number | null }[] = [];
        
        for (let i = 0; i < validOrderIds.length; i += batchSize) {
          const batchIds = validOrderIds.slice(i, i + batchSize);
          const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('product_id, quantity, total_price')
            .in('order_id', batchIds);
          
          if (itemsError) throw itemsError;
          if (items) allOrderItems.push(...items);
        }

        // Calculate revenue per product
        allOrderItems.forEach(item => {
          if (item.product_id && productIds.includes(item.product_id)) {
            const revenue = item.total_price || 0;
            revenueByProduct[item.product_id] = (revenueByProduct[item.product_id] || 0) + revenue;
          }
        });
      }

      // Build final result with targets and achievements
      const results: ProductRevenueTarget[] = Object.values(productAdsSpend)
        .map(p => {
          const targetRevenue = p.total_usd * 0.6 * 1000; // Formula: USD * 60% * 1000
          const actualRevenue = revenueByProduct[p.product_id] || 0;
          const achievementPercent = targetRevenue > 0 
            ? Math.round((actualRevenue / targetRevenue) * 100) 
            : 0;

          return {
            product_id: p.product_id,
            product_name: p.product_name,
            ads_spent_usd: p.total_usd,
            target_revenue: targetRevenue,
            actual_revenue: actualRevenue,
            achievement_percent: achievementPercent,
          };
        })
        .filter(p => p.ads_spent_usd > 0) // Only show products with ads spend
        .sort((a, b) => b.achievement_percent - a.achievement_percent);

      return results;
    },
    enabled: !!dateRange.from && !!dateRange.to && !!storeId,
  });
}
