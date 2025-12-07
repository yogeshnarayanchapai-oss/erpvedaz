import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductData {
  name: string;
  target: number;
  sales: number;
  revenue: number;
}

interface ProductTargetProgressProps {
  products: ProductData[];
  periodLabel: string;
  isToday: boolean;
}

export function ProductTargetProgress({ products, periodLabel, isToday }: ProductTargetProgressProps) {
  const sortedProducts = useMemo(() => {
    return [...products]
      .map(p => ({
        ...p,
        percentage: p.target > 0 ? Math.round((p.sales / p.target) * 100) : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
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

  const title = isToday 
    ? "Today's Product Target Progress" 
    : `Product Target Progress (${periodLabel})`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Daily Target</TableHead>
                <TableHead className="text-right">Confirmed</TableHead>
                <TableHead className="text-right">Achievement</TableHead>
                <TableHead className="w-[200px]">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {isToday ? 'No products with ad spend targets set for today' : 'No products with targets in this period'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedProducts.map((product) => (
                  <TableRow key={product.name}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">{product.target}</TableCell>
                    <TableCell className="text-right">{product.sales}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {product.percentage >= 100 && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'min-w-[60px] justify-center',
                            product.percentage >= 100 
                              ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' 
                              : product.percentage >= 50 
                                ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                                : 'bg-red-500/15 text-red-600 border-red-500/30'
                          )}
                        >
                          {Math.min(product.percentage, 100)}%
                          {product.percentage > 100 && (
                            <span className="ml-1 text-[10px]">+{product.percentage - 100}</span>
                          )}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn('flex-1 h-2 rounded-full overflow-hidden', getProgressBgColor(product.percentage))}>
                          <div 
                            className={cn('h-full rounded-full transition-all duration-500', getProgressColor(product.percentage))}
                            style={{ width: `${Math.min(product.percentage, 100)}%` }}
                          />
                        </div>
                        {product.percentage >= 100 && (
                          <span className="text-xs text-emerald-600 font-medium whitespace-nowrap">
                            Target Hit!
                          </span>
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
