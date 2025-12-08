import { useEffect, useState } from 'react';
import { useParams, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

/**
 * StoreRouteWrapper - Validates the store slug from URL and passes it to children
 * This component ensures that the store exists and the user has access to it
 */
export function StoreRouteWrapper() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { user, loading: authLoading } = useAuth();
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

      try {
        // Fetch store by slug
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('id, name, slug, is_active')
          .eq('slug', storeSlug)
          .eq('is_active', true)
          .single();

        if (storeError || !storeData) {
          setError(`Store "${storeSlug}" not found`);
          setLoading(false);
          return;
        }

        // If user is logged in, check access
        if (user) {
          const { data: accessData } = await supabase
            .rpc('get_user_accessible_stores', { p_user_id: user.id });

          const hasAccess = accessData?.some(
            (s: { store_id: string }) => s.store_id === storeData.id
          );

          if (!hasAccess) {
            // Check if user is OWNER (they have access to all stores)
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .eq('role', 'OWNER')
              .single();

            if (!roleData) {
              setError('You do not have access to this store');
              setLoading(false);
              return;
            }
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
  }, [storeSlug, user, authLoading]);

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
            onClick={() => navigate('/auth')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!store) {
    return null;
  }

  // Pass store info via outlet context
  return <Outlet context={{ store, storeSlug }} />;
}

// Hook to access store context in child routes
export function useStoreContext() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  return { storeSlug };
}
