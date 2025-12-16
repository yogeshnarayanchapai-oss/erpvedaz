import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyNewLeadsCreated, notifyDuplicatePhoneDetected } from '@/lib/notificationHelpers';
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
      
      // Check for duplicates before creating leads
      const phoneNumbers = leads.map(l => l.contact_number.replace(/\D/g, ''));
      
      // Check existing customers and leads
      const [customersResult, existingLeadsResult] = await Promise.all([
        supabase.from('customers').select('phone_number, customer_name, total_orders').in('phone_number', phoneNumbers),
        supabase.from('leads').select('contact_number, client_name').in('contact_number', phoneNumbers).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);
      
      const existingCustomerPhones = new Set((customersResult.data || []).map(c => c.phone_number));
      const existingLeadPhones = new Set((existingLeadsResult.data || []).map(l => l.contact_number.replace(/\D/g, '')));
      
      // Create map for duplicate info
      const customerMap = new Map((customersResult.data || []).map(c => [c.phone_number, c]));
      const leadMap = new Map((existingLeadsResult.data || []).map(l => [l.contact_number.replace(/\D/g, ''), l]));
      
      // Let the database trigger handle reference_id generation atomically
      const leadsToInsert = leads.map((lead) => {
        const cleanPhone = lead.contact_number.replace(/\D/g, '');
        const isDuplicate = existingCustomerPhones.has(cleanPhone) || existingLeadPhones.has(cleanPhone);
        
        return {
          ...lead,
          created_by_user_id: user.id,
          created_by_staff_id: user.id,
          status: 'NEW' as const,
          current_team: 'LEADS' as const,
          lead_bucket: 'NEW' as const,
          pool_status: 'IN_POOL' as const,
          store_id: currentStore?.id || null,
          is_duplicate: isDuplicate,
          entry_type: 'BULK',
        };
      });
      
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
        
        // Send duplicate notifications for each duplicate lead
        const duplicateLeads = data.filter(l => l.is_duplicate);
        for (const lead of duplicateLeads) {
          const cleanPhone = lead.contact_number.replace(/\D/g, '');
          const existingCustomer = customerMap.get(cleanPhone);
          const existingLead = leadMap.get(cleanPhone);
          
          await notifyDuplicatePhoneDetected({
            leadId: lead.id,
            customerName: lead.client_name,
            phone: lead.contact_number,
            existingCustomerName: existingCustomer?.customer_name,
            existingCustomerOrders: existingCustomer?.total_orders,
            existingLeadName: existingLead?.client_name,
            actorId: user.id,
            actorName: profile?.name || 'Staff',
            storeId: currentStore?.id,
          });
        }
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      const duplicateCount = data.filter(l => l.is_duplicate).length;
      if (duplicateCount > 0) {
        toast.warning(`${data.length} lead${data.length > 1 ? 's' : ''} created. ${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''} detected!`);
      } else {
        toast.success(`${data.length} lead${data.length > 1 ? 's' : ''} created`);
      }
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
}
