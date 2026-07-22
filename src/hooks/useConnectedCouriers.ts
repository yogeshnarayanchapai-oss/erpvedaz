import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ConnectedCourier = {
  courier: 'NCM' | 'GBL' | 'PATHAO' | 'GAAUBESI';
  label: string;
  is_active: boolean;
};

/**
 * Returns list of couriers that are marked active AND have their required
 * API credentials filled in logistics_settings.
 */
export function useConnectedCouriers() {
  return useQuery({
    queryKey: ['connected-couriers'],
    queryFn: async (): Promise<ConnectedCourier[]> => {
      const { data, error } = await supabase
        .from('logistics_settings')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;

      const out: ConnectedCourier[] = [];
      for (const s of data || []) {
        const c = (s as any).courier as ConnectedCourier['courier'];
        let connected = false;
        if (c === 'NCM') connected = !!(s as any).api_base_url && !!(s as any).api_token && !!(s as any).partner_id;
        else if (c === 'GBL') connected = !!(s as any).api_base_url && !!(s as any).client_id;
        else if (c === 'PATHAO') connected = !!(s as any).api_base_url && !!(s as any).api_token && !!(s as any).store_id;
        else if (c === 'GAAUBESI') connected = !!(s as any).api_base_url && !!(s as any).api_token;
        if (connected) out.push({ courier: c, label: c, is_active: true });
      }
      return out;
    },
    staleTime: 60_000,
  });
}
