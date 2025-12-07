import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Boxes, DollarSign, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useInventorySummaryByWarehouse } from '@/hooks/useInventorySummaryByWarehouse';
import { useActiveWarehouses } from '@/hooks/useWarehouses';
import DateQuickFilters, { DateRange, getPresetRanges } from '@/components/inventory/DateQuickFilters';
import { format } from 'date-fns';

export default function StockSummary() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [reorderOnly, setReorderOnly] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    endDate: today,
    label: 'This Month',
  });

  const { data: warehouses } = useActiveWarehouses();
  const { data: inventoryData, isLoading } = useInventorySummaryByWarehouse(
    activeTab,
    dateRange.startDate,
    dateRange.endDate
  );

  const formatCurrency = (val: number) => `Rs ${val.toLocaleString()}`;

  // Filter items by search and reorder
  const filteredItems =
    inventoryData?.items.filter((item) => {
      const matchesSearch = item.product_name.toLowerCase().includes(search.toLowerCase());
      const matchesReorder = !reorderOnly || item.reorder_required;
      return matchesSearch && matchesReorder;
    }) || [];

  // Recalculate totals for filtered items
  const displayTotals = filteredItems.reduce(
    (acc, item) => ({
      totalProducts: acc.totalProducts + 1,
      totalStock: acc.totalStock + item.current_stock,
      totalValue: acc.totalValue + item.stock_value,
      totalIn: acc.totalIn + item.total_in,
      totalOut: acc.totalOut + item.total_out,
      reorderCount: acc.reorderCount + (item.reorder_required ? 1 : 0),
    }),
    { totalProducts: 0, totalStock: 0, totalValue: 0, totalIn: 0, totalOut: 0, reorderCount: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock Summary</h1>
          <p className="text-muted-foreground">View inventory across all warehouses</p>
        </div>
        <DateQuickFilters value={dateRange} onChange={setDateRange} />
      </div>

      {/* Warehouse Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Warehouses</TabsTrigger>
          {warehouses?.map((w) => (
            <TabsTrigger key={w.id} value={w.id}>
              {w.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayTotals.totalProducts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
                <Boxes className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displayTotals.totalStock.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total In</CardTitle>
                <ArrowDownToLine className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{displayTotals.totalIn.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Out</CardTitle>
                <ArrowUpFromLine className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{displayTotals.totalOut.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(displayTotals.totalValue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reorder Alert</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{displayTotals.reorderCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search by product name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="reorder"
                    checked={reorderOnly}
                    onCheckedChange={(c) => setReorderOnly(c === true)}
                  />
                  <label htmlFor="reorder" className="text-sm">
                    Reorder Required Only
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Inventory {activeTab !== 'all' && `- ${warehouses?.find((w) => w.id === activeTab)?.name}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : !filteredItems.length ? (
                <p className="text-muted-foreground">No inventory records found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      {activeTab === 'all' && <TableHead>Warehouse</TableHead>}
                      <TableHead className="text-right">Opening</TableHead>
                      <TableHead className="text-right text-green-600">In</TableHead>
                      <TableHead className="text-right text-red-600">Out</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Reorder Level</TableHead>
                      <TableHead>Reorder?</TableHead>
                      <TableHead className="text-right">Stock Value</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Drawer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((inv, idx) => (
                      <TableRow
                        key={`${inv.product_id}_${inv.warehouse_id}_${idx}`}
                        className={inv.reorder_required ? 'bg-destructive/10' : ''}
                      >
                        <TableCell className="font-medium">{inv.product_name}</TableCell>
                        {activeTab === 'all' && <TableCell>{inv.warehouse_name}</TableCell>}
                        <TableCell className="text-right">{inv.opening_stock}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          +{inv.total_in}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          -{inv.total_out}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{inv.current_stock}</TableCell>
                        <TableCell className="text-right">{inv.reorder_level}</TableCell>
                        <TableCell>
                          {inv.reorder_required ? (
                            <Badge variant="destructive">Yes</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.stock_value)}</TableCell>
                        <TableCell>{inv.last_movement_date || '-'}</TableCell>
                        <TableCell>{inv.drawer_number || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
