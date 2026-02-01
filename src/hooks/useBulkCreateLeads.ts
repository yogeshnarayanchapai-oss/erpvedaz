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

const BATCH_SIZE = 100; // Insert leads in batches for large imports
const MAX_DUPLICATE_NOTIFICATIONS = 5; // Limit individual duplicate notifications

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
      
      // Batch insert for large imports to prevent timeout
      let allInsertedLeads: any[] = [];
      
      if (leadsToInsert.length <= BATCH_SIZE) {
        // Small batch - insert all at once (faster for typical use case)
        const { data, error } = await supabase.from('leads').insert(leadsToInsert).select('id, is_duplicate, contact_number');
        if (error) {
          console.error('Bulk insert error:', error);
          throw new Error(`Failed to create leads: ${error.message}`);
        }
        allInsertedLeads = data || [];
      } else {
        // Large batch - split into chunks with small delay to prevent timeout
        for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
          const batch = leadsToInsert.slice(i, i + BATCH_SIZE);
          const { data, error } = await supabase.from('leads').insert(batch).select('id, is_duplicate, contact_number');
          if (error) {
            console.error(`Batch ${i / BATCH_SIZE + 1} insert error:`, error);
            throw new Error(`Failed at batch ${i / BATCH_SIZE + 1}: ${error.message}`);
          }
          allInsertedLeads.push(...(data || []));
          
          // Small delay between batches to avoid rate limiting
          if (i + BATCH_SIZE < leadsToInsert.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }
      
      // Send notification to Admin about new leads
      try {
        await notifyNewLeadsCreated({
          count: allInsertedLeads.length,
          createdByName: profile?.name || 'Staff',
          createdById: user.id,
          portal: 'LEADS',
          storeId: currentStore?.id,
        });
        
        // Batch duplicate notifications - only send first N individually, then summary
        const duplicateLeads = allInsertedLeads.filter(l => l.is_duplicate);
        
        if (duplicateLeads.length > 0) {
          // Send individual notifications for first few duplicates
          const individualNotifications = duplicateLeads.slice(0, MAX_DUPLICATE_NOTIFICATIONS);
          
          await Promise.all(individualNotifications.map(async (lead) => {
            const cleanPhone = lead.contact_number.replace(/\D/g, '');
            const existingCustomer = customerMap.get(cleanPhone);
            const existingLead = leadMap.get(cleanPhone);
            
            return notifyDuplicatePhoneDetected({
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
          }));
          
          // If there are more duplicates, log summary (don't spam notifications)
          if (duplicateLeads.length > MAX_DUPLICATE_NOTIFICATIONS) {
            console.log(`[Bulk Import] ${duplicateLeads.length - MAX_DUPLICATE_NOTIFICATIONS} additional duplicate notifications suppressed`);
          }
        }
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return allInsertedLeads;
    },
    onSuccess: async (data) => {
      // Invalidate ALL leads queries with any query key starting with 'leads'
      // Use exact: false to ensure partial matching works correctly
      await queryClient.invalidateQueries({ 
        queryKey: ['leads'], 
        exact: false,
        refetchType: 'all' // Refetch all matching queries, not just active ones
      });
      
      // Also invalidate related queries that might show lead counts
      await queryClient.invalidateQueries({ queryKey: ['leads-transfer-summary'] });
      
      // Force immediate refetch of all lead queries
      await queryClient.refetchQueries({ 
        queryKey: ['leads'], 
        exact: false,
        type: 'all' 
      });
      
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
