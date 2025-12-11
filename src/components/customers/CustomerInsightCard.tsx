import { User, Clock, Package, Store, Star, ShoppingBag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CustomerInsight } from '@/hooks/useCustomerInsight';
import { formatStatusLabel } from '@/lib/statusColors';
import { formatNPR } from '@/lib/currency';

interface CustomerInsightCardProps {
  insight: CustomerInsight | undefined;
  isLoading: boolean;
  phone: string;
}

// Red statuses - negative/pending types
const RED_STATUSES = ['CANCELLED', 'CALL_NOT_RECEIVED', 'RTO', 'RETURNED', 'CUSTOMER_CANCEL', 'CNR', 'FOLLOW_UP'];

function isRedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return RED_STATUSES.includes(status.toUpperCase());
}

export function CustomerInsightCard({ insight, isLoading, phone }: CustomerInsightCardProps) {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Don't show anything if phone is too short
  if (cleanPhone.length < 10) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="p-3 bg-muted/50 border-dashed">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-48" />
        </div>
      </Card>
    );
  }

  // New Customer - Green
  if (!insight?.exists) {
    return (
      <Card className="p-3 bg-green-100 dark:bg-green-950/40 border-green-300 dark:border-green-700">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold text-green-700 dark:text-green-400">
            New Customer
          </span>
        </div>
      </Card>
    );
  }

  // Determine card color based on order status
  const isRed = isRedStatus(insight.last_order_status);
  const cardBgClass = isRed 
    ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-700'
    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-700';
  const headerTextClass = isRed 
    ? 'text-red-600 dark:text-red-400'
    : 'text-amber-600 dark:text-amber-500';
  const statusBadgeClass = isRed
    ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';

  return (
    <Card className={`p-3 border-dashed ${cardBgClass}`}>
      <div className="space-y-2">
        {/* Header: Existing Customer + Rating */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className={`h-4 w-4 ${headerTextClass}`} />
            <span className={`text-sm font-semibold ${headerTextClass}`}>
              Existing Customer
            </span>
          </div>
          {insight.rating && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= insight.rating!
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-muted text-muted'
                  }`}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">
                ({insight.rating}/5)
              </span>
            </div>
          )}
        </div>

        {/* Product Line */}
        {insight.last_product_name && (
          <div className="flex items-center gap-1.5 text-sm">
            <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Product:</span>
            <span className="font-medium">{insight.last_product_name}</span>
          </div>
        )}

        {/* Store & Handled by Line */}
        <div className="flex items-center gap-1.5 text-sm">
          <Store className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Store:</span>
          <span className="font-medium">{insight.store_name || 'Unknown'}</span>
          {insight.handled_by_name && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Handled by:</span>
              <span className="font-medium">{insight.handled_by_name}</span>
            </>
          )}
        </div>

        {/* Customer Name */}
        <div className="text-sm">
          <span className="text-muted-foreground">Customer Name: </span>
          <span className="font-semibold">{insight.name || 'Unknown'}</span>
        </div>

        {/* Last Order Status + Total */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Last Order Status:</span>
            <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${statusBadgeClass}`}>
              {insight.last_order_status 
                ? formatStatusLabel(insight.last_order_status) 
                : 'N/A'}
            </Badge>
          </div>
          {insight.total_amount && (
            <span className="text-muted-foreground">
              Total: {formatNPR(insight.total_amount)}
            </span>
          )}
        </div>

        {/* Last Order Date */}
        {insight.last_order_ago_label && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Last order: {insight.last_order_ago_label}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
