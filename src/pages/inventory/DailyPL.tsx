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
import { Save, TrendingUp, TrendingDown, DollarSign, Package, ChevronDown, Sparkles, Percent, Target, ShoppingBag, RotateCcw, Settings } from 'lucide-react';
import { useSaveDailyPL, useDailySalesByProduct, useDailyPLRecords } from '@/hooks/useDailyPL';
import { usePLSummaryByRange, useDailyPLTrend, useAITargetSuggestions } from '@/hooks/useDailyPLRange';
import { useWholesalePLSummary } from '@/hooks/useWholesalePL';
import { useActiveWarehouses } from '@/hooks/useWarehouses';
import { useStockMovementMetrics, useOfficeManagementExpense, useAdsSpendMetrics } from '@/hooks/useDailyPLMetrics';
import { useRTOSettings, useRTOSettingForMonth, useUpsertRTOSetting } from '@/hooks/useRTOSettings';
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
  const [rtoSettingsOpen, setRtoSettingsOpen] = useState(false);
  const [rtoInputs, setRtoInputs] = useState<Record<string, number>>({});
  
  const { data: warehouses } = useActiveWarehouses();
  const { data: plData, isLoading } = usePLSummaryByRange(dateRange.startDate, dateRange.endDate, selectedWarehouse);
  const { data: wholesaleData } = useWholesalePLSummary(dateRange.startDate, dateRange.endDate, selectedWarehouse);
  const { data: salesByProduct } = useDailySalesByProduct(dateRange.startDate);
  const { data: trendData } = useDailyPLTrend(30);
  const { data: aiTargets } = useAITargetSuggestions(dateRange.startDate, dateRange.endDate);
  const { data: dailyRecords } = useDailyPLRecords(30);
  const savePL = useSaveDailyPL();
  
  // New data hooks for real metrics
  const yearMonth = format(new Date(dateRange.startDate), 'yyyy-MM');
  const { data: stockMetrics } = useStockMovementMetrics(dateRange.startDate, dateRange.endDate);
  const { data: officeExpense } = useOfficeManagementExpense(dateRange.startDate, dateRange.endDate);
  const { data: adsMetrics } = useAdsSpendMetrics(dateRange.startDate, dateRange.endDate);
  const { data: rtoSetting } = useRTOSettingForMonth(yearMonth);
  const { data: allRtoSettings } = useRTOSettings();
  const upsertRTO = useUpsertRTOSetting();
  
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

  // Initialize RTO inputs from saved settings
  useEffect(() => {
    if (allRtoSettings) {
      const inputs: Record<string, number> = {};
      allRtoSettings.forEach(s => {
        inputs[s.year_month] = s.rto_percent;
      });
      setRtoInputs(inputs);
    }
  }, [allRtoSettings]);

  // Use actual metrics from hooks
  const U = stockMetrics?.unitsSold ?? plData?.summary?.total_units_sold ?? 0;
  const GS = stockMetrics?.grossSales ?? plData?.summary?.gross_sales_value ?? 0;
  const COGS = plData?.summary?.product_cost ?? 0;
  
  // RTO % from settings for the current month
  const R = rtoSetting?.rto_percent ?? 0;
  
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
  
  // Actual Profit = Actual Sales - Total Expense
  const actualProfit = actualSales - totalExpense;
  
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

  const handleSaveRTOSetting = async (month: string, value: number) => {
    await upsertRTO.mutateAsync({ yearMonth: month, rtoPercent: value });
  };

  const formatCurrency = (val: number) => `Rs ${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

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

  // Generate last 12 months for RTO settings
  const last12Months = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(format(date, 'yyyy-MM'));
    }
    return months;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Daily Profit / Loss</h1>
          <p className="text-muted-foreground">
            Aggregated P/L – {selectedWarehouseName} ({dateRange.label})
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Warehouse" />
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
          
          {/* RTO Settings Button */}
          <Dialog open={rtoSettingsOpen} onOpenChange={setRtoSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>RTO % Settings by Month</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {last12Months.map((month) => (
                  <div key={month} className="flex items-center gap-3">
                    <Label className="w-24 text-sm font-medium">
                      {format(new Date(month + '-01'), 'MMM yyyy')}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      placeholder="RTO %"
                      className="flex-1"
                      value={rtoInputs[month] ?? ''}
                      onChange={(e) => setRtoInputs(prev => ({ ...prev, [month]: +e.target.value }))}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveRTOSetting(month, rtoInputs[month] || 0)}
                      disabled={upsertRTO.isPending}
                    >
                      Save
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          
          <Button onClick={handleSave} disabled={savePL.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {/* Top Cards */}
          <div className="grid gap-4 md:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{U}</div>
                <p className="text-xs text-muted-foreground">
                  From stock movements
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gross Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(GS)}</div>
                <p className="text-xs text-muted-foreground">
                  From stock movements
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actual Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(actualSales)}
                </div>
                <p className="text-xs text-muted-foreground">After {R}% RTO deduction</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expense</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(totalExpense)}
                </div>
                <p className="text-xs text-muted-foreground">Office management</p>
              </CardContent>
            </Card>
            <Card className={actualProfit >= 0 ? 'border-green-500' : 'border-destructive'}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actual Profit</CardTitle>
                <Percent className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${actualProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(actualProfit)}
                </div>
                <p className="text-xs text-muted-foreground">Margin: {profitMargin}%</p>
              </CardContent>
            </Card>
            <Card className={roiAds >= 0 ? 'border-blue-500 bg-blue-500/5' : 'border-orange-500 bg-orange-500/5'}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ROI (Ads)</CardTitle>
                <Target className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${roiAds >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {roiAds.toFixed(2)}x
                </div>
                <p className="text-xs text-muted-foreground">
                  Ads: {formatCurrency(adsFromTable)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Auto-Calculated Section */}
            <Card>
              <CardHeader>
                <CardTitle>Metrics Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Units Sold (Stock Movements)</span>
                  <span className="font-medium">{U}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Sales (Stock Movements)</span>
                  <span className="font-medium">{formatCurrency(GS)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RTO % (Month: {yearMonth})</span>
                  <span className="font-medium text-orange-600">{R}%</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" />
                    RTO Orders (calculated)
                  </span>
                  <span className="font-medium text-orange-600">{rtoOrders} units</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Actual Sales (Gross - RTO%)</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(actualSales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Expense (Office Management)</span>
                  <span className="font-semibold text-destructive">{formatCurrency(totalExpense)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ads Spend (From Ads Table)</span>
                  <span className="font-medium text-blue-600">{formatCurrency(adsFromTable)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Actual Profit</span>
                  <span className={`font-semibold ${actualProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(actualProfit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Profit/Order</span>
                  <span className={`font-medium ${avgProfitPerOrder >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(avgProfitPerOrder)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Editable Expenses & Targets */}
            <Card>
              <CardHeader>
                <CardTitle>Editable Expenses & Targets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Delivery Cost / Order</Label>
                    <Input
                      type="number"
                      value={editableFields.delivery_cost_per_order}
                      onChange={(e) =>
                        setEditableFields({ ...editableFields, delivery_cost_per_order: +e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RTO Cost / Order (NPR)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editableFields.rto_cost_per_order}
                      onChange={(e) =>
                        setEditableFields({ ...editableFields, rto_cost_per_order: +e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>USD Rate</Label>
                    <Input type="number" value={usdRate} onChange={(e) => setUsdRate(+e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ads (USD) - Manual</Label>
                    <Input
                      type="number"
                      value={editableFields.ads_spent_usd}
                      onChange={(e) =>
                        setEditableFields({ ...editableFields, ads_spent_usd: +e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Staff/Office Cost</Label>
                    <Input
                      type="number"
                      value={editableFields.staff_office_cost}
                      onChange={(e) =>
                        setEditableFields({ ...editableFields, staff_office_cost: +e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Other Expenses</Label>
                    <Input
                      type="number"
                      value={editableFields.other_expenses}
                      onChange={(e) =>
                        setEditableFields({ ...editableFields, other_expenses: +e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-yellow-500" />
                      Target Profit (AI)
                    </Label>
                    <Input
                      type="number"
                      value={editableFields.target_profit}
                      onChange={(e) =>
                        setEditableFields({ ...editableFields, target_profit: +e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-yellow-500" />
                      Target Orders (AI)
                    </Label>
                    <Input
                      type="number"
                      value={editableFields.target_orders}
                      onChange={(e) =>
                        setEditableFields({ ...editableFields, target_orders: +e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Records Table */}
          <Collapsible open={recordsOpen} onOpenChange={setRecordsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <CardTitle>Daily Records (Last 30 Days)</CardTitle>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${recordsOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {!dailyRecords?.length ? (
                    <p className="text-muted-foreground">No saved records yet. Save today's P/L to start tracking.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Units</TableHead>
                            <TableHead className="text-right">Gross Sales</TableHead>
                            <TableHead className="text-right">RTO %</TableHead>
                            <TableHead className="text-right">RTO Orders</TableHead>
                            <TableHead className="text-right">Actual Sales</TableHead>
                            <TableHead className="text-right">Total Expense</TableHead>
                            <TableHead className="text-right">Profit</TableHead>
                            <TableHead className="text-right">ROI</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailyRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">
                                {format(new Date(record.date), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell className="text-right">{record.total_units_sold}</TableCell>
                              <TableCell className="text-right">{formatCurrency(record.gross_sales_value)}</TableCell>
                              <TableCell className="text-right">{record.rto_rate_percent || 0}%</TableCell>
                              <TableCell className="text-right">{record.rto_orders || 0}</TableCell>
                              <TableCell className="text-right text-green-600">
                                {formatCurrency(record.actual_sales || 0)}
                              </TableCell>
                              <TableCell className="text-right text-destructive">
                                {formatCurrency(record.total_expense)}
                              </TableCell>
                              <TableCell
                                className={`text-right font-semibold ${
                                  record.actual_profit >= 0 ? 'text-green-600' : 'text-destructive'
                                }`}
                              >
                                {formatCurrency(record.actual_profit)}
                              </TableCell>
                              <TableCell className="text-right">
                                {(record.roi_ads || 0).toFixed(2)}x
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
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
