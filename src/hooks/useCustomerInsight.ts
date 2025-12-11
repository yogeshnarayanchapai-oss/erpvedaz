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
  
  if (diffDays === 0) return 'Ordered today';
  if (diffDays === 1) return 'Ordered yesterday';
  if (diffDays <= 30) return `Last order: ${diffDays} days ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return 'Last order: 1 month ago';
  return `Last order: ${diffMonths} months ago`;
}

export function useCustomerInsight(phone: string, storeId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ['customer-insight', phone, storeId],
    queryFn: async (): Promise<CustomerInsight> => {
      if (!phone || phone.length < 10) {
        return { exists: false };
      }

      const cleanPhone = phone.replace(/\D/g, '');

      let query = supabase
        .from('customers')
        .select('id, customer_name, total_orders, total_order_value, rto_orders, delivered_orders, last_order_date')
        .eq('phone_number', cleanPhone);
      
      // Filter by store if storeId provided
      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data: customer, error } = await query.maybeSingle();

      if (error) {
        console.error('Customer insight error:', error);
        return { exists: false };
      }

      if (!customer) {
        return { exists: false };
      }

      const totalOrders = customer.total_orders || 0;
      const rtoCount = customer.rto_orders || 0;
      const rating = calculateCustomerRating(totalOrders, rtoCount);
      const lastOrderAgoLabel = getLastOrderAgoLabel(customer.last_order_date);

      return {
        exists: true,
        id: customer.id,
        name: customer.customer_name,
        total_orders: totalOrders,
        total_amount: customer.total_order_value || 0,
        last_order_at: customer.last_order_date,
        rto_count: rtoCount,
        delivered_count: customer.delivered_orders || 0,
        rating,
        last_order_ago_label: lastOrderAgoLabel,
      };
    },
    enabled: enabled && !!phone && phone.replace(/\D/g, '').length >= 10,
    staleTime: 30000,
  });
}
