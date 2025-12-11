import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerInsight {
  exists: boolean;
  id?: string;
  name?: string | null;
  total_orders?: number;
  total_amount?: number;
  last_order_at?: string | null;
  rto_count?: number;
  delivered_count?: number;
  rating?: number;
  last_order_ago_label?: string;
  // Cross-store info
  store_id?: string;
  store_name?: string | null;
  handled_by_user_id?: string | null;
  handled_by_name?: string | null;
  is_different_store?: boolean;
  // Product info
  last_product_name?: string | null;
  last_product_price?: number | null;
}

/**
 * Calculate customer rating (1-5 stars) based on order history
 * - base_score = total_orders * 1.0 - rto_count * 1.5
 * - Maps to 1-5 stars
 */
export function calculateCustomerRating(totalOrders: number, rtoCount: number): number {
  const baseScore = totalOrders * 1.0 - rtoCount * 1.5;
  
  if (baseScore <= 0) return 1;
  if (baseScore <= 2) return 2;
  if (baseScore <= 4) return 3;
  if (baseScore <= 7) return 4;
  return 5;
}

/**
 * Get human-readable label for last order date
 */
export function getLastOrderAgoLabel(lastOrderDate: string | null): string {
  if (!lastOrderDate) return 'No previous orders';
  
  const lastOrder = new Date(lastOrderDate);
  const now = new Date();
  const diffMs = now.getTime() - lastOrder.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays <= 30) return `${diffDays} days ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
}

export function useCustomerInsight(phone: string, currentStoreId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ['customer-insight', phone],
    queryFn: async (): Promise<CustomerInsight> => {
      if (!phone || phone.length < 10) {
        return { exists: false };
      }

      const cleanPhone = phone.replace(/\D/g, '');

      // Use RPC function to bypass RLS and get complete customer data
      const { data: rawData, error } = await supabase
        .rpc('get_customer_insight', { p_phone: cleanPhone });

      if (error) {
        console.error('Customer insight error:', error);
        return { exists: false };
      }

      const data = rawData as {
        exists: boolean;
        id?: string;
        name?: string;
        total_orders?: number;
        total_amount?: number;
        rto_count?: number;
        delivered_count?: number;
        last_order_at?: string;
        store_id?: string;
        store_name?: string;
        handled_by_name?: string;
        last_product_name?: string;
        last_product_price?: number;
      } | null;

      if (!data || !data.exists) {
        return { exists: false };
      }

      const totalOrders = data.total_orders || 0;
      const rtoCount = data.rto_count || 0;
      const rating = calculateCustomerRating(totalOrders, rtoCount);
      const lastOrderAgoLabel = getLastOrderAgoLabel(data.last_order_at);
      const isDifferentStore = currentStoreId ? data.store_id !== currentStoreId : false;

      return {
        exists: true,
        id: data.id,
        name: data.name,
        total_orders: totalOrders,
        total_amount: data.total_amount || 0,
        last_order_at: data.last_order_at,
        rto_count: rtoCount,
        delivered_count: data.delivered_count || 0,
        rating,
        last_order_ago_label: lastOrderAgoLabel,
        store_id: data.store_id,
        store_name: data.store_name,
        handled_by_user_id: null,
        handled_by_name: data.handled_by_name,
        is_different_store: isDifferentStore,
        last_product_name: data.last_product_name,
        last_product_price: data.last_product_price,
      };
    },
    enabled: enabled && !!phone && phone.replace(/\D/g, '').length >= 10,
    staleTime: 30000,
  });
}
