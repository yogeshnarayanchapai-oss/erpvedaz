import { useState } from 'react';
import { useStores } from '@/hooks/useStores';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useAiStockReorder } from '@/hooks/useAiStockReorder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Search, TrendingUp, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AIStockReorder = () => {
  const { data: stores = [] } = useStores();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [lookbackDays] = useState(30);

  const { data: warehouses } = useWarehouses();
  const {
    data: reorderData,
    isLoading,
    error,
    refetch,
  } = useAiStockReorder({
    storeId: selectedStoreId || undefined,
    warehouseId: selectedWarehouse === 'all' ? undefined : selectedWarehouse,
    lookbackDays,
  });

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'URGENT':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Urgent</Badge>;
      case 'LOW':
        return <Badge variant="secondary" className="gap-1"><TrendingUp className="w-3 h-3" />Low Stock</Badge>;
      case 'OK':
        return <Badge variant="outline" className="gap-1"><CheckCircle className="w-3 h-3" />OK</Badge>;
      case 'OVERSTOCKED':
        return <Badge variant="default" className="gap-1"><Package className="w-3 h-3" />Overstocked</Badge>;
      default:
        return <Badge variant="outline">{urgency}</Badge>;
    }
  };

  const filteredResults = reorderData?.results?.filter(item => {
    const matchesSearch = 
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            AI Inventory Reorder Assistant
          </h1>
          <p className="text-muted-foreground mt-1">
            Smart reorder suggestions based on sales velocity and stock levels
          </p>
        </div>
        <Button onClick={() => refetch()} disabled={isLoading}>
          <Brain className="w-4 h-4 mr-2" />
          {isLoading ? 'Analyzing...' : 'Run AI Analysis'}
        </Button>
      </div>

      {/* Summary Cards */}
      {reorderData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reorderData.summary.total_products}</div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Urgent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{reorderData.summary.urgent}</div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">Low Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{reorderData.summary.low}</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">OK</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{reorderData.summary.ok}</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Overstocked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{reorderData.summary.overstocked}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select store, warehouse, and search products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses?.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {!isLoading && filteredResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reorder Suggestions</CardTitle>
            <CardDescription>
              AI-powered recommendations based on last {reorderData?.summary?.lookback_days || 30} days of sales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Avg Daily Sales</TableHead>
                  <TableHead className="text-right">Days of Cover</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Suggested Reorder</TableHead>
                  <TableHead>AI Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((item) => (
                  <TableRow key={`${item.product_id}_${item.warehouse_id}`}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>{item.warehouse_name}</TableCell>
                    <TableCell className="text-right">{item.current_stock}</TableCell>
                    <TableCell className="text-right">{item.avg_daily_sales.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <span className={item.days_of_cover < 7 ? 'text-red-600 font-semibold' : ''}>
                        {item.days_of_cover > 999 ? '∞' : item.days_of_cover.toFixed(0)}
                      </span>
                    </TableCell>
                    <TableCell>{getUrgencyBadge(item.urgency)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.suggested_reorder_qty > 0 ? item.suggested_reorder_qty : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-xs">{item.short_note}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredResults.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? 'Try adjusting your search filters'
                  : 'Click "Run AI Analysis" to generate reorder suggestions'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIStockReorder;
