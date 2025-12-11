import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, User, AlertTriangle, Package, Star } from 'lucide-react';
import { useCustomerInsight } from '@/hooks/useCustomerInsight';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';

interface DuplicateBadgeProps {
  phone: string;
  isDuplicate?: boolean;
}

export function DuplicateBadge({ phone, isDuplicate }: DuplicateBadgeProps) {
  const [open, setOpen] = useState(false);
  const { currentStore } = useCurrentStore();
  const { data: insight, isLoading } = useCustomerInsight(phone, currentStore?.id, open);

  if (!isDuplicate) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge 
          variant="destructive" 
          className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-destructive/80"
        >
          DOUBLE
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : insight?.exists ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-sm">Duplicate Customer Found</span>
            </div>
            
            {/* Store & Staff Info */}
            <div className="bg-muted/50 rounded p-2 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <Store className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Store:</span>
                <span className="font-medium">{insight.store_name || 'Unknown'}</span>
                {insight.is_different_store && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                    Other Store
                  </Badge>
                )}
              </div>
              {insight.handled_by_name && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Handled by:</span>
                  <span className="font-medium">{insight.handled_by_name}</span>
                </div>
              )}
            </div>

            {/* Customer Stats */}
            <div className="space-y-1.5 text-xs">
              {insight.name && (
                <div className="font-medium">{insight.name}</div>
              )}
              <div className="flex flex-wrap gap-2 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span>Orders: {insight.total_orders || 0}</span>
                </div>
                {(insight.rto_count || 0) > 0 && (
                  <div className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    <span>RTO: {insight.rto_count}</span>
                  </div>
                )}
                {insight.rating && (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= insight.rating!
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-muted text-muted'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              {insight.last_order_ago_label && (
                <div className="text-muted-foreground">{insight.last_order_ago_label}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No customer record found for this phone number.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
