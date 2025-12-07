import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StaffTarget {
  id: string;
  user_id: string;
  daily_target_leads: number | null;
  daily_target_orders: number | null;
  daily_target_followups: number | null;
  active_from: string;
  active_to: string | null;
  created_at: string;
  profiles?: { name: string; role: string } | null;
}

export function useStaffTargets() {
  return useQuery({
    queryKey: ['staff_targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_targets')
        .select(`
          *,
          profiles:user_id(name, role)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StaffTarget[];
    },
  });
}

export function useActiveStaffTarget(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['staff_targets', userId, 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_targets')
        .select('*')
        .eq('user_id', userId)
        .lte('active_from', today)
        .or(`active_to.is.null,active_to.gte.${today}`)
        .order('active_from', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as StaffTarget | null;
    },
    enabled: !!userId,
  });
}

export function useCreateStaffTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      daily_target_leads?: number;
      daily_target_orders?: number;
      daily_target_followups?: number;
      active_from: string;
      active_to?: string;
    }) => {
      const { data, error } = await supabase
        .from('staff_targets')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff_targets'] });
      toast.success('Staff target created');
    },
    onError: (error) => {
      toast.error(`Failed to create target: ${error.message}`);
    },
  });
}

export function useUpdateStaffTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      daily_target_leads?: number;
      daily_target_orders?: number;
      daily_target_followups?: number;
      active_from?: string;
      active_to?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('staff_targets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff_targets'] });
      toast.success('Target updated');
    },
    onError: (error) => {
      toast.error(`Failed to update target: ${error.message}`);
    },
  });
}

export function useDeleteStaffTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('staff_targets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff_targets'] });
      toast.success('Target deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete target: ${error.message}`);
    },
  });
}
