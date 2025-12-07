import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Package, DollarSign, AlertTriangle, TrendingUp, ExternalLink } from 'lucide-react';
import { useWarehouseById, useWarehouseStats, useWarehouseInventory, useWarehouseMovements } from '@/hooks/useWarehouseDetail';
import DateQuickFilters, { DateRange } from '@/components/inventory/DateQuickFilters';
import { format, subDays } from 'date-fns';

export default function WarehouseDetail() {
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: thirtyDaysAgo,
    endDate: today,
    label: 'Last 30 Days',
  });

  const { data: warehouse, isLoading: loadingWarehouse } = useWarehouseById(warehouseId || '');
  const { data: stats, isLoading: loadingStats } = useWarehouseStats(warehouseId || '');
  const { data: inventory, isLoading: loadingInventory } = useWarehouseInventory(
    warehouseId || '',
    dateRange.startDate,
    dateRange.endDate
  );
  const { data: movements, isLoading: loadingMovements } = useWarehouseMovements(
    warehouseId || '',
    dateRange.startDate,
    dateRange.endDate
  );

  const formatCurrency = (val: number) => `Rs ${val.toLocaleString()}`;

  if (loadingWarehouse) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  if (!warehouse) {
    return (
      <div className="p-6">
        <p className="text-destructive">Warehouse not found.</p>
        <Button variant="link" onClick={() => navigate('/admin/inventory/warehouses')}>
          Back to Warehouses
        </Button>
      </div>
    );
  }

  const totalStockValue = inventory?.reduce((sum, item) => sum + item.stock_value, 0) || 0;
  const totalProducts = inventory?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/inventory/warehouses')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{warehouse.name}</h1>
              <Badge variant={warehouse.is_active ? 'default' : 'secondary'}>
                {warehouse.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Code: {warehouse.code} {warehouse.location && `• ${warehouse.location}`}
            </p>
          </div>
        </div>
        <Link to={`/admin/inventory/daily-pl?warehouse=${warehouseId}`}>
          <Button variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            View P/L for this Warehouse
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Current Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCurrentStock?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">units across all products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.stockValue || 0)}</div>
            <p className="text-xs text-muted-foreground">at cost price</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Products</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.lowStockProducts || 0}</div>
            <p className="text-xs text-muted-foreground">at or below reorder level</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Sold (30 Days)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.unitsSoldLast30Days?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">OUT movements</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Summary Section */}
      <Card id="stock-summary">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stock Summary – {warehouse.name}</CardTitle>
          <DateQuickFilters value={dateRange} onChange={setDateRange} />
        </CardHeader>
        <CardContent>
          {loadingInventory ? (
            <p className="text-muted-foreground">Loading inventory...</p>
          ) : !inventory?.length ? (
            <p className="text-muted-foreground">No inventory records found.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">In</TableHead>
                    <TableHead className="text-right">Out</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Reorder Level</TableHead>
                    <TableHead>Reorder Required</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                    <TableHead>Drawer #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow
                      key={item.product_id}
                      className={item.reorder_required ? 'bg-destructive/10' : ''}
                    >
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell className="text-right">{item.opening_stock}</TableCell>
                      <TableCell className="text-right text-green-600">+{item.total_in}</TableCell>
                      <TableCell className="text-right text-destructive">-{item.total_out}</TableCell>
                      <TableCell className="text-right font-semibold">{item.current_stock}</TableCell>
                      <TableCell className="text-right">{item.reorder_level}</TableCell>
                      <TableCell>
                        {item.reorder_required ? (
                          <Badge variant="destructive">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.stock_value)}</TableCell>
                      <TableCell>{item.drawer_number || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end gap-6 text-sm">
                <span className="text-muted-foreground">
                  Total Products: <strong>{totalProducts}</strong>
                </span>
                <span className="text-muted-foreground">
                  Total Stock Value: <strong>{formatCurrency(totalStockValue)}</strong>
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Movements Section */}
      <Card id="movements">
        <CardHeader>
          <CardTitle>Recent Movements – {warehouse.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMovements ? (
            <p className="text-muted-foreground">Loading movements...</p>
          ) : !movements?.length ? (
            <p className="text-muted-foreground">No movements found in selected range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.movement_date}</TableCell>
                    <TableCell>{m.products?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.movement_type.includes('IN')
                            ? 'default'
                            : m.movement_type.includes('OUT')
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {m.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{m.qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.total_cost || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.total_value || 0)}</TableCell>
                    <TableCell>{m.reference || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
