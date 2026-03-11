import { Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';

export function ActiveStoreBadge() {
  const { currentStore } = useCurrentStore();

  if (!currentStore) return null;

  return (
    <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary border-primary/20">
      <Store className="w-3 h-3" />
      {currentStore.name}
    </Badge>
  );
}
