import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'OWNER' | 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'HR' | 'ACCOUNTANT' | 'WAREHOUSE';

interface Store {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  is_active: boolean;
  access_level?: string;
  store_role?: AppRole | null;
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
  // Users can switch stores if they have access to multiple stores OR if they're OWNER
  const canSwitchStores = isOwner || availableStores.length > 1;

  const fetchStores = useCallback(async () => {
    if (!user?.id) {
      setAvailableStores([]);
      setCurrentStoreState(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch user's store access with store_role
      const { data: userStoreAccess, error: accessError } = await supabase
        .from('user_store_access')
        .select(`
          store_id,
          access_level,
          store_role,
          store:stores(*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      // For OWNER, also get all stores they might not have explicit access to
      let allStoresData: any[] = [];
      if (isOwner) {
        const { data: allStores } = await supabase
          .from('stores')
          .select('*')
          .eq('is_active', true)
          .order('name');
        allStoresData = allStores || [];
      }

      if (accessError && !isOwner) {
        console.error('Error fetching user store access:', accessError);
        setIsLoading(false);
        return;
      }

      // Build stores list
      const storesWithAccess: Store[] = [];
      
      // Add stores from user_store_access (with store_role)
      if (userStoreAccess) {
        userStoreAccess.forEach((access: any) => {
          if (access.store && access.store.is_active) {
            storesWithAccess.push({
              ...access.store,
              access_level: access.access_level || 'staff',
              store_role: access.store_role,
            });
          }
        });
      }

      // For OWNER, add any stores they don't have explicit access to
      if (isOwner && allStoresData.length > 0) {
        allStoresData.forEach(store => {
          if (!storesWithAccess.find(s => s.id === store.id)) {
            storesWithAccess.push({ ...store, access_level: 'admin', store_role: 'OWNER' });
          }
        });
      }

      if (storesWithAccess.length > 0) {
        setAvailableStores(storesWithAccess);

        // Set current store from saved preference or default
        let selectedStore: Store | undefined;
        
        // Try saved preference
        const savedStoreId = localStorage.getItem(`currentStore_${user.id}`);
        selectedStore = storesWithAccess.find(s => s.id === savedStoreId);
        
        // Try default store
        if (!selectedStore && profile?.default_store_id) {
          selectedStore = storesWithAccess.find(s => s.id === profile.default_store_id);
        }
        
        // Use first available (for staff this is their assigned store)
        if (!selectedStore) {
          selectedStore = storesWithAccess[0];
        }

        if (selectedStore) {
          setCurrentStoreState(selectedStore);
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
