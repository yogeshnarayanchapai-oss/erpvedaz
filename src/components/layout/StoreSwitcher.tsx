import { useState } from 'react';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Store, ChevronDown, Plus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export function StoreSwitcher() {
  const { currentStore, availableStores, isLoading, setCurrentStore, canSwitchStores } = useCurrentStore();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isOwner = profile?.role === 'OWNER';

  if (isLoading) {
    return <Skeleton className="h-9 w-32" />;
  }

  if (!currentStore) {
    if (isOwner) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/stores')}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Store
        </Button>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-sm">
        <Store className="h-4 w-4" />
        No Store Assigned
      </div>
    );
  }

  // Non-switchable users: just show current store
  if (!canSwitchStores || availableStores.length <= 1) {
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
            style={{ backgroundColor: currentStore.primary_color }}
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
                style={{ backgroundColor: currentStore.primary_color }}
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
        {availableStores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => {
              setCurrentStore(store.id);
              setOpen(false);
            }}
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
                style={{ backgroundColor: store.primary_color }}
              >
                {store.name.charAt(0)}
              </div>
            )}
            <span className="flex-1 truncate">{store.name}</span>
            {store.id === currentStore.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        
        {isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                navigate('/admin/stores');
                setOpen(false);
              }}
              className="gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Store</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
