import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, DollarSign, Package, ChevronDown, Percent, Target, ShoppingBag, Settings } from 'lucide-react';
import { useSaveDailyPL, useDailySalesByProduct } from '@/hooks/useDailyPL';
import { useDailyRecords } from '@/hooks/useDailyRecords';
import { AddDailyRecordDialog } from '@/components/inventory/AddDailyRecordDialog';
import { DailyRecordsTable } from '@/components/inventory/DailyRecordsTable';
import { usePLSummaryByRange, useDailyPLTrend, useAITargetSuggestions } from '@/hooks/useDailyPLRange';
import { useWholesalePLSummary } from '@/hooks/useWholesalePL';
import { useActiveWarehouses } from '@/hooks/useWarehouses';
import { useStockMovementMetrics, useOfficeManagementExpense, useAdsSpendMetrics } from '@/hooks/useDailyPLMetrics';
import { useCostSettings, useUpdateCostSettings, DEFAULT_COST_SETTINGS } from '@/hooks/useCostSettings';
import DateQuickFilters, { DateRange } from '@/components/inventory/DateQuickFilters';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DEFAULT_USD_RATE = 150;
const DEFAULT_DELIVERY_COST_PER_ORDER = 400;
const DEFAULT_RTO_COST_PER_ORDER = 0;

