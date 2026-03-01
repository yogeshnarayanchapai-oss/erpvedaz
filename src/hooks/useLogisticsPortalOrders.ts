import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notifyLogisticsStatusUpdate, notifyOrderRedirected } from '@/lib/notificationHelpers';

interface LogisticsOrdersFilters {
  dateFrom?: string;
  dateTo?: string;
}

export function useLogisticsPortalOrders(filters: LogisticsOrdersFilters = {}) {
  const queryClient = useQueryClient();

  // Realtime removed — use manual refresh to avoid refetch storms

  return useQuery({
    queryKey: ['logistics-portal-orders', filters],
    queryFn: async () => {
      // Use EXACT same query structure as useFollowupOrders (which works)
      let query = supabase
        .from('orders')
        .select(`
          *,
          products (id, name),
          leads:leads!orders_lead_id_fkey (id, client_name, contact_number, remark, full_address, reference_id),
          customers:customers!orders_customer_id_fkey (id, customer_name, phone_number),
          profiles:profiles!orders_sales_person_id_fkey (id, name),
          confirmed_by_profile:profiles!orders_confirmed_by_user_id_fkey (id, name),
          redirected_by:profiles!orders_redirected_by_user_id_fkey (id, name),
          order_items (id, product_id, product_name, quantity, unit_price, discount, total_price)
        `)
        .eq('is_deleted', false)
        .order('order_date', { ascending: false });

      // Date filtering - same as useFollowupOrders
      if (filters.dateFrom) {
        query = query.gte('order_date', `${filters.dateFrom}T00:00:00`);
      }
      if (filters.dateTo) {
        query = query.lte('order_date', `${filters.dateTo}T23:59:59`);
      }
      // Don't filter by delivery/status at query level - do it client-side for proper card counts

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useLogisticsRedirectOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      branch,
      deliveryLocation,
      courier,
      remark,
      userId,
      userName,
    }: {
      orderId: string;
      branch?: string;
      deliveryLocation?: string;
      courier?: string;
      remark: string;
      userId: string;
      userName: string;
    }) => {
      // Get order details for notification before updating
      const { data: order } = await supabase
        .from('orders')
        .select(`
          id,
          sales_person_id,
          store_id,
          amount,
          leads:leads!orders_lead_id_fkey (client_name),
          products (name)
        `)
        .eq('id', orderId)
        .single();

      const now = new Date().toISOString();
      const redirectNote = `Redirected by ${userName} on ${new Date().toLocaleDateString()}`;
      const fullRemark = remark ? `${remark}\n${redirectNote}` : redirectNote;

      const updateData: Record<string, any> = {
        order_status: 'REDIRECT',
        delivery_notes: fullRemark,
        redirected_by_user_id: userId,
        redirected_at: now,
      };

      if (branch) {
        updateData.destination_branch = branch;
      }
      if (deliveryLocation) {
        updateData.delivery_location = deliveryLocation;
      }
      if (courier) {
        updateData.courier_provider = courier;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Notify the calling staff who owns the order
      if (order && order.sales_person_id && order.sales_person_id !== userId) {
        try {
          await notifyOrderRedirected({
            orderId,
            productName: (order.products as any)?.name || 'Product',
            customerName: (order.leads as any)?.client_name || 'Customer',
            amount: order.amount || 0,
            callingStaffId: order.sales_person_id,
            actorId: userId,
            actorName: userName,
            storeId: order.store_id || undefined,
          });
        } catch (notifyError) {
          console.error('Failed to send redirect notification:', notifyError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics-portal-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useLogisticsMarkDelivered() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      userId,
    }: {
      orderId: string;
      userId: string;
    }) => {
      const now = new Date().toISOString();

      // Get order details for notification
      const { data: order } = await supabase
        .from('orders')
        .select(`
          id, 
          sales_person_id,
          store_id,
          leads:leads!orders_lead_id_fkey (client_name)
        `)
        .eq('id', orderId)
        .single();

      const { error } = await supabase
        .from('orders')
        .update({
          order_status: 'DELIVERED',
          delivered_at: now,
          delivered_by: userId,
        })
        .eq('id', orderId);

      if (error) throw error;

      // Notify order owner
      if (order && order.sales_person_id && order.sales_person_id !== userId) {
        const { data: actorProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .single();

        try {
          await notifyLogisticsStatusUpdate({
            orderId,
            customerName: (order.leads as any)?.client_name || 'Customer',
            newStatus: 'DELIVERED',
            orderOwnerUserId: order.sales_person_id,
            actorId: userId,
            actorName: actorProfile?.name || 'Logistics',
            storeId: order.store_id || undefined,
          });
        } catch (notifyError) {
          console.error('Failed to send notification:', notifyError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics-portal-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
