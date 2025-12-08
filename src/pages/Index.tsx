import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

type AppRole = 'OWNER' | 'ADMIN' | 'LEADS' | 'CALLING' | 'FOLLOWUP' | 'LOGISTICS' | 'MARKETING' | 'MANAGER' | 'HR';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [fetchingStore, setFetchingStore] = useState(false);

  useEffect(() => {
    async function redirectToStore() {
      if (loading) return;
      
      if (!user) {
        navigate('/auth');
        return;
      }
      
      if (!profile) return;
      
      if (!profile.role) {
        // No role assigned - stay on page with message
        return;
      }

      setFetchingStore(true);

      try {
        // Get user's accessible stores
        const { data: accessibleStores } = await supabase
          .rpc('get_user_accessible_stores', { p_user_id: user.id });

        let storeSlug: string | null = null;

        if (accessibleStores && accessibleStores.length > 0) {
          // Get the first store or default store
          const storeId = profile.default_store_id || accessibleStores[0].store_id;
          
          const { data: store } = await supabase
            .from('stores')
            .select('slug')
            .eq('id', storeId)
            .single();

          storeSlug = store?.slug || null;
        }

        // If no store found, try to get any active store for OWNER
        if (!storeSlug && profile.role === 'OWNER') {
          const { data: anyStore } = await supabase
            .from('stores')
            .select('slug')
            .eq('is_active', true)
            .limit(1)
            .single();
          
          storeSlug = anyStore?.slug || null;
        }

        // Role-based route mapping
        const routes: Record<AppRole, string> = {
          OWNER: '/admin/dashboard',
          ADMIN: '/admin/dashboard',
          LEADS: '/leads/dashboard',
          CALLING: '/calling/dashboard',
          FOLLOWUP: '/followup/dashboard',
          LOGISTICS: '/logistics/orders',
          MARKETING: '/marketing/dashboard',
          MANAGER: '/manager/dashboard',
          HR: '/hr/dashboard',
        };

        const basePath = routes[profile.role] || '/calling/dashboard';

        if (storeSlug) {
          // Navigate to store-specific URL: /storeSlug/admin/dashboard
          navigate(`/${storeSlug}${basePath}`);
        } else {
          // Fallback to legacy route if no store found
          navigate(basePath);
        }
      } catch (err) {
        console.error('Error fetching store:', err);
        // Fallback to legacy route
        const routes: Record<AppRole, string> = {
          OWNER: '/admin/dashboard',
          ADMIN: '/admin/dashboard',
          LEADS: '/leads/dashboard',
          CALLING: '/calling/dashboard',
          FOLLOWUP: '/followup/dashboard',
          LOGISTICS: '/logistics/orders',
          MARKETING: '/marketing/dashboard',
          MANAGER: '/manager/dashboard',
          HR: '/hr/dashboard',
        };
        navigate(routes[profile.role] || '/calling/dashboard');
      } finally {
        setFetchingStore(false);
      }
    }

    redirectToStore();
  }, [user, profile, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      {fetchingStore && (
        <p className="ml-2 text-muted-foreground">Loading your store...</p>
      )}
    </div>
  );
};

export default Index;