export default function DailyPL() {
  const [searchParams] = useSearchParams();
  const warehouseFromUrl = searchParams.get('warehouse');
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: today, endDate: today, label: 'Today' });
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(warehouseFromUrl || 'all');
  const [costSettingsOpen, setCostSettingsOpen] = useState(false);
  const [costInputs, setCostInputs] = useState({
    rto_percent: DEFAULT_COST_SETTINGS.rto_percent,
    usd_rate: DEFAULT_COST_SETTINGS.usd_rate,
    delivery_charge_per_order: DEFAULT_COST_SETTINGS.delivery_charge_per_order,
    rto_charge_per_unit: DEFAULT_COST_SETTINGS.rto_charge_per_unit,
    redirect_charge_per_unit: DEFAULT_COST_SETTINGS.redirect_charge_per_unit,
    office_cost_per_order: DEFAULT_COST_SETTINGS.office_cost_per_order,
    redirect_percent: DEFAULT_COST_SETTINGS.redirect_percent,
  });
  
  const { data: warehouses } = useActiveWarehouses();
  const { data: plData, isLoading } = usePLSummaryByRange(dateRange.startDate, dateRange.endDate, selectedWarehouse);
  const { data: wholesaleData } = useWholesalePLSummary(dateRange.startDate, dateRange.endDate, selectedWarehouse);
  const { data: salesByProduct } = useDailySalesByProduct(dateRange.startDate);
  const { data: trendData } = useDailyPLTrend(30);
  const { data: aiTargets } = useAITargetSuggestions(dateRange.startDate, dateRange.endDate);
  const { data: dailyRecords, refetch: refetchRecords } = useDailyRecords({ 
    startDate: dateRange.startDate, 
    endDate: dateRange.endDate, 
    warehouseId: selectedWarehouse,
    limit: 500 // Increased to ensure all records are included in profit sum
  });
  const savePL = useSaveDailyPL();
  
  // New data hooks for real metrics
  const { data: stockMetrics } = useStockMovementMetrics(dateRange.startDate, dateRange.endDate);
  const { data: officeExpense } = useOfficeManagementExpense(dateRange.startDate, dateRange.endDate);
  const { data: adsMetrics } = useAdsSpendMetrics(dateRange.startDate, dateRange.endDate);
  const { data: costSettings } = useCostSettings();
  const updateCostSettings = useUpdateCostSettings();
  
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(true);
  const [usdRate, setUsdRate] = useState(DEFAULT_USD_RATE);
  const [editableFields, setEditableFields] = useState({
    delivery_cost_per_order: DEFAULT_DELIVERY_COST_PER_ORDER,
    rto_cost_per_order: DEFAULT_RTO_COST_PER_ORDER,
    ads_spent_usd: 0,
    ads_spent_npr: 0,
    staff_office_cost: 0,
    other_expenses: 0,
    target_profit: 0,
    target_orders: 0,
  });

  // Set warehouse from URL on mount
  useEffect(() => {
    if (warehouseFromUrl) {
      setSelectedWarehouse(warehouseFromUrl);
    }
  }, [warehouseFromUrl]);

  useEffect(() => {
    if (aiTargets) {
      setEditableFields((prev) => ({
        ...prev,
        target_profit: aiTargets.suggestedProfit || prev.target_profit,
        target_orders: aiTargets.suggestedOrders || prev.target_orders,
      }));
    }
  }, [aiTargets]);

  useEffect(() => {
    setEditableFields((prev) => ({
      ...prev,
      ads_spent_npr: Math.round(prev.ads_spent_usd * usdRate),
    }));
  }, [editableFields.ads_spent_usd, usdRate]);

  // Initialize cost inputs from saved settings
  useEffect(() => {
    if (costSettings) {
      setCostInputs({
        rto_percent: costSettings.rto_percent,
        usd_rate: costSettings.usd_rate,
        delivery_charge_per_order: costSettings.delivery_charge_per_order,
        rto_charge_per_unit: costSettings.rto_charge_per_unit,
        redirect_charge_per_unit: costSettings.redirect_charge_per_unit,
        office_cost_per_order: costSettings.office_cost_per_order,
        redirect_percent: costSettings.redirect_percent,
      });
    }
  }, [costSettings]);

  // Use actual metrics from hooks
  const U = stockMetrics?.unitsSold ?? plData?.summary?.total_units_sold ?? 0;
  const GS = stockMetrics?.grossSales ?? plData?.summary?.gross_sales_value ?? 0;
  const COGS = plData?.summary?.product_cost ?? 0;
  
  // RTO % from cost settings
  const R = costSettings?.rto_percent ?? DEFAULT_COST_SETTINGS.rto_percent;
  
  // Total Expense from "office management" category transactions
  const officeManagementExpense = officeExpense?.totalExpense ?? 0;
  
  // Ads spend from ads table
  const adsFromTable = adsMetrics?.adsSpend ?? 0;
  
  const D_per = editableFields.delivery_cost_per_order;
  const R_per = editableFields.rto_cost_per_order;
  
  // RTO Orders = round(U × (R / 100))
  const rtoOrders = Math.round(U * (R / 100));
  
  // RTO Cost = RTO Orders × RTO Cost/Order
  const rtoCost = rtoOrders * R_per;
  
  // Actual Sales = GS - (GS × R / 100)
  const actualSales = GS - (GS * R / 100);
  
  // Total Delivery Cost = U × D_per
  const totalDeliveryCost = U * D_per;
  
  // Total Expense = Office Management Expense (from transactions)
  const totalExpense = officeManagementExpense;
  
  // Actual Profit = Sum of profit_loss from daily records (date filtered)
  const actualProfit = useMemo(() => {
    if (!dailyRecords?.length) return 0;
    return dailyRecords.reduce((sum, record) => sum + (record.profit_loss || 0), 0);
  }, [dailyRecords]);
  
  // Avg Profit/Order = Actual Profit / U (if U > 0)
  const avgProfitPerOrder = U > 0 ? Math.round(actualProfit / U) : 0;
  
  // ROI = Actual Profit / Ads (from ads table)
  const roiAds = adsFromTable > 0 ? actualProfit / adsFromTable : 0;
  
  // Profit margin
  const profitMargin = actualSales > 0 ? ((actualProfit / actualSales) * 100).toFixed(1) : '0';

  const handleSave = async () => {
    await savePL.mutateAsync({
      date: dateRange.startDate,
      warehouse_id: selectedWarehouse !== 'all' ? selectedWarehouse : null,
      total_units_sold: U,
      gross_sales_value: GS,
      product_cost: COGS,
      delivery_cost_per_order: D_per,
      rto_rate_percent: R,
      rto_cost_per_order: R_per,
      ads_spent_usd: editableFields.ads_spent_usd,
      usd_rate: usdRate,
      ads_spent_npr: adsFromTable,
      staff_office_cost: editableFields.staff_office_cost,
      other_expenses: editableFields.other_expenses,
      target_profit: editableFields.target_profit,
      target_orders: editableFields.target_orders,
    });
  };

  const handleSaveCostSettings = async () => {
    await updateCostSettings.mutateAsync(costInputs);
    setCostSettingsOpen(false);
  };

  const formatCurrency = (val: number) => `Rs ${Math.round(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const chartData = useMemo(
    () =>
      trendData?.map((d) => ({
        date: format(new Date(d.date), 'MMM dd'),
        profit: d.actual_profit,
        ads: d.ads_spent,
      })) || [],
    [trendData]
  );

  const selectedWarehouseName = selectedWarehouse === 'all' 
    ? 'All Warehouses' 
    : warehouses?.find(w => w.id === selectedWarehouse)?.name || 'Selected Warehouse';


  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Daily Profit / Loss</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            P/L – {selectedWarehouseName} ({dateRange.label})
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="w-[140px] md:w-[180px] h-9 text-xs md:text-sm">
              <SelectValue placeholder="Warehouse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses?.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateQuickFilters value={dateRange} onChange={setDateRange} />
          
          {/* Cost Settings Button */}
          <Dialog open={costSettingsOpen} onOpenChange={setCostSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle>Cost Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">RTO %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={costInputs.rto_percent}
                    onChange={(e) => setCostInputs(prev => ({ ...prev, rto_percent: +e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">USD Rate (NPR)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={costInputs.usd_rate}
                    onChange={(e) => setCostInputs(prev => ({ ...prev, usd_rate: +e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Delivery Charge per Order</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={costInputs.delivery_charge_per_order}
                    onChange={(e) => setCostInputs(prev => ({ ...prev, delivery_charge_per_order: +e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">RTO Charge per Unit</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={costInputs.rto_charge_per_unit}
                    onChange={(e) => setCostInputs(prev => ({ ...prev, rto_charge_per_unit: +e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Redirect Charge per Unit</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={costInputs.redirect_charge_per_unit}
                    onChange={(e) => setCostInputs(prev => ({ ...prev, redirect_charge_per_unit: +e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Office Cost per Order</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={costInputs.office_cost_per_order}
                    onChange={(e) => setCostInputs(prev => ({ ...prev, office_cost_per_order: +e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Redirect %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={costInputs.redirect_percent}
                    onChange={(e) => setCostInputs(prev => ({ ...prev, redirect_percent: +e.target.value }))}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSaveCostSettings}
                  disabled={updateCostSettings.isPending}
                >
                  {updateCostSettings.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {/* Top Cards - 2 cols on mobile, 3 on tablet, 6 on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium truncate pr-1">Units Sold</CardTitle>
                <Package className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-sm md:text-lg font-bold">{U} <span className="text-xs font-normal text-muted-foreground">({stockMetrics?.referenceOrderCount ?? 0} orders)</span></div>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  From stock movements
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium truncate pr-1">Gross Sales</CardTitle>
                <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-sm md:text-lg font-bold truncate">{formatCurrency(GS)}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  From stock movements
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium truncate pr-1">Actual Sales</CardTitle>
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500 shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-sm md:text-lg font-bold text-green-600 truncate">
                  {formatCurrency(actualSales)}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground">After {R}% RTO</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium truncate pr-1">Total Expense</CardTitle>
                <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-destructive shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-sm md:text-lg font-bold text-destructive truncate">
                  {formatCurrency(totalExpense)}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Office management</p>
              </CardContent>
            </Card>
            <Card className={actualProfit >= 0 ? 'border-green-500' : 'border-destructive'}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium truncate pr-1">Actual Profit</CardTitle>
                <Percent className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className={`text-sm md:text-lg font-bold truncate ${actualProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(actualProfit)}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Margin: {profitMargin}%</p>
              </CardContent>
            </Card>
            <Card className={roiAds >= 0 ? 'border-blue-500 bg-blue-500/5' : 'border-orange-500 bg-orange-500/5'}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium truncate pr-1">ROI (Ads)</CardTitle>
                <Target className="h-3 w-3 md:h-4 md:w-4 text-blue-500 shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className={`text-sm md:text-lg font-bold ${roiAds >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {roiAds.toFixed(2)}x
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Ads: {formatCurrency(adsFromTable)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Records Section */}
          <Collapsible open={recordsOpen} onOpenChange={setRecordsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle>Daily Records</CardTitle>
                      <AddDailyRecordDialog 
                        initialDate={dateRange.startDate} 
                        initialWarehouse={selectedWarehouse}
                        onSaved={() => refetchRecords()}
                      />
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${recordsOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <DailyRecordsTable records={dailyRecords || []} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Warehouse Breakdown */}
          <Collapsible open={warehouseOpen} onOpenChange={setWarehouseOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <CardTitle>Warehouse Breakdown</CardTitle>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${warehouseOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {!plData?.warehouseBreakdown?.length ? (
                    <p className="text-muted-foreground">No data.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Warehouse</TableHead>
                          <TableHead className="text-right">Units</TableHead>
                          <TableHead className="text-right">Sales</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">Delivery</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plData.warehouseBreakdown.map((w) => {
                          const deliveryCost = w.units_sold * editableFields.delivery_cost_per_order;
                          const profit = w.gross_sales - w.product_cost - deliveryCost;
                          return (
                            <TableRow key={w.warehouse_id}>
                              <TableCell>{w.warehouse_name}</TableCell>
                              <TableCell className="text-right">{w.units_sold}</TableCell>
                              <TableCell className="text-right">{formatCurrency(w.gross_sales)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(w.product_cost)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(deliveryCost)}</TableCell>
                              <TableCell
                                className={`text-right font-semibold ${
                                  profit >= 0 ? 'text-green-600' : 'text-destructive'
                                }`}
                              >
                                {formatCurrency(profit)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Wholesale Profit / Loss Section */}
          {(wholesaleData?.total_units || 0) > 0 && (
            <Card className="border-purple-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-purple-500" />
                  Wholesale Profit / Loss – {selectedWarehouseName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Units Sold (Wholesale)</p>
                    <p className="text-2xl font-bold">{wholesaleData?.total_units || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Wholesale Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(wholesaleData?.wholesale_revenue || 0)}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Product Cost</p>
                    <p className="text-2xl font-bold text-destructive">{formatCurrency(wholesaleData?.wholesale_product_cost || 0)}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Wholesale Profit</p>
                    <p className={`text-2xl font-bold ${(wholesaleData?.wholesale_profit || 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(wholesaleData?.wholesale_profit || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sales by Product (Today only) */}
          {dateRange.label === 'Today' && salesByProduct?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Sales by Product</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesByProduct.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell className="text-right">{p.units}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.sales)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.cost)}</TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            p.profit >= 0 ? 'text-green-600' : 'text-destructive'
                          }`}
                        >
                          {formatCurrency(p.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {/* Profit vs Ad Spend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Profit vs Ad Spend (30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-muted-foreground">No data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="profit" name="Profit" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="ads" name="Ads" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
