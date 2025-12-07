import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Store {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  timezone: string;
  currency: string;
  is_active: boolean;
}

interface Branding {
  primary_color: string;
  secondary_color: string;
  font_family: string;
  logo_url: string | null;
  favicon_url: string | null;
  banner_url: string | null;
  announcement_text: string | null;
  whatsapp_number: string | null;
  site_under_construction: boolean;
}

interface StoreContextType {
  store: Store | null;
  branding: Branding | null;
  isLoading: boolean;
  error: string | null;
}

const StoreContext = createContext<StoreContextType>({
  store: null,
  branding: null,
  isLoading: true,
  error: null,
});

export const useStore = () => useContext(StoreContext);

interface StoreProviderProps {
  children: ReactNode;
  hostname?: string; // For server-side or testing
}

export function StoreProvider({ children, hostname }: StoreProviderProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStore() {
      try {
        const host = hostname || window.location.hostname;
        
        // Find store by domain
        const { data: domainData, error: domainError } = await supabase
          .from('store_domains')
          .select('store_id')
          .eq('domain', host)
          .single();

        if (domainError) {
          // Try subdomain matching (e.g., "humla.vakari.store")
          const subdomain = host.split('.')[0];
          const { data: storeData, error: storeError } = await supabase
            .from('stores')
            .select('*')
            .or(`default_subdomain.eq.${subdomain},slug.eq.${subdomain}`)
            .eq('is_active', true)
            .single();

          if (storeError) {
            setError('Store not found');
            setIsLoading(false);
            return;
          }

          setStore(storeData);

          // Load branding
          const { data: brandingData } = await supabase
            .from('branding')
            .select('*')
            .eq('store_id', storeData.id)
            .single();

          setBranding(brandingData || {
            primary_color: '#008060',
            secondary_color: '#004C3F',
            font_family: 'Inter',
            logo_url: null,
            favicon_url: null,
            banner_url: null,
            announcement_text: null,
            whatsapp_number: null,
            site_under_construction: false,
          });
        } else {
          // Load store from domain
          const { data: storeData, error: storeError } = await supabase
            .from('stores')
            .select('*')
            .eq('id', domainData.store_id)
            .eq('is_active', true)
            .single();

          if (storeError) {
            setError('Store not found');
            setIsLoading(false);
            return;
          }

          setStore(storeData);

          // Load branding
          const { data: brandingData } = await supabase
            .from('branding')
            .select('*')
            .eq('store_id', storeData.id)
            .single();

          setBranding(brandingData || {
            primary_color: '#008060',
            secondary_color: '#004C3F',
            font_family: 'Inter',
            logo_url: null,
            favicon_url: null,
            banner_url: null,
            announcement_text: null,
            whatsapp_number: null,
            site_under_construction: false,
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading store:', err);
        setError('Failed to load store');
        setIsLoading(false);
      }
    }

    loadStore();
  }, [hostname]);

  return (
    <StoreContext.Provider value={{ store, branding, isLoading, error }}>
      {children}
    </StoreContext.Provider>
  );
}
