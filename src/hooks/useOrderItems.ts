import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount: number;
  variant_details?: Record<string, any> | null;
  created_at: string;
}

export interface OrderItemInput {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount?: number;
}

export function useOrderItems(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order-items', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!orderId,
  });
}

// Fetch order items for multiple orders at once
export function useOrderItemsByOrderIds(orderIds: string[]) {
  return useQuery({
    queryKey: ['order-items-batch', orderIds],
    queryFn: async () => {
      if (!orderIds.length) return {};
      
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Group by order_id
      const grouped: Record<string, OrderItem[]> = {};
      (data as OrderItem[]).forEach(item => {
        if (!grouped[item.order_id]) {
          grouped[item.order_id] = [];
        }
        grouped[item.order_id].push(item);
      });
      return grouped;
    },
    enabled: orderIds.length > 0,
  });
}

export function useCreateOrderItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, items }: { orderId: string; items: OrderItemInput[] }) => {
      const orderItems = items.map(item => {
        const subtotal = item.quantity * item.unit_price;
        const discount = item.discount || 0;
        return {
          order_id: orderId,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: discount,
          total_price: Math.max(0, subtotal - discount),
        };
      });

      const { data, error } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order-items', variables.orderId] });
    },
    onError: (error) => {
      toast.error(`Failed to create order items: ${error.message}`);
    },
  });
}

export function useUpdateOrderItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, items }: { orderId: string; items: OrderItemInput[] }) => {
      // Delete existing items first
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (deleteError) throw deleteError;

      // Insert new items
      if (items.length > 0) {
        const orderItems = items.map(item => {
          const subtotal = item.quantity * item.unit_price;
          const discount = item.discount || 0;
          return {
            order_id: orderId,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: discount,
            total_price: Math.max(0, subtotal - discount),
          };
        });

        const { data, error } = await supabase
          .from('order_items')
          .insert(orderItems)
          .select();

        if (error) throw error;
        return data;
      }
      return [];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order-items', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      toast.error(`Failed to update order items: ${error.message}`);
    },
  });
}
