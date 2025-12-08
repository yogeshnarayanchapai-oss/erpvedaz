import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerWithOrders extends Customer {
  orders?: Array<{
    id: string;
    order_date: string;
    order_status: string;
    amount: number | null;
  }>;
}

export function useCustomers(filters?: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  rtoSegment?: 'all' | 'low' | 'medium' | 'high';
  customerType?: 'all' | 'new' | 'returning';
  valueSegment?: 'all' | 'high' | 'medium' | 'low';
  city?: string;
  status?: string;
  storeId?: string;
}) {
  const currentStoreId = useCurrentStoreId();
  const storeId = filters?.storeId || currentStoreId;

  return useQuery({
    queryKey: ['customers', filters, storeId],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by store_id
      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      if (filters?.search) {
        query = query.or(`customer_name.ilike.%${filters.search}%,phone_number.ilike.%${filters.search}%`);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters?.city) {
        query = query.eq('city', filters.city);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Filter by RTO segment
      if (filters?.rtoSegment && filters.rtoSegment !== 'all') {
        filteredData = filteredData.filter(customer => {
          const rtoPercent = customer.total_orders > 0 
            ? ((customer.rto_orders || 0) / customer.total_orders) * 100 
            : 0;
          
          if (filters.rtoSegment === 'low') return rtoPercent <= 5;
          if (filters.rtoSegment === 'medium') return rtoPercent > 5 && rtoPercent <= 15;
          if (filters.rtoSegment === 'high') return rtoPercent > 15;
          return true;
        });
      }

      // Filter by customer type (new vs returning)
      if (filters?.customerType && filters.customerType !== 'all') {
        filteredData = filteredData.filter(customer => {
          const totalOrders = customer.total_orders || 0;
          if (filters.customerType === 'new') return totalOrders <= 1;
          if (filters.customerType === 'returning') return totalOrders > 1;
          return true;
        });
      }

      // Filter by value segment
      if (filters?.valueSegment && filters.valueSegment !== 'all') {
        filteredData = filteredData.filter(customer => {
          const totalValue = customer.total_order_value || 0;
          if (filters.valueSegment === 'high') return totalValue >= 10000;
          if (filters.valueSegment === 'medium') return totalValue >= 5000 && totalValue < 10000;
          if (filters.valueSegment === 'low') return totalValue < 5000;
          return true;
        });
      }

      return filteredData as Customer[];
    },
    enabled: !!storeId,
  });
}

export function useCustomerDetail(customerId: string) {
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;

      // Get customer's orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_date,
          order_status,
          payment_status,
          amount,
          quantity,
          delivery_location,
          is_cod,
          courier_provider,
          courier_tracking_code,
          products:product_id(name),
          leads:lead_id(contact_number, alt_phone)
        `)
        .eq('customer_id', customerId)
        .order('order_date', { ascending: false });

      if (ordersError) throw ordersError;

      return {
        ...customer,
        orders: orders || [],
      } as CustomerWithOrders;
    },
    enabled: !!customerId,
  });
}

// Alias for order detail pages
export const useOrderDetail = useCustomerDetail;

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Customer>;
    }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer'] });
      toast.success('Customer updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update customer: ${error.message}`);
    },
  });
}
