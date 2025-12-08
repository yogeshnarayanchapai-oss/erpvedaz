import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
}

const CurrentStoreContext = createContext<CurrentStoreContextType | undefined>(undefined);

export function CurrentStoreProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isOwner = profile?.role === 'OWNER';
  const canSwitchStores = isOwner;

  const fetchStores = useCallback(async () => {
    if (!user?.id) {
      setAvailableStores([]);
      setCurrentStoreState(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

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
          // 1. Previously selected (localStorage)
          // 2. User's default store
          // 3. First available store
          const savedStoreId = localStorage.getItem(`currentStore_${user.id}`);
          const defaultStoreId = profile?.default_store_id;

          let selectedStore = storesWithAccess.find(s => s.id === savedStoreId);
          if (!selectedStore && defaultStoreId) {
            selectedStore = storesWithAccess.find(s => s.id === defaultStoreId);
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
  }, [user?.id, isOwner, profile?.default_store_id]);

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
