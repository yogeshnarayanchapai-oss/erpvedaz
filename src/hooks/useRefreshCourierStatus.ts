import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRefreshCourierStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke('courier-refresh-status', {
        body: { orderId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data: any) => {
      const status = data?.status || 'unchanged';
      toast.success(`Status refreshed: ${status}`);
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['logistics-orders'] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to refresh status'),
  });
}
