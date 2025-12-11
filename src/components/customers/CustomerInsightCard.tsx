import { User, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerInsight } from '@/hooks/useCustomerInsight';

interface CustomerInsightCardProps {
  insight: CustomerInsight | undefined;
  isLoading: boolean;
  phone: string;
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

  // Check if customer has RTO or cancelled orders - Red
  const hasRtoOrCancel = (insight.rto_count || 0) > 0;

  // Card color: Red for RTO/Cancel, Yellow for existing
  const cardClass = hasRtoOrCancel
    ? 'p-3 bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-700'
    : 'p-3 bg-yellow-100 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-700';

  const iconClass = hasRtoOrCancel ? 'text-red-600' : 'text-yellow-600';
  const textClass = hasRtoOrCancel 
    ? 'text-red-800 dark:text-red-300' 
    : 'text-yellow-800 dark:text-yellow-300';

  return (
    <Card className={cardClass}>
      <div className="flex items-start gap-2">
        {hasRtoOrCancel ? (
          <AlertTriangle className={`h-4 w-4 mt-0.5 ${iconClass}`} />
        ) : (
          <User className={`h-4 w-4 mt-0.5 ${iconClass}`} />
        )}
        <div className="flex-1 space-y-0.5">
          {/* Line 1: Customer Name, Product (Price) */}
          <div className={`text-sm ${textClass}`}>
            <span className="font-semibold">{insight.name || 'Unknown'}</span>
            {insight.last_product_name && (
              <>
                <span className="mx-1">•</span>
                <span>{insight.last_product_name}</span>
                {insight.last_product_price && (
                  <span className="opacity-80"> (Rs {insight.last_product_price.toLocaleString()})</span>
                )}
              </>
            )}
          </div>

          {/* Line 2: Store, Handled by, Last Order */}
          <div className={`text-xs flex flex-wrap items-center gap-x-1.5 ${textClass} opacity-90`}>
            {insight.store_name && (
              <span>Store: <span className="font-medium">{insight.store_name}</span></span>
            )}
            {insight.handled_by_name && (
              <>
                <span>•</span>
                <span>Handled by: <span className="font-medium">{insight.handled_by_name}</span></span>
              </>
            )}
            {insight.last_order_ago_label && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {insight.last_order_ago_label}
                </span>
              </>
            )}
            {hasRtoOrCancel && (
              <>
                <span>•</span>
                <span className="font-semibold text-red-700 dark:text-red-400">
                  RTO/Cancel: {insight.rto_count}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
