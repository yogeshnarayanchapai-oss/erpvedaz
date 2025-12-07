import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrderEvalResult {
  risk_score: number;
  risk_label: 'Low' | 'Medium' | 'High';
  staff_note: string;
  evaluated_at: string;
}

export function useAiOrderEval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string): Promise<OrderEvalResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-evaluate-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ orderId })
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to evaluate order');
      }

      return await response.json();
    },
    onSuccess: (data, orderId) => {
      toast.success('RTO risk analysis completed', {
        description: `Risk: ${data.risk_label} (${data.risk_score}/100)`
      });
      
      // Invalidate order queries to refetch with new AI data
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: Error) => {
      console.error('Order evaluation error:', error);
      toast.error('Failed to analyze RTO risk', {
        description: error.message
      });
    }
  });
}