import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Boxes, DollarSign, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Pencil, Check, X, Bell } from 'lucide-react';
import { useInventorySummaryByWarehouse, WarehouseStockSummary } from '@/hooks/useInventorySummaryByWarehouse';
import { useActiveWarehouses } from '@/hooks/useWarehouses';
import { useHighAlertData } from '@/hooks/useHighAlertData';
import { HighAlertSettingsDialog } from '@/components/inventory/HighAlertSettingsDialog';
import DateQuickFilters, { DateRange, getPresetRanges } from '@/components/inventory/DateQuickFilters';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const HIGH_ALERT_DAYS_KEY = 'inventory_high_alert_days';

export default function StockSummary() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [reorderOnly, setReorderOnly] = useState(false);
  const [highAlertOnly, setHighAlertOnly] = useState(false);
  const [highAlertDays, setHighAlertDays] = useState<number | null>(null);
  const [showHighAlertSettings, setShowHighAlertSettings] = useState(false);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    endDate: today,
    label: 'This Month',
  });

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const queryClient = useQueryClient();

  // Load high alert days from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(HIGH_ALERT_DAYS_KEY);
    if (saved) {
      const parsed = parseInt(saved);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 60) {
        setHighAlertDays(parsed);
      }
    }
  }, []);

  const { data: warehouses } = useActiveWarehouses();
  const { data: inventoryData, isLoading } = useInventorySummaryByWarehouse(
    activeTab,
    dateRange.startDate,
    dateRange.endDate
  );

  // Build current stock map for high alert calculation
  const currentStockMap = useMemo(() => {
    const map = new Map<string, number>();
    inventoryData?.items.forEach((item) => {
      const key = `${item.product_id}_${item.warehouse_id}`;
      map.set(key, item.current_stock);
    });
    return map;
  }, [inventoryData?.items]);

  // Fetch high alert data
  const { data: highAlertData } = useHighAlertData(activeTab, highAlertDays, currentStockMap);

  const formatCurrency = (val: number) => `Rs ${val.toLocaleString()}`;

  const handleEditClick = (item: WarehouseStockSummary) => {
    setEditingId(`${item.product_id}_${item.warehouse_id}`);
    setEditValue(item.reorder_level);
  };

  const handleSave = async (item: WarehouseStockSummary) => {
    try {
      const newReorderRequired = item.current_stock <= editValue;
      
      const { error } = await supabase
        .from('product_inventory')
        .update({ 
          reorder_level: editValue,
          reorder_required: newReorderRequired
        })
        .eq('product_id', item.product_id)
        .eq('warehouse_id', item.warehouse_id);

      if (error) throw error;

      toast({ title: 'Reorder level updated' });
      queryClient.invalidateQueries({ queryKey: ['inventory_summary_warehouse'] });
      setEditingId(null);
    } catch (err: any) {
      toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleHighAlertDaysApply = (days: number) => {
    setHighAlertDays(days);
    localStorage.setItem(HIGH_ALERT_DAYS_KEY, days.toString());
    toast({ title: `High Alert set to ${days} days` });
  };

  // Handle double-click to open settings
  const handleHighAlertButtonDoubleClick = useCallback(() => {
    setShowHighAlertSettings(true);
  }, []);

  // Handle right-click to open settings
  const handleHighAlertButtonContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowHighAlertSettings(true);
  }, []);

  // Handle long press for mobile
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  const handleTouchStart = useCallback(() => {
    const timer = setTimeout(() => {
      setShowHighAlertSettings(true);
    }, 500);
    setLongPressTimer(timer);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  // Get high alert info for an item
  const getHighAlertInfo = (item: WarehouseStockSummary) => {
    if (!highAlertDays || !highAlertData) return null;
    const key = `${item.product_id}_${item.warehouse_id}`;
    return highAlertData.get(key) || null;
  };

  // Count high alert items
  const highAlertCount = useMemo(() => {
    if (!highAlertDays || !highAlertData) return 0;
    let count = 0;
    highAlertData.forEach((data) => {
      if (data.isHighAlert) count++;
    });
    return count;
  }, [highAlertData, highAlertDays]);

  // Filter items by search, reorder, and high alert
  const filteredItems = useMemo(() => {
    return (
      inventoryData?.items.filter((item) => {
        const matchesSearch = item.product_name.toLowerCase().includes(search.toLowerCase());
        const matchesReorder = !reorderOnly || item.reorder_required;
        
        // High alert filter
        let matchesHighAlert = true;
        if (highAlertOnly) {
          if (!highAlertDays) {
            matchesHighAlert = false; // No days set = show nothing
          } else {
            const alertInfo = getHighAlertInfo(item);
            matchesHighAlert = alertInfo?.isHighAlert || false;
          }
        }

        return matchesSearch && matchesReorder && matchesHighAlert;
      }) || []
    );
  }, [inventoryData?.items, search, reorderOnly, highAlertOnly, highAlertDays, highAlertData]);

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
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-optimized header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Stock Summary</h1>
          <p className="text-sm text-muted-foreground">Inventory across warehouses</p>
        </div>
        <DateQuickFilters value={dateRange} onChange={setDateRange} />
      </div>

      {/* Warehouse Tabs - Scrollable on mobile */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto">
            <TabsTrigger value="all" className="text-xs md:text-sm">All</TabsTrigger>
            {warehouses?.map((w) => (
              <TabsTrigger key={w.id} value={w.id} className="text-xs md:text-sm whitespace-nowrap">
                {w.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="space-y-4 md:space-y-6 mt-4">
          {/* Summary Cards - 2 cols on mobile, 3 on tablet, 6 on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium">Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold">{displayTotals.totalProducts}</div>
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

          {/* Filters - Mobile optimized */}
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Search product..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="reorder"
                      checked={reorderOnly}
                      onCheckedChange={(c) => setReorderOnly(c === true)}
                    />
                    <label htmlFor="reorder" className="text-xs md:text-sm whitespace-nowrap cursor-pointer">
                      Reorder Only
                    </label>
                  </div>
                  
                  {/* High Alert Button */}
                  <Button
                    variant={highAlertOnly ? 'default' : 'outline'}
                    size="sm"
                    className={`gap-1.5 ${highAlertOnly ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                    onClick={() => setHighAlertOnly(!highAlertOnly)}
                    onDoubleClick={handleHighAlertButtonDoubleClick}
                    onContextMenu={handleHighAlertButtonContextMenu}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                  >
                    <Bell className="h-3.5 w-3.5" />
                    <span className="text-xs md:text-sm">High Alert</span>
                    {highAlertDays && (
                      <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                        {highAlertCount}
                      </Badge>
                    )}
                  </Button>
                  
                  {highAlertDays && (
                    <span className="text-xs text-muted-foreground">
                      ({highAlertDays}d)
                    </span>
                  )}
                </div>
              </div>
              
              {/* High Alert message when filter ON but days not set */}
              {highAlertOnly && !highAlertDays && (
                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-md border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-orange-700 dark:text-orange-300 flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Set High Alert Days to view alerts. 
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto text-orange-700 dark:text-orange-300 underline"
                      onClick={() => setShowHighAlertSettings(true)}
                    >
                      Configure now
                    </Button>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory - Mobile card view, Desktop table */}
          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="text-sm md:text-base">
                Inventory {activeTab !== 'all' && `- ${warehouses?.find((w) => w.id === activeTab)?.name}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {isLoading ? (
                <p className="text-muted-foreground p-4">Loading...</p>
              ) : !filteredItems.length ? (
                <p className="text-muted-foreground p-4">
                  {highAlertOnly && !highAlertDays 
                    ? 'Set High Alert Days to view alerts.' 
                    : 'No inventory records found.'}
                </p>
              ) : (
                <>
                  {/* Mobile card view */}
                  <div className="md:hidden space-y-2 p-4 pt-0">
                    {filteredItems.map((item) => {
                      const alertInfo = getHighAlertInfo(item);
                      return (
                        <Card 
                          key={`${item.product_id}_${item.warehouse_id}`} 
                          className={`p-3 ${alertInfo?.isHighAlert ? 'border-orange-400 bg-orange-50/50 dark:bg-orange-950/20' : ''}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{item.product_name}</p>
                              {activeTab === 'all' && (
                                <p className="text-xs text-muted-foreground">{item.warehouse_name}</p>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {alertInfo?.isHighAlert && (
                                <Badge className="bg-orange-500 text-white text-xs">High Alert</Badge>
                              )}
                              {item.reorder_required && (
                                <Badge variant="destructive" className="text-xs">Reorder</Badge>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">In</span>
                              <p className="font-medium text-green-600">{item.total_in}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Out</span>
                              <p className="font-medium text-red-600">{item.total_out}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Current</span>
                              <p className="font-medium">{item.current_stock}</p>
                            </div>
                          </div>
                          
                          {/* High Alert Info */}
                          {highAlertOnly && highAlertDays && alertInfo && (
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t border-dashed">
                              <div>
                                <span className="text-muted-foreground">Avg Out/day ({highAlertDays}d)</span>
                                <p className="font-medium">{alertInfo.avgOutPerDay.toFixed(1)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Days Cover</span>
                                <p className={`font-medium ${alertInfo.isHighAlert ? 'text-orange-600' : ''}`}>
                                  {alertInfo.daysCover !== null ? `${alertInfo.daysCover.toFixed(1)} days` : '-'}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs">
                            <span className="text-muted-foreground">Value: {formatCurrency(item.stock_value)}</span>
                            <div className="flex items-center gap-1">
                              <span>Reorder: {item.reorder_level}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleEditClick(item)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Desktop table view */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          {activeTab === 'all' && <TableHead>Warehouse</TableHead>}
                          <TableHead className="text-right">Opening</TableHead>
                          <TableHead className="text-right text-green-600">In</TableHead>
                          <TableHead className="text-right text-red-600">Out</TableHead>
                          <TableHead className="text-right">Current</TableHead>
                          {highAlertOnly && highAlertDays && (
                            <>
                              <TableHead className="text-right">Avg Out/day</TableHead>
                              <TableHead className="text-right">Days Cover</TableHead>
                            </>
                          )}
                          <TableHead className="text-right">Reorder Level</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Stock Value</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead>Drawer</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((inv, idx) => {
                          const alertInfo = getHighAlertInfo(inv);
                          return (
                            <TableRow
                              key={`${inv.product_id}_${inv.warehouse_id}_${idx}`}
                              className={
                                alertInfo?.isHighAlert 
                                  ? 'bg-orange-50 dark:bg-orange-950/20' 
                                  : inv.reorder_required 
                                    ? 'bg-destructive/10' 
                                    : ''
                              }
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
                              {highAlertOnly && highAlertDays && (
                                <>
                                  <TableCell className="text-right">
                                    {alertInfo ? alertInfo.avgOutPerDay.toFixed(1) : '-'}
                                  </TableCell>
                                  <TableCell className={`text-right ${alertInfo?.isHighAlert ? 'text-orange-600 font-medium' : ''}`}>
                                    {alertInfo?.daysCover !== null && alertInfo?.daysCover !== undefined 
                                      ? `${alertInfo.daysCover.toFixed(1)}d` 
                                      : '-'}
                                  </TableCell>
                                </>
                              )}
                              <TableCell className="text-right">
                                {editingId === `${inv.product_id}_${inv.warehouse_id}` ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <Input
                                      type="number"
                                      value={editValue}
                                      onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                                      className="w-20 h-7 text-right"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave(inv);
                                        if (e.key === 'Escape') handleCancel();
                                      }}
                                    />
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSave(inv)}>
                                      <Check className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancel}>
                                      <X className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span 
                                    className="cursor-pointer hover:text-primary flex items-center justify-end gap-1"
                                    onClick={() => handleEditClick(inv)}
                                  >
                                    {inv.reorder_level}
                                    <Pencil className="h-3 w-3 opacity-50" />
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {alertInfo?.isHighAlert && (
                                    <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Alert</Badge>
                                  )}
                                  {inv.reorder_required ? (
                                    <Badge variant="destructive">Reorder</Badge>
                                  ) : !alertInfo?.isHighAlert && (
                                    <Badge variant="secondary">OK</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(inv.stock_value)}</TableCell>
                              <TableCell>{inv.last_movement_date || '-'}</TableCell>
                              <TableCell>{inv.drawer_number || '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* High Alert Settings Dialog */}
      <HighAlertSettingsDialog
        open={showHighAlertSettings}
        onOpenChange={setShowHighAlertSettings}
        currentDays={highAlertDays}
        onApply={handleHighAlertDaysApply}
      />
    </div>
  );
}
