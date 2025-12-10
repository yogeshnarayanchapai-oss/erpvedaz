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

export async function checkPhoneDuplicate(
  phone: string,
  storeId: string | undefined | null
): Promise<DuplicateCheckResult> {
  if (!phone || phone.length < 10 || !storeId) {
    return { isDuplicate: false, existingCustomer: null, existingLead: null };
  }

  const cleanPhone = phone.replace(/\D/g, '');

  // Check customers table for same store
  const { data: customer } = await supabase
    .from('customers')
    .select('id, customer_name, total_orders, rto_orders')
    .eq('phone_number', cleanPhone)
    .eq('store_id', storeId)
    .maybeSingle();

  // Check leads table for same store (recent leads within 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: lead } = await supabase
    .from('leads')
    .select('id, client_name, status, products:product_id(name)')
    .eq('contact_number', cleanPhone)
    .eq('store_id', storeId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const existingCustomer = customer
    ? {
        id: customer.id,
        name: customer.customer_name,
        total_orders: customer.total_orders,
        rto_orders: customer.rto_orders,
      }
    : null;

  const existingLead = lead
    ? {
        id: lead.id,
        name: lead.client_name,
        status: lead.status,
        product_name: (lead.products as any)?.name || null,
      }
    : null;

  return {
    isDuplicate: !!customer || !!lead,
    existingCustomer,
    existingLead,
  };
}

// Check multiple phone numbers and mark duplicates
export async function checkAndMarkDuplicates(
  phones: string[],
  storeId: string | undefined | null,
  excludeLeadIds: string[] = []
): Promise<Map<string, DuplicateCheckResult>> {
  const results = new Map<string, DuplicateCheckResult>();
  
  if (!storeId) return results;

  for (const phone of phones) {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) continue;
    
    const result = await checkPhoneDuplicate(cleanPhone, storeId);
    
    // Filter out the lead if it's in the exclude list (the lead being created/edited itself)
    if (result.existingLead && excludeLeadIds.includes(result.existingLead.id)) {
      result.isDuplicate = !!result.existingCustomer;
      result.existingLead = null;
    }
    
    results.set(cleanPhone, result);
  }

  return results;
}
