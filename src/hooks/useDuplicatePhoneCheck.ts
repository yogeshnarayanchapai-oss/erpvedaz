import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingCustomer: {
    id: string;
    name: string | null;
    total_orders: number | null;
    rto_orders: number | null;
    store_id?: string;
    store_name?: string | null;
    handled_by_name?: string | null;
  } | null;
  existingLead: {
    id: string;
    name: string | null;
    status: string | null;
    product_name: string | null;
    store_id?: string;
    store_name?: string | null;
    assigned_to_name?: string | null;
  } | null;
}

export function useDuplicatePhoneCheck(phone: string, currentStoreId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ['duplicate-phone-check', phone],
    queryFn: async (): Promise<DuplicateCheckResult> => {
      if (!phone || phone.length < 10) {
        return { isDuplicate: false, existingCustomer: null, existingLead: null };
      }

      const cleanPhone = phone.replace(/\D/g, '');

      // Check customers table - ALL stores
      const { data: customer } = await supabase
        .from('customers')
        .select(`
          id, customer_name, total_orders, rto_orders, store_id,
          stores:store_id(name)
        `)
        .eq('phone_number', cleanPhone)
        .order('total_orders', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get staff info for customer
      let customerHandledByName: string | null = null;
      if (customer) {
        try {
          const { data: lastOrder } = await supabase
            .from('orders')
            .select('profiles:sales_person_id(full_name)')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (lastOrder) {
            customerHandledByName = (lastOrder.profiles as any)?.full_name || null;
          }
        } catch (e) {}
      }

      // Check leads table - ALL stores (recent leads within 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: lead } = await supabase
        .from('leads')
        .select(`
          id, client_name, status, store_id,
          products:product_id(name),
          stores:store_id(name),
          profiles:assigned_to_user_id(full_name)
        `)
        .eq('contact_number', cleanPhone)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const existingCustomer = customer ? {
        id: customer.id,
        name: customer.customer_name,
        total_orders: customer.total_orders,
        rto_orders: customer.rto_orders,
        store_id: customer.store_id,
        store_name: (customer.stores as any)?.name || null,
        handled_by_name: customerHandledByName,
      } : null;

      const existingLead = lead ? {
        id: lead.id,
        name: lead.client_name,
        status: lead.status,
        product_name: (lead.products as any)?.name || null,
        store_id: lead.store_id,
        store_name: (lead.stores as any)?.name || null,
        assigned_to_name: (lead.profiles as any)?.full_name || null,
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
