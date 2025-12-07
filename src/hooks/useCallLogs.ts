import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CallLog {
  id: string;
  lead_id: string | null;
  staff_id: string | null;
  called_at: string | null;
  outcome: string;
  notes: string | null;
  next_followup_date: string | null;
}

export function useCallLogs(params: string | { dateFrom?: string; dateTo?: string }) {
  const isLeadId = typeof params === 'string';
  
  return useQuery({
    queryKey: ['call-logs', params],
    queryFn: async () => {
      let query = supabase
        .from('call_logs')
        .select('*')
        .order('called_at', { ascending: false });

      if (isLeadId) {
        query = query.eq('lead_id', params);
      } else {
        if (params.dateFrom) {
          query = query.gte('called_at', `${params.dateFrom}T00:00:00`);
        }
        if (params.dateTo) {
          query = query.lte('called_at', `${params.dateTo}T23:59:59`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CallLog[];
    },
    enabled: isLeadId ? !!params : true,
  });
}

export function useCallLogsByUser(userId?: string) {
  return useQuery({
    queryKey: ['call_logs_user', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('call_logs')
        .select('lead_id')
        .eq('staff_id', userId);

      if (error) throw error;
      return data.map(log => log.lead_id);
    },
    enabled: !!userId,
  });
}

export function useCallLogsByUserAndDate(userId?: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['call_logs_user_date', userId, dateFrom, dateTo],
    queryFn: async () => {
      if (!userId) return [];
      
      let query = supabase
        .from('call_logs')
        .select('*')
        .eq('staff_id', userId)
        .order('called_at', { ascending: true });

      if (dateFrom) {
        query = query.gte('called_at', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte('called_at', `${dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CallLog[];
    },
    enabled: !!userId,
  });
}

export function useCreateCallLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      leadId: string;
      outcome: string;
      notes?: string;
      nextFollowupDate?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('call_logs')
        .insert({
          lead_id: input.leadId,
          staff_id: user.id,
          outcome: input.outcome,
          notes: input.notes,
          next_followup_date: input.nextFollowupDate,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-logs'] });
      queryClient.invalidateQueries({ queryKey: ['call_logs_user'] });
    },
    onError: (error) => {
      toast.error(`Failed to log call: ${error.message}`);
    },
  });
}
