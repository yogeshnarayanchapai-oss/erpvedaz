import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FollowupLog {
  id: string;
  lead_id: string;
  updated_by: string | null;
  old_status: string | null;
  new_status: string | null;
  note: string | null;
  created_at: string;
  profiles?: { name: string } | null;
}

export function useFollowupLogs(leadId: string | undefined) {
  return useQuery({
    queryKey: ['followup-logs', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('followup_logs')
        .select(`
          *,
          profiles:updated_by(name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FollowupLog[];
    },
    enabled: !!leadId,
  });
}

export function useCreateFollowupLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      oldStatus,
      newStatus,
      note,
    }: {
      leadId: string;
      oldStatus?: string;
      newStatus?: string;
      note?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('followup_logs')
        .insert({
          lead_id: leadId,
          updated_by: user.id,
          old_status: oldStatus,
          new_status: newStatus,
          note,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['followup-logs', variables.leadId] });
    },
  });
}
