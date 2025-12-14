import { useState } from 'react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useStockMovements } from '@/hooks/useStockMovements';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useProducts } from '@/hooks/useProducts';
import { Package, ArrowDownCircle, ArrowUpCircle, Search, History } from 'lucide-react';
import DateQuickFilters, { DateRange, getPresetRanges } from '@/components/inventory/DateQuickFilters';
import { Outlet } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';

// Valid DB types for filtering
const DB_MOVEMENT_TYPES = ['IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'RTO_IN', 'RTO_OUT'] as const;
type DBMovementType = typeof DB_MOVEMENT_TYPES[number];

// Display types (including any additional types that may exist in data)
const DISPLAY_MOVEMENT_TYPES = ['IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'RTO_IN', 'RTO_OUT'] as const;

function getTypeColor(type: string) {
  switch (type) {
    case 'IN':
    case 'TRANSFER_IN':
    case 'RTO_IN':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'OUT':
    case 'TRANSFER_OUT':
    case 'RTO_OUT':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'ADJUSTMENT':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getTypeLabel(movement: any) {
  if (movement.movement_type === 'OUT' && movement.movement_source === 'WHOLESALE') {
    return 'Wholesale OUT';
  }
  return movement.movement_type?.replace('_', ' ') || '-';
}

export default function InventoryActivityLog() {
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetRanges()[1].getRange()); // Last 7 Days
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: movements = [], isLoading } = useStockMovements({
    warehouseId: warehouseFilter !== 'all' ? warehouseFilter : undefined,
    productId: productFilter !== 'all' ? productFilter : undefined,
    movementType: typeFilter !== 'all' ? typeFilter as DBMovementType : undefined,
    startDate: dateRange.startDate || undefined,
    endDate: dateRange.endDate || undefined,
  });

  const { data: warehouses = [] } = useWarehouses();
  const { data: products = [] } = useProducts();

  // Filter by search query
  const filteredMovements = movements.filter(m => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.products?.name?.toLowerCase().includes(query) ||
      m.warehouses?.name?.toLowerCase().includes(query) ||
      m.remark?.toLowerCase().includes(query) ||
      m.movement_source?.toLowerCase().includes(query)
    );
  });

  const clearFilters = () => {
    setDateRange(getPresetRanges()[1].getRange());
    setWarehouseFilter('all');
    setProductFilter('all');
    setTypeFilter('all');
    setSearchQuery('');
  };

  // Calculate summary stats - include all stock movements
  const totalIn = filteredMovements.filter(m => ['IN', 'TRANSFER_IN', 'RTO_IN'].includes(m.movement_type)).reduce((sum, m) => sum + (m.qty || 0), 0);
  const totalOut = filteredMovements.filter(m => ['OUT', 'TRANSFER_OUT', 'RTO_OUT'].includes(m.movement_type)).reduce((sum, m) => sum + (m.qty || 0), 0);
  const totalAdjustments = filteredMovements.filter(m => m.movement_type === 'ADJUSTMENT').reduce((sum, m) => sum + (m.qty || 0), 0);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6" />
              Inventory Activity Log
            </h1>
            <p className="text-muted-foreground">View-only log of all stock movements</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                  <ArrowDownCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Stock In</p>
                  <p className="text-2xl font-bold text-green-600">{totalIn}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                  <ArrowUpCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Stock Out</p>
                  <p className="text-2xl font-bold text-red-600">{totalOut}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900">
                  <ArrowLeftRight className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Adjustments</p>
                  <p className="text-2xl font-bold text-yellow-600">{totalAdjustments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                  <p className="text-2xl font-bold">{filteredMovements.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DateQuickFilters value={dateRange} onChange={setDateRange} />
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses.map(wh => (
                    <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {DB_MOVEMENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={clearFilters}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Clear Filters
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Activity Log Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Read-only record of all stock movements</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredMovements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No movements found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap">
                          {m.movement_date ? format(new Date(m.movement_date), 'dd MMM yyyy') : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{m.products?.name || '-'}</TableCell>
                        <TableCell>{m.warehouses?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(m.movement_type)}>
                            {getTypeLabel(m)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{m.qty}</TableCell>
                        <TableCell className="text-right">
                          {m.unit_cost ? `₹${m.unit_cost.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.unit_price ? `₹${m.unit_price.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {m.total_value ? `₹${m.total_value.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {m.movement_source || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={m.remark || ''}>
                          {m.remark || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Outlet />
    </>
  );
}
