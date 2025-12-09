import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';

export interface LeadSource {
  id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  store_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useLeadSources() {
  const { currentStore } = useCurrentStore();

  return useQuery({
    queryKey: ['lead-sources', currentStore?.id],
    queryFn: async () => {
      let query = supabase
        .from('lead_sources')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      // Filter by current store if available
      if (currentStore?.id) {
        query = query.eq('store_id', currentStore.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as LeadSource[];
    },
    enabled: !!currentStore?.id,
  });
}

export function useCreateLeadSource() {
  const queryClient = useQueryClient();
  const { currentStore } = useCurrentStore();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('lead_sources')
        .insert({ 
          name, 
          is_active: true,
          store_id: currentStore?.id || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
      toast.success('Lead source created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create lead source: ${error.message}`);
    },
  });
}

export function useUpdateLeadSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('lead_sources')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
      toast.success('Lead source updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update lead source: ${error.message}`);
    },
  });
}

export function useDeleteLeadSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lead_sources')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
      toast.success('Lead source deactivated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete lead source: ${error.message}`);
    },
  });
}
