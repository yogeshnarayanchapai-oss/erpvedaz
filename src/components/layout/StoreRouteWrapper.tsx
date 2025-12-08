import { useEffect, useState, createContext, useContext } from 'react';
import { useParams, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  logo_url?: string | null;
  primary_color?: string | null;
}

interface StoreContextValue {
  store: StoreInfo | null;
  storeSlug: string | null;
  storeId: string | null;
}

const StoreContext = createContext<StoreContextValue>({
  store: null,
  storeSlug: null,
  storeId: null,
});

/**
 * StoreRouteWrapper - Validates the store slug from URL and passes it to children
 * This component ensures that the store exists and the user has access to it
 */
export function StoreRouteWrapper() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function validateStore() {
      if (!storeSlug) {
        setError('No store specified');
        setLoading(false);
        return;
      }

      // Wait for auth to complete
      if (authLoading) return;

      // If no user, redirect to auth
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        // Fetch store by slug
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('id, name, slug, is_active, logo_url, primary_color')
          .eq('slug', storeSlug)
          .eq('is_active', true)
          .single();

        if (storeError || !storeData) {
          setError(`Store "${storeSlug}" not found`);
          setLoading(false);
          return;
        }

        // Check if user has access to this store
        const isOwner = profile?.role === 'OWNER';
        
        if (!isOwner) {
          const { data: accessData } = await supabase
            .rpc('get_user_accessible_stores', { p_user_id: user.id });

          const hasAccess = accessData?.some(
            (s: { store_id: string }) => s.store_id === storeData.id
          );

          if (!hasAccess) {
            setError('You do not have access to this store');
            setLoading(false);
            return;
          }
        }

        setStore(storeData);
        setLoading(false);
      } catch (err) {
        console.error('Error validating store:', err);
        setError('Failed to load store');
        setLoading(false);
      }
    }

    validateStore();
  }, [storeSlug, user, profile, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading store...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Store Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!store) {
    return null;
  }

  // Pass store info via context provider and outlet context
  return (
    <StoreContext.Provider value={{ store, storeSlug: storeSlug || null, storeId: store.id }}>
      <Outlet context={{ store, storeSlug, storeId: store.id }} />
    </StoreContext.Provider>
  );
}

/**
 * Hook to access store context in child routes
 * This provides the current store info from the URL path
 */
export function useStoreContext(): StoreContextValue {
  const context = useContext(StoreContext);
  const { storeSlug } = useParams<{ storeSlug: string }>();
  
  // If context is set, use it
  if (context.store) {
    return context;
  }
  
  // Fallback to params
  return { 
    store: null, 
    storeSlug: storeSlug || null,
    storeId: null 
  };
}

/**
 * Hook to get store ID from URL route
 * Useful for hooks that need store filtering
 */
export function useStoreId(): string | null {
  const context = useContext(StoreContext);
  return context.storeId;
}
