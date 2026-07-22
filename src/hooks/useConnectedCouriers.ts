import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CourierProviderType = 'NCM' | 'GBL' | 'PATHAO' | 'GAAUBESI';

export type ConnectedCourier = {
  id: string;
  courier: CourierProviderType;
  label: string;
  is_active: boolean;
};

/**
 * Returns couriers that are active AND have their required credentials filled.
 * Each row is one user-configured courier (multiple per provider type allowed).
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
      for (const s of (data as any[]) || []) {
        const c = s.courier as CourierProviderType;
        let connected = false;
        if (c === 'NCM') connected = !!s.api_base_url && !!s.api_token && !!s.partner_id;
        else if (c === 'GBL') connected = !!s.api_base_url && !!s.client_id;
        else if (c === 'PATHAO') connected = !!s.api_base_url && !!s.api_token && !!s.store_id;
        else if (c === 'GAAUBESI') connected = !!s.api_base_url && !!s.api_token;
        if (connected) {
          out.push({
            id: s.id,
            courier: c,
            label: s.display_name || c,
            is_active: true,
          });
        }
      }
      return out;
    },
    staleTime: 60_000,
  });
}
