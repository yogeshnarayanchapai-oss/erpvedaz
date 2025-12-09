import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyNewLeadsCreated } from '@/lib/notificationHelpers';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';

export interface BulkLeadInput {
  date: string;
  client_name: string;
  contact_number: string;
  alt_phone?: string;
  product_id: string;
  source?: string;
  remark?: string;
}

export function useBulkCreateLeads() {
  const queryClient = useQueryClient();
  const { currentStore } = useCurrentStore();
  
  return useMutation({
    mutationFn: async (leads: BulkLeadInput[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Fetch user profile for notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      
      // Get the current max reference_id to generate unique ones for bulk insert
      const { data: maxRefData } = await supabase
        .from('leads')
        .select('reference_id')
        .not('reference_id', 'is', null)
        .order('reference_id', { ascending: false })
        .limit(1)
        .single();
      
      let nextRefNum = 1;
      if (maxRefData?.reference_id) {
        const parsed = parseInt(maxRefData.reference_id, 10);
        if (!isNaN(parsed)) {
          nextRefNum = parsed + 1;
        }
      }
      
      const leadsToInsert = leads.map((lead, index) => ({
        ...lead,
        created_by_user_id: user.id,
        created_by_staff_id: user.id,
        status: 'NEW' as const,
        current_team: 'LEADS' as const,
        lead_bucket: 'NEW' as const,
        pool_status: 'IN_POOL' as const,
        store_id: currentStore?.id || null,
        reference_id: String(nextRefNum + index).padStart(4, '0'),
      }));
      const { data, error } = await supabase.from('leads').insert(leadsToInsert).select();
      if (error) throw error;
      
      // Send notification to Admin about new leads
      try {
        await notifyNewLeadsCreated({
          count: data.length,
          createdByName: profile?.name || 'Staff',
          createdById: user.id,
          portal: 'LEADS',
          storeId: currentStore?.id,
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`${data.length} lead${data.length > 1 ? 's' : ''} created`);
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}
