import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Store, ChevronDown, Plus, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
}

interface StoreSwitcherPathProps {
  currentStoreSlug: string;
}

export function StoreSwitcherPath({ currentStoreSlug }: StoreSwitcherPathProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [currentStore, setCurrentStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwner = profile?.role === 'OWNER';

  useEffect(() => {
    async function fetchStores() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch accessible stores
        const { data: accessibleStores } = await supabase
          .rpc('get_user_accessible_stores', { p_user_id: user.id });

        if (accessibleStores && accessibleStores.length > 0) {
          const storeIds = accessibleStores.map((s: { store_id: string }) => s.store_id);
          const { data: storeDetails } = await supabase
            .from('stores')
            .select('id, name, slug, logo_url, primary_color')
            .in('id', storeIds)
            .eq('is_active', true)
            .order('name');

          if (storeDetails) {
            setStores(storeDetails);
            // Find current store by slug
            const current = storeDetails.find(s => s.slug === currentStoreSlug);
            setCurrentStore(current || null);
          }
        }
      } catch (err) {
        console.error('Error fetching stores:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStores();
  }, [user?.id, currentStoreSlug]);

  const handleStoreSwitch = (store: StoreInfo) => {
    // Get current path after store slug
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    // Remove current store slug from path
    const remainingPath = pathParts.slice(1).join('/');
    // Navigate to same path in new store
    navigate(`/${store.slug}/${remainingPath || 'admin/dashboard'}`);
    setOpen(false);
  };

  if (loading) {
    return <Skeleton className="h-9 w-32" />;
  }

  if (!currentStore) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-sm">
        <Store className="h-4 w-4" />
        <span>Unknown Store</span>
      </div>
    );
  }

  // Non-switchable users or single store: just show current store
  if (!isOwner || stores.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
        {currentStore.logo_url ? (
          <img
            src={currentStore.logo_url}
            alt={currentStore.name}
            className="h-5 w-5 rounded object-cover"
          />
        ) : (
          <div
            className="h-5 w-5 rounded flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: currentStore.primary_color || '#6366f1' }}
          >
            {currentStore.name.charAt(0)}
          </div>
        )}
        <span className="font-medium text-sm">{currentStore.name}</span>
      </div>
    );
  }

  // OWNER: Show dropdown with all stores
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 min-w-[140px] justify-between">
          <div className="flex items-center gap-2">
            {currentStore.logo_url ? (
              <img
                src={currentStore.logo_url}
                alt={currentStore.name}
                className="h-5 w-5 rounded object-cover"
              />
            ) : (
              <div
                className="h-5 w-5 rounded flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: currentStore.primary_color || '#6366f1' }}
              >
                {currentStore.name.charAt(0)}
              </div>
            )}
            <span className="font-medium truncate max-w-[100px]">{currentStore.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {stores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => handleStoreSwitch(store)}
            className="gap-2 cursor-pointer"
          >
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="h-5 w-5 rounded object-cover"
              />
            ) : (
              <div
                className="h-5 w-5 rounded flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: store.primary_color || '#6366f1' }}
              >
                {store.name.charAt(0)}
              </div>
            )}
            <span className="flex-1 truncate">{store.name}</span>
            {store.slug === currentStoreSlug && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        
        {isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                // Navigate to stores management (without store prefix as it's OWNER-level)
                navigate(`/${currentStoreSlug}/admin/stores`);
                setOpen(false);
              }}
              className="gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Manage Stores</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
