import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Trash2, ShoppingBag, TrendingUp, Package } from 'lucide-react';
import { useStockMovements, useCreateStockMovement, useDeleteStockMovement } from '@/hooks/useStockMovements';
import { useActiveWarehouses } from '@/hooks/useWarehouses';
import { useProducts } from '@/hooks/useProducts';
import { useParties } from '@/hooks/useParties';
import { useProductDaybookStats, DeliveryLocationFilter } from '@/hooks/useProductDaybookStats';
import { format, subDays } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import DateQuickFilters, { DateRange } from '@/components/inventory/DateQuickFilters';

const MOVEMENT_TYPES = ['IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'RTO_IN', 'RTO_OUT'] as const;

const getTypeColor = (type: string) => {
  switch (type) {
    case 'IN': return 'bg-green-500';
    case 'OUT': return 'bg-red-500';
    case 'TRANSFER_IN': return 'bg-blue-500';
    case 'TRANSFER_OUT': return 'bg-orange-500';
    case 'ADJUSTMENT': return 'bg-yellow-500';
    case 'RTO_IN': return 'bg-cyan-500';
    case 'RTO_OUT': return 'bg-pink-500';
    default: return 'bg-gray-500';
  }
};

const getTypeLabel = (movement: any) => {
  if (movement.movement_type === 'OUT' && movement.sale_category === 'WHOLESALE') {
    return 'WHOLESALE';
  }
  return movement.movement_type;
};

export default function StockMovements() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
    endDate: today,
    label: 'Last 7 Days',
  });
  const [filters, setFilters] = useState({ warehouseId: 'all', productId: 'all', movementType: 'all' as any });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{
    product_id: string;
    warehouse_id: string;
    movement_date: string;
    movement_type: typeof MOVEMENT_TYPES[number];
    source: string;
    reference_type: string;
    reference_id: string;
    qty: number;
    unit_cost: number;
    unit_price: number;
    remark: string;
    movement_reason?: string;
    is_sale?: boolean;
    sale_category?: string;
    party_id?: string;
    movement_source?: string;
    reference_order_count: number;
  }>({
    product_id: '',
    warehouse_id: '',
    movement_date: format(new Date(), 'yyyy-MM-dd'),
    movement_type: 'IN',
    source: '',
    reference_type: '',
    reference_id: '',
    qty: 0,
    unit_cost: 0,
    unit_price: 0,
    remark: '',
    reference_order_count: 0,
  });

  const { data: movements, isLoading } = useStockMovements({
    startDate: dateRange.startDate || undefined,
    endDate: dateRange.endDate || undefined,
    warehouseId: filters.warehouseId,
    productId: filters.productId,
    movementType: filters.movementType !== 'all' ? filters.movementType : undefined,
  });
  const { data: warehouses } = useActiveWarehouses();
  const { data: products } = useProducts();
  const { data: suppliers } = useParties('SUPPLIER');
  const { data: customers } = useParties('CUSTOMER');
  const createMovement = useCreateStockMovement();
  const deleteMovement = useDeleteStockMovement();

  // Determine delivery location based on selected warehouse name
  const selectedWarehouse = warehouses?.find(w => w.id === form.warehouse_id);
  const warehouseName = selectedWarehouse?.name?.toLowerCase() || '';
  const deliveryLocationFilter: DeliveryLocationFilter = 
    warehouseName.includes('office') ? 'OUTSIDE_VALLEY' :
    warehouseName.includes('valley') ? 'INSIDE_VALLEY' : 'all';

  const { data: daybookStats, isLoading: statsLoading } = useProductDaybookStats(
    form.product_id || undefined, 
    form.movement_date || undefined,
    deliveryLocationFilter
  );

  // Auto-fill qty, unit_price, and reference_order_count from Product Daybook stats when product/date/warehouse changes
  useEffect(() => {
    if (daybookStats && daybookStats.totalQty > 0 && dialogOpen) {
      setForm(f => ({
        ...f,
        qty: daybookStats.totalQty,
        unit_price: daybookStats.avgPrice,
        reference_order_count: daybookStats.orderCount,
      }));
    }
  }, [daybookStats, dialogOpen]);

  const resetForm = () => {
    setForm({
      product_id: '',
      warehouse_id: '',
      movement_date: format(new Date(), 'yyyy-MM-dd'),
      movement_type: 'IN',
      source: '',
      reference_type: '',
      reference_id: '',
      qty: 0,
      unit_cost: 0,
      unit_price: 0,
      remark: '',
      reference_order_count: 0,
    });
  };

  // Auto-fill unit cost & price when product changes
  const handleProductChange = (productId: string) => {
    const selectedProduct = products?.find(p => p.id === productId);
    const costPrice = selectedProduct?.cost_price || 0;
    const sellPrice = selectedProduct?.sell_price || 0;
    
    // Different price defaults based on movement type
    if (form.movement_type === 'IN') {
      setForm(f => ({ ...f, product_id: productId, unit_cost: costPrice, unit_price: 0 }));
    } else if (form.movement_type === 'OUT') {
      setForm(f => ({ ...f, product_id: productId, unit_cost: costPrice, unit_price: sellPrice }));
    } else {
      setForm(f => ({ ...f, product_id: productId, unit_cost: costPrice, unit_price: sellPrice }));
    }
  };

  // Re-apply prices when movement type changes
  const handleTypeChange = (type: typeof MOVEMENT_TYPES[number]) => {
    const selectedProduct = products?.find(p => p.id === form.product_id);
    const costPrice = selectedProduct?.cost_price || 0;
    const sellPrice = selectedProduct?.sell_price || 0;
    
    if (type === 'IN') {
      setForm(f => ({ ...f, movement_type: type, unit_cost: costPrice, unit_price: 0 }));
    } else if (type === 'OUT') {
      setForm(f => ({ ...f, movement_type: type, unit_cost: costPrice, unit_price: sellPrice }));
    } else {
      setForm(f => ({ ...f, movement_type: type }));
    }
  };

  // Computed totals
  const computedTotalCost = form.qty * form.unit_cost;
  const computedTotalValue = form.qty * form.unit_price;

  const handleSubmit = async () => {
    if (!form.product_id || !form.warehouse_id || form.qty <= 0) return;
    
    // Check if this is a wholesale sale
    const isWholesale = form.movement_type === 'OUT' && form.sale_category === 'WHOLESALE';
    
    const movementData: any = {
      ...form,
      movement_reason: isWholesale ? 'WHOLESALE' : (form.movement_reason || null),
      is_sale: isWholesale ? true : (form.is_sale || null),
      sale_category: isWholesale ? 'WHOLESALE' : (form.sale_category || null),
    };
    
    await createMovement.mutateAsync(movementData);
    setDialogOpen(false);
    resetForm();
  };

  const quickAdd = (type: typeof MOVEMENT_TYPES[number], isWholesale = false) => {
    const selectedProduct = products?.find(p => p.id === form.product_id);
    const costPrice = selectedProduct?.cost_price || 0;
    const wholesalePrice = selectedProduct?.wholesale_price || 0;
    
    // Find Office Warehouse for wholesale
    const officeWarehouse = warehouses?.find(w => w.name.toLowerCase().includes('office'));
    
    resetForm();
    
    if (isWholesale && officeWarehouse) {
      // Wholesale sale: OUT + WHOLESALE reason + sale_category
      setForm((f) => ({ 
        ...f, 
        movement_type: 'OUT',
        warehouse_id: officeWarehouse.id,
        unit_cost: costPrice,
        unit_price: wholesalePrice,
        movement_reason: 'WHOLESALE',
        is_sale: true,
        sale_category: 'WHOLESALE',
      }));
    } else {
      setForm((f) => ({ ...f, movement_type: type }));
    }
    setDialogOpen(true);
  };

  const clearFilters = () => {
    setFilters({ warehouseId: 'all', productId: 'all', movementType: 'all' });
    setDateRange({ startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'), endDate: today, label: 'Last 7 Days' });
  };

  const formatCurrency = (val: number | null) => val ? `Rs ${val.toLocaleString()}` : '-';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock Movements</h1>
          <p className="text-muted-foreground">Track all inventory IN/OUT transactions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => quickAdd('IN')} className="text-green-600">
            <ArrowDownToLine className="h-4 w-4 mr-1" />Purchase IN
          </Button>
          <Button variant="outline" onClick={() => quickAdd('OUT', false)} className="text-red-600">
            <ArrowUpFromLine className="h-4 w-4 mr-1" />Sale OUT (Retail)
          </Button>
          <Button variant="outline" onClick={() => quickAdd('OUT', true)} className="text-purple-600">
            <ShoppingBag className="h-4 w-4 mr-1" />Wholesale OUT
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Movement</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Stock Movement</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Product *</Label>
                    <Select value={form.product_id} onValueChange={handleProductChange}>
                      <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Warehouse *</Label>
                    <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                      <SelectContent>
                        {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input type="date" value={form.movement_date} onChange={(e) => setForm({ ...form, movement_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select value={form.movement_type} onValueChange={handleTypeChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MOVEMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Party Selection - shown for IN and OUT movements */}
                {(form.movement_type === 'IN' || form.movement_type === 'OUT') && (
                  <div className="space-y-2">
                    <Label>
                      {form.movement_type === 'IN' ? 'Supplier (Optional)' : 'Customer (Optional)'}
                    </Label>
                    <Select 
                      value={form.party_id || ''} 
                      onValueChange={(v) => setForm({ 
                        ...form, 
                        party_id: v || undefined,
                        movement_source: form.movement_type === 'IN' ? 'SUPPLIER' : 'CUSTOMER'
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={form.movement_type === 'IN' ? 'Select supplier' : 'Select customer'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(form.movement_type === 'IN' ? suppliers : customers)?.map((party) => (
                          <SelectItem key={party.id} value={party.id}>
                            {party.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Product Daybook Reference Stats */}
                {form.product_id && form.movement_date && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                        Product Daybook Reference - {deliveryLocationFilter === 'OUTSIDE_VALLEY' ? 'OVD (Outside Valley)' : deliveryLocationFilter === 'INSIDE_VALLEY' ? 'VD (Inside Valley)' : 'All'} ({form.movement_date})
                      </span>
                    </div>
                    {!form.warehouse_id ? (
                      <p className="text-sm text-muted-foreground">Select a warehouse to see reference data.</p>
                    ) : statsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : daybookStats && daybookStats.totalQty > 0 ? (
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Orders:</span>
                          <span className="ml-1 font-medium">{daybookStats.orderCount}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Qty Sold:</span>
                          <span className="ml-1 font-medium text-green-600">{daybookStats.totalQty}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Sales:</span>
                          <span className="ml-1 font-medium">Rs {daybookStats.totalSales.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Price:</span>
                          <span className="ml-1 font-medium">Rs {daybookStats.avgPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No {deliveryLocationFilter === 'OUTSIDE_VALLEY' ? 'OVD' : deliveryLocationFilter === 'INSIDE_VALLEY' ? 'VD' : ''} orders for this product on selected date.</p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input type="number" min={0} value={form.qty} onChange={(e) => setForm({ ...form, qty: +e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Cost</Label>
                    <Input type="number" min={0} value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: +e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price</Label>
                    <Input type="number" min={0} value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: +e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ref. Order</Label>
                    <Input type="number" min={0} value={form.reference_order_count} onChange={(e) => setForm({ ...form, reference_order_count: +e.target.value })} />
                  </div>
                </div>
                {/* Display computed totals */}
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-3 rounded-md">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-medium">Rs {computedTotalCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Value:</span>
                    <span className="font-medium">Rs {computedTotalValue.toLocaleString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. Valley Delivery" />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference Type</Label>
                    <Input value={form.reference_type} onChange={(e) => setForm({ ...form, reference_type: e.target.value })} placeholder="e.g. Order, Purchase" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Remark</Label>
                  <Textarea value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!form.product_id || !form.warehouse_id || form.qty <= 0}>Save</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Date Quick Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <DateQuickFilters value={dateRange} onChange={setDateRange} />
      </div>

      {/* Additional Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={filters.warehouseId} onValueChange={(v) => setFilters({ ...filters, warehouseId: v })}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={filters.productId} onValueChange={(v) => setFilters({ ...filters, productId: v })}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {products?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filters.movementType} onValueChange={(v) => setFilters({ ...filters, movementType: v })}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {MOVEMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" onClick={clearFilters}>
              <RefreshCw className="h-4 w-4 mr-1" />Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Movements ({dateRange.label})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !movements?.length ? (
            <p className="text-muted-foreground">No movements found.</p>
          ) : (
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
                  <TableHead className="text-right">Ref. Order</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.movement_date}</TableCell>
                    <TableCell className="font-medium">{m.products?.name || '-'}</TableCell>
                    <TableCell>{m.warehouses?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={m.sale_category === 'WHOLESALE' ? 'bg-purple-500' : getTypeColor(m.movement_type)}>
                        {getTypeLabel(m)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{m.qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.unit_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.unit_price)}</TableCell>
                    <TableCell className="text-right">{m.reference_order_count || 0}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.total_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.total_value)}</TableCell>
                    <TableCell>{m.source || m.remark || '-'}</TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Movement?</AlertDialogTitle>
                            <AlertDialogDescription>This will also update the inventory. This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMovement.mutate(m.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
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
