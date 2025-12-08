import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function useBulkDeleteOrders() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      if (orderIds.length === 0) throw new Error('No orders selected');

      // Get order details before soft delete for notification
      const { data: ordersToDelete } = await supabase
        .from('orders')
        .select('id, order_number, lead_id, store_id, leads(client_name, contact_number)')
        .in('id', orderIds);

      // Soft delete orders by setting is_deleted = true
      const { error } = await supabase
        .from('orders')
        .update({ is_deleted: true })
        .in('id', orderIds);

      if (error) throw error;

      // Get all OWNER users to notify
      const { data: owners } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'OWNER');

      // Create notifications for each OWNER
      if (owners && owners.length > 0 && ordersToDelete && ordersToDelete.length > 0) {
        const actorName = profile?.name || 'Unknown User';
        
        const notifications = owners.flatMap(owner => 
          ordersToDelete.map(order => {
            const lead = order.leads as { client_name: string | null; contact_number: string | null } | null;
            const customerInfo = lead 
              ? `Customer: ${lead.client_name || 'N/A'}, Phone: ${lead.contact_number || 'N/A'}`
              : `Order #${order.order_number || order.id}`;
            
            return {
              target_user_id: owner.id,
              title: 'Order Deleted',
              message: `Order #${order.order_number || order.id} - ${customerInfo} | Deleted by: ${actorName}`,
              type: 'DELETION',
              store_id: order.store_id,
              actor_id: user?.id,
              actor_name: actorName,
              target_role: 'OWNER'
            };
          })
        );

        await supabase.from('notifications').insert(notifications);
      }

      return orderIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`${count} order(s) deleted successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete orders: ${error.message}`);
    },
  });
}
