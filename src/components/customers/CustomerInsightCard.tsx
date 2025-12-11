import { Star, User, Package, Clock, AlertTriangle, Store, ShoppingBag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerInsight } from '@/hooks/useCustomerInsight';

interface CustomerInsightCardProps {
  insight: CustomerInsight | undefined;
  isLoading: boolean;
  phone: string;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-muted text-muted'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">({rating}/5)</span>
    </div>
  );
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
          <Skeleton className="h-4 w-32" />
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
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className={`h-4 w-4 ${
              isHighRisk ? 'text-red-600' : insight.is_different_store ? 'text-orange-600' : 'text-blue-600'
            }`} />
            <span className={`text-sm font-medium ${
              isHighRisk 
                ? 'text-red-700 dark:text-red-400' 
                : insight.is_different_store
                  ? 'text-orange-700 dark:text-orange-400'
                  : 'text-blue-700 dark:text-blue-400'
            }`}>
              Existing Customer
            </span>
            {isHighRisk && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                High RTO Risk
              </Badge>
            )}
          </div>
          {insight.rating && <RatingStars rating={insight.rating} />}
        </div>

        {/* Store, Product & Staff Info - Show for existing customers */}
        {(insight.store_name || insight.handled_by_name || insight.last_product_name) && (
          <div className="flex flex-col gap-1 text-xs bg-background/50 rounded px-2 py-1.5">
            {insight.last_product_name && (
              <div className="flex items-center gap-1">
                <ShoppingBag className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Product: <span className="font-medium text-foreground">{insight.last_product_name}</span>
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Store className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                Store: <span className="font-medium text-foreground">{insight.store_name || 'Unknown'}</span>
                {insight.handled_by_name && (
                  <>
                    {' '}• Handled by: <span className="font-medium text-foreground">{insight.handled_by_name}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Customer Name */}
        {insight.name && (
          <p className="text-sm text-foreground font-medium">{insight.name}</p>
        )}

        {/* Stats */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            <span>Orders: {insight.total_orders || 0}</span>
            {(insight.delivered_count || 0) > 0 && (
              <span className="text-green-600">({insight.delivered_count} delivered)</span>
            )}
          </div>
          
          {(insight.rto_count || 0) > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-3 w-3" />
              <span>RTO: {insight.rto_count}</span>
            </div>
          )}
          
          {(insight.total_amount || 0) > 0 && (
            <div className="flex items-center gap-1">
              <span>Total: Rs. {(insight.total_amount || 0).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Last Order */}
        {insight.last_order_ago_label && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{insight.last_order_ago_label}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
