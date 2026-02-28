import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const fetchingRef = useRef(false);
  
  const isOwner = profile?.role === 'OWNER';
  const canSwitchStores = isOwner || availableStores.length > 1;

  const fetchStores = useCallback(async () => {
    if (!user?.id || !profile) {
      setAvailableStores([]);
      setCurrentStoreState(null);
      setIsLoading(false);
      return;
    }

    // Prevent duplicate concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setIsLoading(true);

      // Fetch user's store access - no artificial timeout
      const { data: userStoreAccess, error: accessError } = await supabase
        .from('user_store_access')
        .select(`
          store_id,
          access_level,
          store_role,
          store:stores!inner(id, name, slug, logo_url, primary_color, is_active)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      // For OWNER, also get all stores
      let allStoresData: any[] = [];
      if (isOwner) {
        const { data: allStores } = await supabase
          .from('stores')
          .select('id, name, slug, logo_url, primary_color, is_active')
          .eq('is_active', true)
          .order('name');
        allStoresData = allStores || [];
      }

      if (accessError && !isOwner) {
        console.error('Error fetching user store access:', accessError);
        setIsLoading(false);
        fetchingRef.current = false;
        return;
      }

      const mergeStore = (store: any, access_level: string, store_role: AppRole | null): Store => ({
        id: store.id,
        name: store.name,
        slug: store.slug,
        logo_url: store.logo_url || null,
        primary_color: store.primary_color,
        is_active: store.is_active,
        access_level,
        store_role,
      });

      const storesWithAccess: Store[] = [];
      
      if (userStoreAccess) {
        userStoreAccess.forEach((access: any) => {
          if (access.store && access.store.is_active) {
            storesWithAccess.push(mergeStore(access.store, access.access_level || 'staff', access.store_role));
          }
        });
      }

      if (isOwner && allStoresData.length > 0) {
        allStoresData.forEach(store => {
          if (!storesWithAccess.find(s => s.id === store.id)) {
            storesWithAccess.push(mergeStore(store, 'admin', 'OWNER'));
          }
        });
      }

      if (storesWithAccess.length > 0) {
        setAvailableStores(storesWithAccess);

        let selectedStore: Store | undefined;
        const savedStoreId = localStorage.getItem(`currentStore_${user.id}`);
        selectedStore = storesWithAccess.find(s => s.id === savedStoreId);
        
        if (!selectedStore && profile?.default_store_id) {
          selectedStore = storesWithAccess.find(s => s.id === profile.default_store_id);
        }
        
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
      fetchingRef.current = false;
    }
  }, [user?.id, isOwner, profile?.default_store_id, profile]);

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
    fetchingRef.current = false;
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