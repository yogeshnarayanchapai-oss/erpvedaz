import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Trash2, ShoppingBag, TrendingUp, Package, Pencil, Eye, MoreHorizontal, Search, AlertTriangle } from 'lucide-react';
import { LockFilledIcon, UnlockFilledIcon } from '@/components/icons/LockIcons';
import { CompactProductSelect } from '@/components/ui/compact-product-select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useStockMovements, useCreateStockMovement, useDeleteStockMovement, useUpdateStockMovement, StockMovement } from '@/hooks/useStockMovements';
import { useActiveWarehouses } from '@/hooks/useWarehouses';
import { useProducts } from '@/hooks/useProducts';
import { useParties } from '@/hooks/useParties';
import { SearchablePartySelect } from '@/components/accounting/SearchablePartySelect';
import { useProductDaybookStats, DeliveryLocationFilter } from '@/hooks/useProductDaybookStats';
import { format, subDays } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import DateQuickFilters, { DateRange } from '@/components/inventory/DateQuickFilters';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useAvailableStock } from '@/hooks/useAvailableStock';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useClientPagination } from '@/hooks/useClientPagination';
import { DataPagination } from '@/components/ui/data-pagination';

const MOVEMENT_TYPES = ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'WHOLESALE_OUT', 'RTO_IN'] as const;

