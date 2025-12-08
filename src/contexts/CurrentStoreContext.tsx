import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getStoreSlugFromPath } from '@/lib/storeSubdomain';
import { getStoreSlugFromPathname } from '@/hooks/useStoreNavigation';

interface Store {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  is_active: boolean;
  access_level?: string;
}

interface CurrentStoreContextType {
  currentStore: Store | null;
  availableStores: Store[];
  isLoading: boolean;
  setCurrentStore: (storeId: string) => Promise<void>;
  canSwitchStores: boolean;
  refreshStores: () => Promise<void>;
  storeSubdomain: string | null;
}

const CurrentStoreContext = createContext<CurrentStoreContextType | undefined>(undefined);

export function CurrentStoreProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storeSubdomain] = useState<string | null>(() => getStoreSlugFromPath() || getStoreSlugFromPathname(window.location.pathname));

  const isOwner = profile?.role === 'OWNER';
  const canSwitchStores = isOwner && !storeSubdomain; // Can't switch if on a specific store subdomain

  const fetchStores = useCallback(async () => {
    if (!user?.id) {
      setAvailableStores([]);
      setCurrentStoreState(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // If on a store subdomain, try to find that store first
      if (storeSubdomain) {
        const { data: subdomainStore } = await supabase
          .from('stores')
          .select('*')
          .eq('slug', storeSubdomain)
          .eq('is_active', true)
          .single();

        if (subdomainStore) {
          setAvailableStores([{ ...subdomainStore, access_level: 'admin' }]);
          setCurrentStoreState({ ...subdomainStore, access_level: 'admin' });
          setIsLoading(false);
          return;
        }
      }

      // Use the database function to get accessible stores
      const { data: accessibleStores, error } = await supabase
        .rpc('get_user_accessible_stores', { p_user_id: user.id });

      if (error) {
        console.error('Error fetching accessible stores:', error);
        // Fallback: fetch all stores for OWNER, or user's assigned stores
        if (isOwner) {
          const { data: allStores } = await supabase
            .from('stores')
            .select('*')
            .eq('is_active', true)
            .order('name');
          
          if (allStores) {
            setAvailableStores(allStores.map(s => ({ ...s, access_level: 'admin' })));
          }
        }
        setIsLoading(false);
        return;
      }

      if (accessibleStores && accessibleStores.length > 0) {
        // Fetch full store details
        const storeIds = accessibleStores.map((s: { store_id: string }) => s.store_id);
        const { data: storeDetails } = await supabase
          .from('stores')
          .select('*')
          .in('id', storeIds)
          .eq('is_active', true);

        if (storeDetails) {
          const storesWithAccess = storeDetails.map(store => {
            const access = accessibleStores.find((a: { store_id: string }) => a.store_id === store.id);
            return { ...store, access_level: access?.access_level || 'staff' };
          });
          setAvailableStores(storesWithAccess);

          // Set current store based on priority:
          // 1. Store subdomain (if on one)
          // 2. Previously selected (localStorage)
          // 3. User's default store
          // 4. First available store
          let selectedStore: Store | undefined;
          
          if (storeSubdomain) {
            selectedStore = storesWithAccess.find(s => s.slug === storeSubdomain);
          }
          
          if (!selectedStore) {
            const savedStoreId = localStorage.getItem(`currentStore_${user.id}`);
            selectedStore = storesWithAccess.find(s => s.id === savedStoreId);
          }
          
          if (!selectedStore && profile?.default_store_id) {
            selectedStore = storesWithAccess.find(s => s.id === profile.default_store_id);
          }
          
          if (!selectedStore) {
            selectedStore = storesWithAccess[0];
          }

          if (selectedStore) {
            setCurrentStoreState(selectedStore);
          }
        }
      } else {
        setAvailableStores([]);
        setCurrentStoreState(null);
      }
    } catch (err) {
      console.error('Error in fetchStores:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isOwner, profile?.default_store_id, storeSubdomain]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const setCurrentStore = async (storeId: string) => {
    if (!canSwitchStores && availableStores.length <= 1) {
      console.warn('User cannot switch stores');
      return;
    }

    const store = availableStores.find(s => s.id === storeId);
    if (store) {
      setCurrentStoreState(store);
      if (user?.id) {
        localStorage.setItem(`currentStore_${user.id}`, storeId);
      }
    }
  };

  const refreshStores = async () => {
    await fetchStores();
  };

  return (
    <CurrentStoreContext.Provider
      value={{
        currentStore,
        availableStores,
        isLoading,
        setCurrentStore,
        canSwitchStores,
        refreshStores,
        storeSubdomain,
      }}
    >
      {children}
    </CurrentStoreContext.Provider>
  );
}

export function useCurrentStore() {
  const context = useContext(CurrentStoreContext);
  if (context === undefined) {
    throw new Error('useCurrentStore must be used within a CurrentStoreProvider');
  }
  return context;
}
