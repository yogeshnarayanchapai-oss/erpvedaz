import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { differenceInCalendarDays, format } from 'date-fns';

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

  // Inclusive day count so: today=1, last 7 days=7, etc.
  const dayCount = Math.max(1, differenceInCalendarDays(dateRange.to, dateRange.from) + 1);

  return useQuery({
    queryKey: ['product_revenue_targets', fromDate, toDate, storeId],
    queryFn: async () => {
      if (!storeId) return [] as ProductRevenueTarget[];

      // ad_spend_reference is treated as a DAILY USD spend baseline per product.
      // For any selected date range, total spend = daily_usd * dayCount.
      const { data: adsData, error: adsError } = await supabase
        .from('ad_spend_reference')
        .select('product_id, amount, spend_date, updated_at')
        .eq('store_id', storeId)
        .gt('amount', 0);

      if (adsError) throw adsError;

      // Pick the latest daily spend entry per product (by spend_date, then updated_at)
      const latestDailySpendByProduct: Record<string, { product_id: string; daily_usd: number; spend_date?: string | null; updated_at?: string | null }> = {};

      (adsData || []).forEach((ad: any) => {
        const productId: string | null = ad?.product_id ?? null;
        if (!productId) return;

        const nextSpendDate = (ad?.spend_date as string | null) ?? null;
        const nextUpdatedAt = (ad?.updated_at as string | null) ?? null;
        const nextDailyUsd = Number(ad?.amount ?? 0);

        const prev = latestDailySpendByProduct[productId];
        if (!prev) {
          latestDailySpendByProduct[productId] = { product_id: productId, daily_usd: nextDailyUsd, spend_date: nextSpendDate, updated_at: nextUpdatedAt };
          return;
        }

        // Compare spend_date first (ISO date string sorts lexicographically)
        const prevSpendDate = prev.spend_date ?? '';
        const currSpendDate = nextSpendDate ?? '';
        if (currSpendDate > prevSpendDate) {
          latestDailySpendByProduct[productId] = { product_id: productId, daily_usd: nextDailyUsd, spend_date: nextSpendDate, updated_at: nextUpdatedAt };
          return;
        }

        // If spend_date ties or missing, compare updated_at
        if (currSpendDate === prevSpendDate) {
          const prevUpdated = prev.updated_at ?? '';
          const currUpdated = nextUpdatedAt ?? '';
          if (currUpdated > prevUpdated) {
            latestDailySpendByProduct[productId] = { product_id: productId, daily_usd: nextDailyUsd, spend_date: nextSpendDate, updated_at: nextUpdatedAt };
          }
        }
      });

      const productIds = Object.keys(latestDailySpendByProduct);
      if (productIds.length === 0) return [] as ProductRevenueTarget[];

      // Fetch product names separately (avoids join/RLS issues returning null relations)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds);

      if (productsError) {
        // Don't fail the whole widget if product names can't be fetched; show IDs as Unknown.
        console.warn('Failed to fetch product names for revenue targets:', productsError);
      }

      const productNameById = new Map<string, string>();
      (productsData || []).forEach((p: any) => {
        if (p?.id) productNameById.set(p.id, p?.name ?? 'Unknown');
      });

      // Build per-product spend (total spend for range = daily_usd * dayCount)
      const productAdsSpend: Record<string, { product_id: string; product_name: string; total_usd: number }> = {};
      productIds.forEach((pid) => {
        const dailyUsd = latestDailySpendByProduct[pid]?.daily_usd ?? 0;
        productAdsSpend[pid] = {
          product_id: pid,
          product_name: productNameById.get(pid) ?? 'Unknown',
          total_usd: dailyUsd * dayCount,
        };
      });

      // Now fetch actual revenue from orders for these products in the date range
      // (productIds already validated above)

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