const getTypeColor = (type: string) => {
  switch (type) {
    case 'IN': 
      return 'bg-green-500';
    case 'RTO_IN': 
      return 'bg-orange-500';
    case 'OUT': 
    case 'RTO_OUT': 
      return 'bg-red-500';
    case 'TRANSFER':
    case 'TRANSFER_IN': 
    case 'TRANSFER_OUT': 
      return 'bg-blue-500';
    case 'ADJUSTMENT': return 'bg-yellow-500';
    case 'WHOLESALE_OUT': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
};

const getTypeLabel = (movement: any) => {
  if (movement.movement_type === 'ADJUSTMENT' && movement.adjustment_direction) {
    return movement.adjustment_direction === 'PLUS' ? 'ADJUSTMENT (+)' : 'ADJUSTMENT (-)';
  }
  if (movement.movement_type === 'RTO_IN') {
    return 'RTO (Return)';
  }
  return movement.movement_type;
};

const getMovementTypeDisplayLabel = (type: string) => {
  switch (type) {
    case 'IN': return 'Purchase IN';
    case 'OUT': return 'Sale OUT';
    case 'TRANSFER': return 'Transfer';
    case 'ADJUSTMENT': return 'Adjustment';
    case 'WHOLESALE_OUT': return 'Wholesale OUT';
    case 'RTO_IN': return 'RTO (Return)';
    default: return type;
  }
};

const getAdjustmentDirectionColor = (direction: string) => {
  return direction === 'PLUS' ? 'bg-green-500' : 'bg-red-500';
};

export default function StockMovements() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
    endDate: today,
    label: 'Last 7 Days',
  });
  const [filters, setFilters] = useState({ warehouseId: 'all', productId: 'all', movementType: 'all' as any, remarkSearch: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [viewingMovement, setViewingMovement] = useState<StockMovement | null>(null);
  const [insufficientStockAlert, setInsufficientStockAlert] = useState<{
    show: boolean;
    availableStock: number;
    requiredQty: number;
    productName: string;
    warehouseName: string;
  }>({ show: false, availableStock: 0, requiredQty: 0, productName: '', warehouseName: '' });
  const { effectiveRole } = useEffectiveRole();
  const canEdit = ['ADMIN', 'OWNER', 'MANAGER', 'WAREHOUSE'].includes(effectiveRole || '');
  
  // Fetch approval status for stock movements linked to transactions
  const { data: approvalMap = {} } = useQuery({
    queryKey: ['stock-movement-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('reference_id, approval_status')
        .eq('reference_type', 'stock_movement')
        .in('approval_status', ['PENDING', 'APPROVED']);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((t: any) => { if (t.reference_id) map[t.reference_id] = t.approval_status; });
      return map;
    },
  });
  const [form, setForm] = useState<{
    product_id: string;
    warehouse_id: string;
    from_warehouse_id: string;
    to_warehouse_id: string;
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
    adjustment_direction?: 'PLUS' | 'MINUS';
    related_to_accounting: boolean;
  }>({
    product_id: '',
    warehouse_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
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
    adjustment_direction: 'PLUS',
    related_to_accounting: true,
  });

  const { data: movements, isLoading } = useStockMovements({
    startDate: dateRange.startDate || undefined,
    endDate: dateRange.endDate || undefined,
    warehouseId: filters.warehouseId,
    productId: filters.productId,
    movementType: filters.movementType !== 'all' ? filters.movementType : undefined,
    remarkSearch: filters.remarkSearch || undefined,
  });
  const { data: warehouses } = useActiveWarehouses();
  const { data: products } = useProducts();
  const { data: suppliers } = useParties('SUPPLIER');
  const { data: customers } = useParties('CUSTOMER');
  const createMovement = useCreateStockMovement();
  const deleteMovement = useDeleteStockMovement();
  const updateMovement = useUpdateStockMovement();

  // Pagination - 100 per page
  const movementsPaginationKey = `${dateRange.startDate}|${dateRange.endDate}|${filters.warehouseId}|${filters.productId}|${filters.movementType}|${filters.remarkSearch}|${(movements ?? []).length}`;
  const {
    pagedRows: pagedMovements,
    page: movementsPage,
    setPage: setMovementsPage,
    totalPages: movementsTotalPages,
    total: movementsTotal,
    from: movementsFrom,
    to: movementsTo,
  } = useClientPagination(movements ?? [], 100, movementsPaginationKey);

  // Determine the warehouse ID to check stock for (source warehouse for transfers, regular warehouse for others)
  const stockCheckWarehouseId = form.movement_type === 'TRANSFER' ? form.from_warehouse_id : form.warehouse_id;
  const { data: availableStockData } = useAvailableStock(form.product_id || undefined, stockCheckWarehouseId || undefined);

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

  // Auto-fill qty, unit_price, and reference_order_count from Product Daybook stats ONLY when movement_type is OUT
  useEffect(() => {
    if (daybookStats && daybookStats.totalQty > 0 && dialogOpen && form.movement_type === 'OUT') {
      setForm(f => ({
        ...f,
        qty: daybookStats.totalQty,
        unit_price: daybookStats.avgPrice,
        reference_order_count: daybookStats.orderCount,
      }));
    }
  }, [daybookStats, dialogOpen, form.movement_type]);

  const resetForm = () => {
    setForm({
      product_id: '',
      warehouse_id: '',
      from_warehouse_id: '',
      to_warehouse_id: '',
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
      adjustment_direction: 'PLUS',
      related_to_accounting: true,
    });
  };

  // Auto-fill unit cost & price when product changes
  const handleProductChange = (productId: string) => {
    const selectedProduct = products?.find(p => p.id === productId);
    const costPrice = selectedProduct?.cost_price || 0;
    const sellPrice = selectedProduct?.sell_price || 0;
    const wholesalePrice = selectedProduct?.wholesale_price || 0;
    
    // Different price defaults based on movement type
    if (form.movement_type === 'IN') {
      setForm(f => ({ ...f, product_id: productId, unit_cost: costPrice, unit_price: 0 }));
    } else if (form.movement_type === 'OUT') {
      setForm(f => ({ ...f, product_id: productId, unit_cost: costPrice, unit_price: sellPrice }));
    } else if (form.movement_type === 'WHOLESALE_OUT') {
      setForm(f => ({ ...f, product_id: productId, unit_cost: costPrice, unit_price: wholesalePrice }));
    } else {
      setForm(f => ({ ...f, product_id: productId, unit_cost: costPrice, unit_price: sellPrice }));
    }
  };

  // Re-apply prices when movement type changes
  const handleTypeChange = (type: typeof MOVEMENT_TYPES[number]) => {
    const selectedProduct = products?.find(p => p.id === form.product_id);
    const costPrice = selectedProduct?.cost_price || 0;
    const sellPrice = selectedProduct?.sell_price || 0;
    const wholesalePrice = selectedProduct?.wholesale_price || 0;
    
    if (type === 'IN') {
      setForm(f => ({ ...f, movement_type: type, unit_cost: costPrice, unit_price: 0 }));
    } else if (type === 'OUT') {
      setForm(f => ({ ...f, movement_type: type, unit_cost: costPrice, unit_price: sellPrice }));
    } else if (type === 'WHOLESALE_OUT') {
      setForm(f => ({ ...f, movement_type: type, unit_cost: costPrice, unit_price: wholesalePrice }));
    } else {
      setForm(f => ({ ...f, movement_type: type }));
    }
  };

  // Computed totals
  const computedTotalCost = form.qty * form.unit_cost;
  const computedTotalValue = form.qty * form.unit_price;

  const handleSubmit = async () => {
    // Validation based on movement type
    const isTransfer = form.movement_type === 'TRANSFER';
    const isWholesaleOut = form.movement_type === 'WHOLESALE_OUT';
    const isOut = form.movement_type === 'OUT';
    const isAdjustmentMinus = form.movement_type === 'ADJUSTMENT' && form.adjustment_direction === 'MINUS';
    
    if (!form.product_id || form.qty <= 0) return;
    
    // For transfers, require from_warehouse and to_warehouse
    if (isTransfer) {
      if (!form.from_warehouse_id || !form.to_warehouse_id) {
        return;
      }
      if (form.from_warehouse_id === form.to_warehouse_id) {
        return;
      }
    } else {
      // For non-transfers, require warehouse_id
      if (!form.warehouse_id) return;
    }
    
    // Stock validation for stock-decreasing movements (OUT, TRANSFER, WHOLESALE_OUT, ADJUSTMENT MINUS)
    const isStockDecreasing = isOut || isTransfer || isWholesaleOut || isAdjustmentMinus;
    if (isStockDecreasing && !editingMovement) {
      const currentAvailableStock = availableStockData?.currentStock ?? 0;
      
      if (form.qty > currentAvailableStock) {
        const productName = products?.find(p => p.id === form.product_id)?.name || 'Selected Product';
        const warehouseToCheck = isTransfer ? form.from_warehouse_id : form.warehouse_id;
        const warehouseName = warehouses?.find(w => w.id === warehouseToCheck)?.name || 'Selected Warehouse';
        
        setInsufficientStockAlert({
          show: true,
          availableStock: currentAvailableStock,
          requiredQty: form.qty,
          productName,
          warehouseName,
        });
        return;
      }
    }
    
    // For WHOLESALE_OUT, party is optional now
    // (removed party_id requirement for WHOLESALE_OUT)
    
    const isAdjustment = form.movement_type === 'ADJUSTMENT';
    
    const movementData: any = {
      ...form,
      movement_reason: isWholesaleOut ? 'WHOLESALE' : (form.movement_reason || null),
      movement_source: isWholesaleOut ? 'WHOLESALE' : (form.movement_source || null),
      is_sale: isWholesaleOut ? true : (form.is_sale || null),
      sale_category: isWholesaleOut ? 'WHOLESALE' : (form.sale_category || null),
      // Explicitly set party_id to null when undefined (fixes "none" selection not saving)
      party_id: form.party_id || null,
      // For transfers, use from_warehouse as primary warehouse_id (stock decreases)
      warehouse_id: isTransfer ? form.from_warehouse_id : form.warehouse_id,
      from_warehouse_id: isTransfer ? form.from_warehouse_id : null,
      to_warehouse_id: isTransfer ? form.to_warehouse_id : null,
      // For adjustments, include the direction
      adjustment_direction: isAdjustment ? form.adjustment_direction : null,
      // Related to accounting - only applicable for IN and WHOLESALE_OUT
      related_to_accounting: (form.movement_type === 'IN' || form.movement_type === 'WHOLESALE_OUT') ? form.related_to_accounting : true,
    };
    
    if (editingMovement) {
      await updateMovement.mutateAsync({ id: editingMovement.id, ...movementData });
    } else {
      await createMovement.mutateAsync(movementData);
    }
    setDialogOpen(false);
    setEditingMovement(null);
    resetForm();
  };

  const handleEdit = (movement: StockMovement) => {
    setEditingMovement(movement);
    // Map old movement types to new simplified types
    let mappedType: typeof MOVEMENT_TYPES[number] = 'IN';
    const mt = movement.movement_type;
    if (mt === 'IN') mappedType = 'IN';
    else if (mt === 'OUT' || mt === 'RTO_OUT') mappedType = 'OUT';
    else if (mt === 'TRANSFER_IN' || mt === 'TRANSFER_OUT' || mt === 'TRANSFER') mappedType = 'TRANSFER';
    else if (mt === 'ADJUSTMENT') mappedType = 'ADJUSTMENT';
    else if (mt === 'WHOLESALE_OUT') mappedType = 'WHOLESALE_OUT';
    else if (mt === 'RTO_IN') mappedType = 'IN'; // RTO_IN treated as IN
    
    setForm({
      product_id: movement.product_id,
      warehouse_id: movement.warehouse_id,
      from_warehouse_id: movement.from_warehouse_id || '',
      to_warehouse_id: movement.to_warehouse_id || '',
      movement_date: movement.movement_date,
      movement_type: mappedType,
      source: movement.source || '',
      reference_type: movement.reference_type || '',
      reference_id: movement.reference_id || '',
      qty: movement.qty,
      unit_cost: movement.unit_cost || 0,
      unit_price: movement.unit_price || 0,
      remark: movement.remark || '',
      movement_reason: movement.movement_reason || undefined,
      is_sale: movement.is_sale || undefined,
      sale_category: movement.sale_category || undefined,
      party_id: movement.party_id || undefined,
      movement_source: movement.movement_source || undefined,
      reference_order_count: movement.reference_order_count || 0,
      adjustment_direction: (movement as any).adjustment_direction || 'PLUS',
      related_to_accounting: (movement as any).related_to_accounting !== false,
    });
    setDialogOpen(true);
  };

  const quickAdd = (type: typeof MOVEMENT_TYPES[number]) => {
    resetForm();
    setForm((f) => ({ ...f, movement_type: type }));
    setDialogOpen(true);
  };

  const clearFilters = () => {
    setFilters({ warehouseId: 'all', productId: 'all', movementType: 'all', remarkSearch: '' });
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
          <Button variant="outline" onClick={() => quickAdd('OUT')} className="text-red-600">
            <ArrowUpFromLine className="h-4 w-4 mr-1" />Sale OUT
          </Button>
          <Button variant="outline" onClick={() => quickAdd('TRANSFER')} className="text-blue-600">
            <RefreshCw className="h-4 w-4 mr-1" />Transfer
          </Button>
          <Button variant="outline" onClick={() => quickAdd('WHOLESALE_OUT')} className="text-purple-600">
            <ShoppingBag className="h-4 w-4 mr-1" />Wholesale OUT
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { resetForm(); setEditingMovement(null); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Movement</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingMovement ? 'Edit Stock Movement' : 'Add Stock Movement'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Product *</Label>
                    <CompactProductSelect
                      products={products || []}
                      value={form.product_id}
                      onSelect={handleProductChange}
                      placeholder="Select product"
                      filterActive={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select value={form.movement_type} onValueChange={handleTypeChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MOVEMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{getMovementTypeDisplayLabel(t)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Transfer Warehouse Selection */}
                {form.movement_type === 'TRANSFER' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>From Warehouse *</Label>
                      <Select value={form.from_warehouse_id} onValueChange={(v) => setForm({ ...form, from_warehouse_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Source warehouse" /></SelectTrigger>
                        <SelectContent>
                          {warehouses?.filter(w => w.id !== form.to_warehouse_id).map((w) => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>To Warehouse *</Label>
                      <Select value={form.to_warehouse_id} onValueChange={(v) => setForm({ ...form, to_warehouse_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Destination warehouse" /></SelectTrigger>
                        <SelectContent>
                          {warehouses?.filter(w => w.id !== form.from_warehouse_id).map((w) => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Warehouse *</Label>
                    <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                      <SelectContent>
                        {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Adjustment Direction - shown only for ADJUSTMENT type */}
                {form.movement_type === 'ADJUSTMENT' && (
                  <div className="space-y-2">
                    <Label>Stock Adjustment Type *</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={form.adjustment_direction === 'PLUS' ? 'default' : 'outline'}
                        className={form.adjustment_direction === 'PLUS' ? 'bg-green-600 hover:bg-green-700 flex-1' : 'flex-1'}
                        onClick={() => setForm({ ...form, adjustment_direction: 'PLUS' })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Stock In (+)
                      </Button>
                      <Button
                        type="button"
                        variant={form.adjustment_direction === 'MINUS' ? 'default' : 'outline'}
                        className={form.adjustment_direction === 'MINUS' ? 'bg-red-600 hover:bg-red-700 flex-1' : 'flex-1'}
                        onClick={() => setForm({ ...form, adjustment_direction: 'MINUS' })}
                      >
                        <ArrowUpFromLine className="h-4 w-4 mr-2" />
                        Stock Out (-)
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {form.adjustment_direction === 'PLUS' 
                        ? 'This will increase the inventory count' 
                        : 'This will decrease the inventory count'}
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={form.movement_date} onChange={(e) => setForm({ ...form, movement_date: e.target.value })} />
                </div>
                {/* Party Selection - shown for IN and Wholesale OUT movements */}
                {(form.movement_type === 'IN' || form.movement_type === 'WHOLESALE_OUT') && (
                  <div className="space-y-2">
                    <Label>
                      {form.movement_type === 'IN' ? 'Supplier (Optional)' : 'Party'}
                    </Label>
                    <SearchablePartySelect
                      value={form.party_id || 'none'}
                      onValueChange={(v) => setForm({ 
                        ...form, 
                        party_id: v === 'none' ? undefined : v,
                        movement_source: v === 'none' ? undefined : (
                          form.movement_type === 'IN' ? 'SUPPLIER' : 'WHOLESALE'
                        )
                      })}
                      placeholder={
                        form.movement_type === 'IN' 
                          ? 'Select supplier' 
                          : 'Select party (optional)'
                      }
                      partyType={form.movement_type === 'IN' ? 'SUPPLIER' : 'CUSTOMER'}
                      showNoneOption={true}
                      showAddButton={false}
                    />
                  </div>
                )}
                {/* Product Daybook Reference Stats - only for OUT type */}
                {form.movement_type === 'OUT' && form.product_id && form.movement_date && (
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
                {/* Available Stock Info - shown for stock-decreasing movements */}
                {(form.movement_type === 'OUT' || form.movement_type === 'TRANSFER' || form.movement_type === 'WHOLESALE_OUT' || (form.movement_type === 'ADJUSTMENT' && form.adjustment_direction === 'MINUS')) && form.product_id && (form.movement_type === 'TRANSFER' ? form.from_warehouse_id : form.warehouse_id) && (
                  <div className={`p-3 rounded-md border ${(availableStockData?.currentStock ?? 0) <= 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'}`}>
                    <div className="flex items-center gap-2">
                      <Package className={`h-4 w-4 ${(availableStockData?.currentStock ?? 0) <= 0 ? 'text-red-600' : 'text-green-600'}`} />
                      <span className={`text-sm font-medium ${(availableStockData?.currentStock ?? 0) <= 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                        Available Stock: {availableStockData?.currentStock ?? 0} units
                      </span>
                      {form.qty > (availableStockData?.currentStock ?? 0) && (
                        <Badge variant="destructive" className="ml-auto">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Insufficient
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <div className={`grid gap-4 ${form.movement_type === 'OUT' ? 'grid-cols-4' : 'grid-cols-3'}`}>
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
                  {form.movement_type === 'OUT' && (
                    <div className="space-y-2">
                      <Label>Ref. Order</Label>
                      <Input type="number" min={0} value={form.reference_order_count} onChange={(e) => setForm({ ...form, reference_order_count: +e.target.value })} />
                    </div>
                  )}
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
                <div className="space-y-2">
                  <Label>Remark</Label>
                  <Textarea value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
                </div>
                {/* Related to Accounting checkbox - shown for IN and WHOLESALE_OUT movements */}
                {(form.movement_type === 'IN' || form.movement_type === 'WHOLESALE_OUT') && (() => {
                  const isApprovedInAccounting = editingMovement ? approvalMap[editingMovement.id] === 'APPROVED' : false;
                  return (
                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-md">
                    <Checkbox
                      id="related_to_accounting"
                      checked={form.related_to_accounting}
                      disabled={isApprovedInAccounting}
                      onCheckedChange={(checked) => setForm({ ...form, related_to_accounting: !!checked })}
                    />
                    <Label htmlFor="related_to_accounting" className="text-sm font-medium cursor-pointer">
                      Related to Accounting
                    </Label>
                    {isApprovedInAccounting ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <LockFilledIcon className="h-3 w-3" /> Locked — unlock in accounting to change
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        (Creates party ledger entry when checked)
                      </span>
                    )}
                  </div>
                  );
                })()}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); setEditingMovement(null); }}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={
                    !form.product_id || 
                    form.qty <= 0 || 
                    (form.movement_type === 'TRANSFER' ? (!form.from_warehouse_id || !form.to_warehouse_id) : !form.warehouse_id)
                  }>
                    {editingMovement ? 'Update' : 'Save'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Insufficient Stock Alert Dialog */}
          <AlertDialog open={insufficientStockAlert.show} onOpenChange={(open) => setInsufficientStockAlert(prev => ({ ...prev, show: open }))}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Insufficient Stock
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    Cannot complete this movement. The requested quantity exceeds available stock.
                  </p>
                  <div className="bg-muted p-3 rounded-md space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Product:</span>
                      <span className="font-medium">{insufficientStockAlert.productName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Warehouse:</span>
                      <span className="font-medium">{insufficientStockAlert.warehouseName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Available Stock:</span>
                      <span className="font-medium text-green-600">{insufficientStockAlert.availableStock} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Requested Quantity:</span>
                      <span className="font-medium text-red-600">{insufficientStockAlert.requiredQty} units</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Shortage:</span>
                      <span className="font-bold text-destructive">{insufficientStockAlert.requiredQty - insufficientStockAlert.availableStock} units</span>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setInsufficientStockAlert(prev => ({ ...prev, show: false }))}>
                  OK, I Understand
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
            <div className="space-y-2">
              <Label>Search Remark</Label>
              <div className="flex gap-1">
                <Input 
                  placeholder="Search in remark..." 
                  value={filters.remarkSearch} 
                  onChange={(e) => setFilters({ ...filters, remarkSearch: e.target.value })}
                  className="w-[180px]"
                />
              </div>
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
                  <TableHead className="text-right hidden">Ref. Order</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedMovements.map((m) => {
                  // Display warehouse: For TRANSFER show "From → To", otherwise show warehouse name
                  const warehouseDisplay = m.movement_type === 'TRANSFER' && m.from_warehouse && m.to_warehouse
                    ? `${m.from_warehouse.name} → ${m.to_warehouse.name}`
                    : m.warehouses?.name || '-';
                  
                  return (
                  <TableRow key={m.id}>
                    <TableCell>{m.movement_date}</TableCell>
                    <TableCell className="font-medium">{m.products?.name || '-'}</TableCell>
                    <TableCell>{warehouseDisplay}</TableCell>
                    <TableCell>
                      <Badge className={
                        m.movement_type === 'ADJUSTMENT' && (m as any).adjustment_direction 
                          ? getAdjustmentDirectionColor((m as any).adjustment_direction)
                          : getTypeColor(m.movement_type)
                      }>
                        {getTypeLabel(m)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{m.qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.unit_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.unit_price)}</TableCell>
                    <TableCell className="text-right hidden">{m.reference_order_count || 0}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.total_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.total_value)}</TableCell>
                    <TableCell>{m.remark || '-'}</TableCell>
                    <TableCell>
                      {(() => {
                        const status = approvalMap[m.id];
                        const isApproved = status === 'APPROVED';
                        return (
                          <div className="flex items-center gap-2">
                            {status === 'APPROVED' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <LockFilledIcon className="h-4 w-4 text-green-600" />
                                  </TooltipTrigger>
                                  <TooltipContent>Locked in accounting — cannot edit/delete</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {status === 'PENDING' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <UnlockFilledIcon className="h-4 w-4 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>Unlocked — editable</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setViewingMovement(m)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                {canEdit && !isApproved && (
                                  <DropdownMenuItem onClick={() => handleEdit(m)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {canEdit && isApproved && (
                                  <DropdownMenuItem disabled className="text-muted-foreground">
                                    <LockFilledIcon className="h-4 w-4 mr-2" />
                                    Locked in Accounting
                                  </DropdownMenuItem>
                                )}
                                {canEdit && !isApproved && (
                                  <DropdownMenuItem 
                                    onClick={() => deleteMovement.mutate(m.id)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Movement Sheet */}
      <Sheet open={!!viewingMovement} onOpenChange={(open) => !open && setViewingMovement(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Movement Details</SheetTitle>
          </SheetHeader>
          {viewingMovement && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Date</Label>
                  <p className="font-medium">{viewingMovement.movement_date}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Type</Label>
                  <Badge className={
                    viewingMovement.movement_type === 'ADJUSTMENT' && (viewingMovement as any).adjustment_direction 
                      ? getAdjustmentDirectionColor((viewingMovement as any).adjustment_direction)
                      : getTypeColor(viewingMovement.movement_type)
                  }>
                    {getTypeLabel(viewingMovement)}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Product</Label>
                <p className="font-medium">{viewingMovement.products?.name || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Warehouse</Label>
                <p className="font-medium">
                  {viewingMovement.movement_type === 'TRANSFER' && viewingMovement.from_warehouse && viewingMovement.to_warehouse
                    ? `${viewingMovement.from_warehouse.name} → ${viewingMovement.to_warehouse.name}`
                    : viewingMovement.warehouses?.name || '-'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Quantity</Label>
                  <p className="font-medium">{viewingMovement.qty}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Ref. Orders</Label>
                  <p className="font-medium">{viewingMovement.reference_order_count || 0}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Unit Cost</Label>
                  <p className="font-medium">{formatCurrency(viewingMovement.unit_cost)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Unit Price</Label>
                  <p className="font-medium">{formatCurrency(viewingMovement.unit_price)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Total Cost</Label>
                  <p className="font-medium">{formatCurrency(viewingMovement.total_cost)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Total Value</Label>
                  <p className="font-medium">{formatCurrency(viewingMovement.total_value)}</p>
                </div>
              </div>
              {viewingMovement.parties && (
                <div>
                  <Label className="text-muted-foreground text-xs">Party</Label>
                  <p className="font-medium">{viewingMovement.parties.name}</p>
                </div>
              )}
              {viewingMovement.remark && (
                <div>
                  <Label className="text-muted-foreground text-xs">Remark</Label>
                  <p className="font-medium">{viewingMovement.remark}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
