import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Calculator } from 'lucide-react';
import { useDailyRecordMetrics } from '@/hooks/useDailyRecordMetrics';
import { useSaveDailyRecord, DailyRecordInput } from '@/hooks/useDailyRecords';
import { useActiveWarehouses } from '@/hooks/useWarehouses';
import { format } from 'date-fns';

interface Props {
  initialDate?: string;
  initialWarehouse?: string;
  onSaved?: () => void;
}

export function AddDailyRecordDialog({ initialDate, initialWarehouse, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [warehouseId, setWarehouseId] = useState<string>(initialWarehouse || 'all');

  const { data: warehouses } = useActiveWarehouses();
  const { data: metrics, isLoading: metricsLoading } = useDailyRecordMetrics(date, warehouseId !== 'all' ? warehouseId : null);
  const saveMutation = useSaveDailyRecord();

  // Update date/warehouse when initial props change
  useEffect(() => {
    if (initialDate) setDate(initialDate);
    if (initialWarehouse) setWarehouseId(initialWarehouse);
  }, [initialDate, initialWarehouse]);

  // Calculate all derived values
  const sell = metrics?.sell || 0;
  const productCost = metrics?.productCost || 0;
  const productValue = metrics?.productValue || 0;
  const adsSpentNpr = metrics?.adsSpentNpr || 0;
  const totalOrders = metrics?.totalOrders || 0;
  const rtoPercent = metrics?.rtoPercent || 0;

  // RTO = Sell × RTO% / 100
  const rto = Math.round(sell * (rtoPercent / 100));
  // RTO Cost = RTO × 200
  const rtoCost = rto * 200;
  // Staff + Office Cost = Total Orders × 50
  const staffOfficeCost = totalOrders * 50;
  // Actual Sell = Sell − RTO
  const actualSell = sell - rto;
  // Actual Product Cost = Product Cost - (Product Cost × RTO% / 100)
  const actualProductCost = productCost - (productCost * rtoPercent / 100);
  // Delivery Charge = Total Orders × 250
  const deliveryCharge = totalOrders * 250;
  // Redirect Cost = Sell × 20% × 50
  const redirectCost = Math.round(sell * 0.20 * 50);
  // Actual Product Value = productValue (from stock movement OUT)
  const actualProductValue = productValue;
  // P/L = Actual Product Value − Actual Product Cost − Staff+Office Cost − Ads Spent − Delivery Charge − Redirect Cost
  const profitLoss = actualProductValue - actualProductCost - staffOfficeCost - adsSpentNpr - deliveryCharge - redirectCost;

  const handleSave = async () => {
    const input: DailyRecordInput = {
      record_date: date,
      warehouse_id: warehouseId !== 'all' ? warehouseId : null,
      sell,
      ads_spent_npr: adsSpentNpr,
      rto,
      rto_cost: rtoCost,
      staff_office_cost: staffOfficeCost,
      actual_sell: actualSell,
      product_cost: productCost,
      actual_product_cost: actualProductCost,
      product_value: productValue,
      delivery_charge: deliveryCharge,
      redirect_cost: redirectCost,
      actual_product_value: actualProductValue,
      profit_loss: profitLoss,
      rto_percent: rtoPercent,
      total_orders: totalOrders,
    };

    await saveMutation.mutateAsync(input);
    setOpen(false);
    onSaved?.();
  };

  const formatCurrency = (val: number) => `Rs ${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Daily Record
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Add Daily Record
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Date & Warehouse Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
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
            </div>
          </div>

          {metricsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading metrics...</span>
            </div>
          ) : (
            <>
              {/* Calculated Metrics Display */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 p-4 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Sell (Units)</Label>
                  <p className="font-semibold">{sell}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ads Spent (NPR)</Label>
                  <p className="font-semibold text-blue-600">{formatCurrency(adsSpentNpr)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">RTO ({rtoPercent}%)</Label>
                  <p className="font-semibold text-orange-600">{rto}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">RTO Cost</Label>
                  <p className="font-semibold text-orange-600">{formatCurrency(rtoCost)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Staff + Office Cost</Label>
                  <p className="font-semibold">{formatCurrency(staffOfficeCost)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Actual Sell</Label>
                  <p className="font-semibold text-green-600">{actualSell}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Product Cost</Label>
                  <p className="font-semibold text-destructive">{formatCurrency(productCost)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Actual Product Cost</Label>
                  <p className="font-semibold text-destructive">{formatCurrency(actualProductCost)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Product Value</Label>
                  <p className="font-semibold">{formatCurrency(productValue)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Delivery Charge</Label>
                  <p className="font-semibold">{formatCurrency(deliveryCharge)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Redirect Cost</Label>
                  <p className="font-semibold">{formatCurrency(redirectCost)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Actual Product Value</Label>
                  <p className="font-semibold text-green-600">{formatCurrency(actualProductValue)}</p>
                </div>
              </div>

              {/* P/L Summary */}
              <div className={`p-4 rounded-lg border-2 ${profitLoss >= 0 ? 'border-green-500 bg-green-500/10' : 'border-destructive bg-destructive/10'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Profit / Loss (P/L)</span>
                  <span className={`text-2xl font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(profitLoss)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  = Actual Product Value - Actual Product Cost - Staff+Office - Ads - Delivery - Redirect
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || metricsLoading}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Record
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
