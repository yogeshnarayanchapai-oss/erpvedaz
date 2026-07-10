import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';

interface SocialBoxLead {
  id: string;
  full_name: string;
  phone: string;
  product: string;
  source: string;
  status: string;
  notes: string;
  remark: string;
  created_at: string;
  page_id?: string;
  page_name?: string;
}

interface SocialBoxConfig {
  id: string;
  store_id: string;
  api_token: string;
  api_base_url: string;
  is_active: boolean;
  last_synced_at: string | null;
}

export function useSocialBoxConfig() {
  const { currentStore } = useCurrentStore();

  return useQuery({
    queryKey: ['socialbox-config', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return null;
      const { data, error } = await supabase
        .from('socialbox_config')
        .select('*')
        .eq('store_id', currentStore.id)
        .maybeSingle();
      if (error) throw error;
      return data as SocialBoxConfig | null;
    },
    enabled: !!currentStore?.id,
  });
}

export function useSaveSocialBoxConfig() {
  const queryClient = useQueryClient();
  const { currentStore } = useCurrentStore();

  return useMutation({
    mutationFn: async ({ apiToken, apiBaseUrl }: { apiToken: string; apiBaseUrl?: string }) => {
      if (!currentStore?.id) throw new Error('No store selected');

      const { data: existing } = await supabase
        .from('socialbox_config')
        .select('id')
        .eq('store_id', currentStore.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('socialbox_config')
          .update({
            api_token: apiToken,
            ...(apiBaseUrl ? { api_base_url: apiBaseUrl } : {}),
            is_active: true,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('socialbox_config')
          .insert({
            store_id: currentStore.id,
            api_token: apiToken,
            ...(apiBaseUrl ? { api_base_url: apiBaseUrl } : {}),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('SocialBox API connected successfully');
      queryClient.invalidateQueries({ queryKey: ['socialbox-config'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to save config', { description: error.message });
    },
  });
}

export function useFetchSocialBoxLeads() {
  const { currentStore } = useCurrentStore();

  return useMutation({
    mutationFn: async ({ status, limit }: { status?: string; limit?: number } = {}) => {
      if (!currentStore?.id) throw new Error('No store selected');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-socialbox-leads`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            storeId: currentStore.id,
            status,
            limit: limit || 200,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch leads: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        leads: data.leads as SocialBoxLead[],
        new_count: data.new_count || 0,
        truly_new: data.truly_new || 0,
        reactivated: data.reactivated || 0,
        total_active: data.total_active || 0,
      };
    },
    onError: (error: Error) => {
      toast.error('Failed to fetch SocialBox leads', { description: error.message });
    },
  });
}

export function useMarkLeadsTransferred() {
  const { currentStore } = useCurrentStore();

  return useMutation({
    mutationFn: async (socialboxLeadIds: string[]) => {
      if (!currentStore?.id) throw new Error('No store selected');

      const updates = socialboxLeadIds.map(id => ({
        store_id: currentStore.id!,
        socialbox_lead_id: String(id),
        is_transferred: true,
        transferred_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('socialbox_pulled_leads')
        .upsert(updates, { onConflict: 'store_id,socialbox_lead_id' });

      if (error) throw error;
    },
  });
}

export function useDeleteSocialBoxLeads() {
  const { currentStore } = useCurrentStore();

  return useMutation({
    mutationFn: async (socialboxLeadIds: string[]) => {
      if (!currentStore?.id) throw new Error('No store selected');

      const updates = socialboxLeadIds.map(id => ({
        store_id: currentStore.id!,
        socialbox_lead_id: String(id),
        is_deleted: true,
      }));

      const { error } = await supabase
        .from('socialbox_pulled_leads')
        .upsert(updates, { onConflict: 'store_id,socialbox_lead_id' });

      if (error) throw error;
    },
  });
}

export function useStoredSocialBoxLeads() {
  const { currentStore } = useCurrentStore();

  return useQuery({
    queryKey: ['socialbox-stored-leads', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const { data, error } = await supabase
        .from('socialbox_pulled_leads')
        .select('*')
        .eq('store_id', currentStore.id)
        .eq('is_transferred', false)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('pulled_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => {
        const ld = row.lead_data || {};
        return {
          id: row.socialbox_lead_id || row.id,
          full_name: row.full_name || ld.full_name || '',
          phone: row.phone || ld.phone || '',
          product: ld.product || '',
          source: ld.source || 'SocialBox',
          status: ld.status || 'new',
          notes: ld.notes || ld.note || ld.remark || ld.remarks || ld.comment || ld.comments || '',
          remark: ld.remark || ld.remarks || ld.comment || ld.comments || ld.notes || ld.note || '',
          created_at: row.pulled_at,
          page_id: ld.page_id,
          page_name: ld.page_name,
        };
      }) as SocialBoxLead[];
    },
    enabled: !!currentStore?.id,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export type { SocialBoxLead };
