import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SalesRecord {
  id: string;
  order_id: string;
  product_id: string | null;
  qty: number;
  amount: number;
  recorded_at: string;
  type: 'invoice' | 'reversal';
  note: string | null;
  created_by: string | null;
  created_at: string;
  orders?: {
    order_number: number;
    leads?: { client_name: string } | null;
  } | null;
  products?: { name: string } | null;
}

export function useSalesRecords(filters?: {
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
  type?: 'invoice' | 'reversal' | 'all';
}) {
  return useQuery({
    queryKey: ['sales-records', filters],
    queryFn: async () => {
      let query = supabase
        .from('sales_records')
        .select(`
          *,
          orders:order_id(order_number, leads:lead_id(client_name)),
          products:product_id(name)
        `)
        .order('recorded_at', { ascending: false });

      if (filters?.dateFrom) {
        query = query.gte('recorded_at', filters.dateFrom + 'T00:00:00');
      }
      if (filters?.dateTo) {
        query = query.lte('recorded_at', filters.dateTo + 'T23:59:59');
      }
      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SalesRecord[];
    },
  });
}

export function useCreateSalesRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      orderId: string;
      productId?: string;
      qty: number;
      amount: number;
      type: 'invoice' | 'reversal';
      note?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('sales_records')
        .insert({
          order_id: input.orderId,
          product_id: input.productId,
          qty: input.qty,
          amount: input.amount,
          type: input.type,
          note: input.note,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-records'] });
    },
  });
}

// Get sales summary for product daybook (only counted orders)
export function useProductDaybook(filters?: {
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
}) {
  return useQuery({
    queryKey: ['product-daybook', filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_date,
          confirmed_at,
          quantity,
          amount,
          is_counted_in_sales,
          product_id,
          products:product_id(name, cost_price, selling_price),
          leads:lead_id(client_name)
        `)
        .eq('is_counted_in_sales', true)
        .order('confirmed_at', { ascending: false });

      // Filter by confirmed_at date range
      if (filters?.dateFrom) {
        query = query.gte('confirmed_at', filters.dateFrom + 'T00:00:00');
      }
      if (filters?.dateTo) {
        query = query.lte('confirmed_at', filters.dateTo + 'T23:59:59');
      }
      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
