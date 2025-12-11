import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingCustomer: {
    id: string;
    name: string | null;
    total_orders: number | null;
    rto_orders: number | null;
  } | null;
  existingLead: {
    id: string;
    name: string | null;
    status: string | null;
    product_name: string | null;
  } | null;
}

export function useDuplicatePhoneCheck(phone: string, storeId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ['duplicate-phone-check', phone, storeId],
    queryFn: async (): Promise<DuplicateCheckResult> => {
      if (!phone || phone.length < 10) {
        return { isDuplicate: false, existingCustomer: null, existingLead: null };
      }

      const cleanPhone = phone.replace(/\D/g, '');

      // Check customers table for same store
      let customerQuery = supabase
        .from('customers')
        .select('id, customer_name, total_orders, rto_orders')
        .eq('phone_number', cleanPhone);
      
      if (storeId) {
        customerQuery = customerQuery.eq('store_id', storeId);
      }
      
      const { data: customer } = await customerQuery.maybeSingle();

      // Check leads table for same store (recent leads within 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let leadQuery = supabase
        .from('leads')
        .select('id, client_name, status, products:product_id(name)')
        .eq('contact_number', cleanPhone)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (storeId) {
        leadQuery = leadQuery.eq('store_id', storeId);
      }
      
      const { data: lead } = await leadQuery.maybeSingle();

      const existingCustomer = customer ? {
        id: customer.id,
        name: customer.customer_name,
        total_orders: customer.total_orders,
        rto_orders: customer.rto_orders,
      } : null;

      const existingLead = lead ? {
        id: lead.id,
        name: lead.client_name,
        status: lead.status,
        product_name: (lead.products as any)?.name || null,
      } : null;

      return {
        isDuplicate: !!customer || !!lead,
        existingCustomer,
        existingLead,
      };
    },
    enabled: enabled && !!phone && phone.length >= 10,
    staleTime: 30000, // Cache for 30 seconds
  });
}
