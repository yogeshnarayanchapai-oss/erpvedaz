import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBulkDeleteOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      if (orderIds.length === 0) throw new Error('No orders selected');

      // Soft delete orders by setting is_deleted = true
      const { error } = await supabase
        .from('orders')
        .update({ is_deleted: true })
        .in('id', orderIds);

      if (error) throw error;
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
