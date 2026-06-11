import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export interface LeadCancelReason {
  id: string;
  store_id: string | null;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useLeadCancelReasons(options?: { includeInactive?: boolean }) {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['lead_cancel_reasons', storeId, !!options?.includeInactive],
    queryFn: async () => {
      let query = (supabase as any)
        .from('lead_cancel_reasons')
        .select('*')
        .order('name', { ascending: true });

      if (storeId) {
        query = query.or(`store_id.eq.${storeId},store_id.is.null`);
      }
      if (!options?.includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as LeadCancelReason[];
    },
    enabled: !!storeId,
    staleTime: 60 * 1000,
  });
}

export function useCreateLeadCancelReason() {
  const qc = useQueryClient();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Name required');
      const { data, error } = await (supabase as any)
        .from('lead_cancel_reasons')
        .insert({ name: trimmed, store_id: storeId, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data as LeadCancelReason;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead_cancel_reasons'] });
      toast.success('Cancel reason added');
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });
}

export function useUpdateLeadCancelReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; is_active?: boolean }) => {
      const { data, error } = await (supabase as any)
        .from('lead_cancel_reasons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead_cancel_reasons'] });
      toast.success('Updated');
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });
}

export function useDeleteLeadCancelReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('lead_cancel_reasons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead_cancel_reasons'] });
      toast.success('Deleted');
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });
}
