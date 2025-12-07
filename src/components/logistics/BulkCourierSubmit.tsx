import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Truck, Send, X } from 'lucide-react';
import { CourierProvider, useSendToCourier } from '@/hooks/useLogistics';
import { useLogisticsOrders } from '@/hooks/useLogistics';
import { toast } from 'sonner';
import { submitToCourier } from '@/services/courierAPI';

interface BulkCourierSubmitProps {
  selectedOrderIds: string[];
  onComplete: () => void;
}

export function BulkCourierSubmit({ selectedOrderIds, onComplete }: BulkCourierSubmitProps) {
  const [selectedCourier, setSelectedCourier] = useState<CourierProvider | ''>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: allOrders = [] } = useLogisticsOrders();

  const handleBulkSubmit = async () => {
    if (!selectedCourier) {
      toast.error('Please select a courier');
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const orderId of selectedOrderIds) {
        const order = allOrders.find(o => o.id === orderId);
        if (!order) continue;

        try {
          const result = await submitToCourier(selectedCourier, {
            orderId: order.order_id || orderId,
            customerName: order.customer_name,
            customerPhone: order.customer_phone,
            address: order.full_address,
            codAmount: order.cod_amount || 0,
            weight: order.weight_grams,
            productName: order.product_name || '',
            quantity: order.quantity,
          });

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} order(s) submitted to ${selectedCourier} successfully`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} order(s) failed to submit`);
      }

      setShowConfirmDialog(false);
      onComplete();
    } catch (error: any) {
      toast.error(`Bulk submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {selectedOrderIds.length} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onComplete}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Select
                value={selectedCourier}
                onValueChange={(v) => setSelectedCourier(v as CourierProvider)}
              >
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Select Courier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NCM">NCM Courier</SelectItem>
                  <SelectItem value="PATHAO">Pathao</SelectItem>
                  <SelectItem value="GBL">GBL Logistics</SelectItem>
                  <SelectItem value="GAAUBESI">Gaaubesi</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!selectedCourier}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Submit to Courier
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              You are about to submit <strong>{selectedOrderIds.length} order(s)</strong> to{' '}
              <strong>{selectedCourier}</strong>.
            </p>
            <div className="flex items-center gap-2 p-3 bg-info/10 rounded-md">
              <Truck className="w-5 h-5 text-info" />
              <div className="text-sm">
                <p className="font-medium">This will:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-1">
                  <li>Generate AWB numbers</li>
                  <li>Update order status to Dispatched</li>
                  <li>Send data to courier API</li>
                  <li>Create logistics history records</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
