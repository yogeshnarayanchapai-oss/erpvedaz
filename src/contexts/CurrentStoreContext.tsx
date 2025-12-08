import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getStoreSlugFromPath } from '@/lib/storeSubdomain';
import { getStoreSlugFromPathname } from '@/hooks/useStoreNavigation';

// Note: This context doesn't use useLocation because it needs to work outside BrowserRouter
// The store slug is extracted from window.location.pathname directly

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
  const [pathname, setPathname] = useState(window.location.pathname);
  
  // Listen for pathname changes
  useEffect(() => {
    const handleLocationChange = () => {
      setPathname(window.location.pathname);
    };
    
    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleLocationChange);
    
    // Also check periodically for SPA navigation
    const interval = setInterval(() => {
      if (window.location.pathname !== pathname) {
        setPathname(window.location.pathname);
      }
    }, 100);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(interval);
    };
  }, [pathname]);
  
  // Get store slug from URL path (e.g., /vedaz/admin/dashboard -> vedaz)
  const storeSubdomain = useMemo(() => {
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length === 0) return null;
    
    const knownRootPaths = [
      'auth', 'setup', 'admin', 'leads', 'calling', 'followup',
      'logistics', 'hr', 'manager', 'marketing', 'hrm', 'training',
      'my-hr', 'settings', 'orders', 'storefront', 'inventory', 'accounting',
      'logistics-portal'
    ];
    
    // If first part is not a known root path, it's likely a store slug
    if (!knownRootPaths.includes(pathParts[0])) {
      return pathParts[0];
    }
    
    return null;
  }, [pathname]);
  const isOwner = profile?.role === 'OWNER';
  const canSwitchStores = isOwner; // OWNER can always switch stores

  const fetchStores = useCallback(async () => {
    if (!user?.id) {
      setAvailableStores([]);
      setCurrentStoreState(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // If on a store path (e.g., /vedaz/admin/dashboard), fetch that store first
      if (storeSubdomain) {
        const { data: pathStore } = await supabase
          .from('stores')
          .select('*')
          .eq('slug', storeSubdomain)
          .eq('is_active', true)
          .single();

        if (pathStore) {
          setCurrentStoreState({ ...pathStore, access_level: 'admin' });
        }
      }

      // Use the database function to get accessible stores
      const { data: accessibleStores, error } = await supabase
        .rpc('get_user_accessible_stores', { p_user_id: user.id });

      if (error) {
        console.error('Error fetching accessible stores:', error);
        // Fallback: fetch all stores for OWNER
        if (isOwner) {
          const { data: allStores } = await supabase
            .from('stores')
            .select('*')
            .eq('is_active', true)
            .order('name');
          
          if (allStores) {
            setAvailableStores(allStores.map(s => ({ ...s, access_level: 'admin' })));
            
            // If we don't have a current store from path, use first available
            if (!storeSubdomain && allStores.length > 0) {
              setCurrentStoreState({ ...allStores[0], access_level: 'admin' });
            }
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

          // Only set current store if not already set from path
          if (!storeSubdomain && !currentStore) {
            let selectedStore: Store | undefined;
            
            // Try saved preference
            const savedStoreId = localStorage.getItem(`currentStore_${user.id}`);
            selectedStore = storesWithAccess.find(s => s.id === savedStoreId);
            
            // Try default store
            if (!selectedStore && profile?.default_store_id) {
              selectedStore = storesWithAccess.find(s => s.id === profile.default_store_id);
            }
            
            // Use first available
            if (!selectedStore) {
              selectedStore = storesWithAccess[0];
            }

            if (selectedStore) {
              setCurrentStoreState(selectedStore);
            }
          }
        }
      } else {
        setAvailableStores([]);
        if (!storeSubdomain) {
          setCurrentStoreState(null);
        }
      }
    } catch (err) {
      console.error('Error in fetchStores:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isOwner, profile?.default_store_id, storeSubdomain, currentStore]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Update current store when URL path changes
  useEffect(() => {
    if (storeSubdomain && availableStores.length > 0) {
      const pathStore = availableStores.find(s => s.slug === storeSubdomain);
      if (pathStore && currentStore?.slug !== storeSubdomain) {
        setCurrentStoreState(pathStore);
      }
    }
  }, [storeSubdomain, availableStores, currentStore?.slug]);

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
