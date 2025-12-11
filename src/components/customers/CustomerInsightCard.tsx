import { User, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  if (!insight?.exists) {
    return (
      <Card className="p-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 border-dashed">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            New Customer
          </span>
          <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30 border-green-300">
            First Order
          </Badge>
        </div>
      </Card>
    );
  }

  const isHighRisk = (insight.rto_count || 0) > 0 && insight.rating && insight.rating <= 2;

  return (
    <Card className={`p-3 border-dashed ${
      isHighRisk 
        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' 
        : insight.is_different_store
          ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
          : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
    }`}>
      <div className="space-y-1.5">
        {/* Risk badge if applicable */}
        {isHighRisk && (
          <Badge variant="destructive" className="text-xs mb-1">
            <AlertTriangle className="h-3 w-3 mr-1" />
            High RTO Risk
          </Badge>
        )}

        {/* Line 1: Customer Name, Product (Price) */}
        <div className="text-sm">
          <span className="text-muted-foreground">Customer Name: </span>
          <span className="font-medium text-foreground">{insight.name || 'Unknown'}</span>
          {insight.last_product_name && (
            <>
              <span className="text-muted-foreground">, Product: </span>
              <span className="font-medium text-foreground">
                {insight.last_product_name}
                {insight.last_product_price && (
                  <span className="text-muted-foreground"> (Rs {insight.last_product_price.toLocaleString()})</span>
                )}
              </span>
            </>
          )}
        </div>

        {/* Line 2: Store, Handled by, Last Order */}
        <div className="text-sm flex flex-wrap items-center gap-x-1">
          <span className="text-muted-foreground">Store:</span>
          <span className="font-medium text-foreground">{insight.store_name || 'Unknown'}</span>
          {insight.handled_by_name && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">Handled by:</span>
              <span className="font-medium text-foreground">{insight.handled_by_name}</span>
            </>
          )}
          {insight.last_order_ago_label && (
            <>
              <span className="text-muted-foreground ml-1">
                <Clock className="h-3 w-3 inline mr-0.5" />
                Last Order:
              </span>
              <span className="font-medium text-foreground">{insight.last_order_ago_label}</span>
            </>
          )}
        </div>

        {/* Line 3: Orders stats (compact) */}
        <div className="text-xs text-muted-foreground">
          Orders: {insight.total_orders || 0}
          {(insight.delivered_count || 0) > 0 && (
            <span className="text-green-600 ml-1">({insight.delivered_count} delivered)</span>
          )}
          {(insight.rto_count || 0) > 0 && (
            <span className="text-red-600 ml-1">• RTO: {insight.rto_count}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
