import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, CheckCircle2, DollarSign, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductRevenueData {
  product_name: string;
  ads_spent_usd: number;
  target_revenue: number;
  actual_revenue: number;
  achievement_percent: number;
}

interface ProductTargetProgressProps {
  products: ProductRevenueData[];
  periodLabel: string;
  isToday: boolean;
}

export function ProductTargetProgress({ products, periodLabel, isToday }: ProductTargetProgressProps) {
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => b.achievement_percent - a.achievement_percent);
  }, [products]);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-emerald-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getProgressBgColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-emerald-500/20';
    if (percentage >= 50) return 'bg-amber-500/20';
    return 'bg-red-500/20';
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-NP', { maximumFractionDigits: 0 })}`;
  };

  const title = isToday 
    ? "Today's Revenue Target Progress" 
    : `Revenue Target Progress (${periodLabel})`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Target = Ads Spend (USD) × 60% × 1000
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Ads ($)</TableHead>
                <TableHead className="text-right">Target Revenue</TableHead>
                <TableHead className="text-right">Actual Revenue</TableHead>
                <TableHead className="text-right">Achievement</TableHead>
                <TableHead className="w-[180px]">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {isToday ? 'No ad spend recorded for today' : 'No ad spend in this period'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedProducts.map((product) => (
                  <TableRow key={product.product_name}>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-muted-foreground">${product.ads_spent_usd.toFixed(2)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-blue-600 font-medium">{formatCurrency(product.target_revenue)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-medium",
                        product.actual_revenue >= product.target_revenue ? "text-emerald-600" : "text-foreground"
                      )}>
                        {formatCurrency(product.actual_revenue)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {product.achievement_percent >= 100 && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'min-w-[60px] justify-center',
                            product.achievement_percent >= 100 
                              ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' 
                              : product.achievement_percent >= 50 
                                ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                                : 'bg-red-500/15 text-red-600 border-red-500/30'
                          )}
                        >
                          {Math.min(product.achievement_percent, 100)}%
                          {product.achievement_percent > 100 && (
                            <span className="ml-1 text-[10px]">+{product.achievement_percent - 100}</span>
                          )}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn('flex-1 h-2 rounded-full overflow-hidden', getProgressBgColor(product.achievement_percent))}>
                          <div 
                            className={cn('h-full rounded-full transition-all duration-500', getProgressColor(product.achievement_percent))}
                            style={{ width: `${Math.min(product.achievement_percent, 100)}%` }}
                          />
                        </div>
                        {product.achievement_percent >= 100 && (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
