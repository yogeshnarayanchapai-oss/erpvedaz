import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LeadEvalResult {
  score: number;
  label: 'Hot' | 'Warm' | 'Cold';
  followup_text: string;
  evaluated_at: string;
}

export function useAiLeadEval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string): Promise<LeadEvalResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-evaluate-lead`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ leadId })
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to evaluate lead');
      }

      return await response.json();
    },
    onSuccess: (data, leadId) => {
      toast.success('AI evaluation completed', {
        description: `Lead scored as ${data.label} (${data.score}/100)`
      });
      
      // Invalidate lead queries to refetch with new AI data
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error: Error) => {
      console.error('Lead evaluation error:', error);
      toast.error('Failed to evaluate lead', {
        description: error.message
      });
    }
  });
}