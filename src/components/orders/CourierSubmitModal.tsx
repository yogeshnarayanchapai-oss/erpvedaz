import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Truck } from 'lucide-react';
import { toast } from 'sonner';
import { submitToCourier, type CourierOrderPayload } from '@/services/courierAPI';

interface CourierSubmitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onSubmit: (courier: string) => void;
}

export function CourierSubmitModal({ open, onOpenChange, order, onSubmit }: CourierSubmitModalProps) {
  const [selectedCourier, setSelectedCourier] = useState<'NCM' | 'GBL' | 'PATHAO' | ''>('');
  const [weight, setWeight] = useState(500);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCourier) {
      toast.error('Please select a courier service');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CourierOrderPayload = {
        orderId: order.id,
        customerName: order.leads?.client_name || order.customers?.customer_name || 'Unknown',
        customerPhone: order.leads?.contact_number || order.customers?.phone_number || '',
        address: order.full_address || order.leads?.full_address || '',
        codAmount: order.amount || 0,
        weight,
        productName: order.products?.name,
        quantity: order.quantity || 1,
      };

      const result = await submitToCourier(selectedCourier, payload);

      if (result.success) {
        onSubmit(selectedCourier);
        toast.success(`Order submitted to ${selectedCourier}`);
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to submit order');
      }
    } catch (error: any) {
      toast.error(`Failed to submit order: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Submit to Courier
          </DialogTitle>
          <DialogDescription>
            Select a courier service to handle delivery for Order #{order.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="courier">Courier Service *</Label>
            <Select value={selectedCourier} onValueChange={(v) => setSelectedCourier(v as any)}>
              <SelectTrigger id="courier">
                <SelectValue placeholder="Select courier..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NCM">NCM Express</SelectItem>
                <SelectItem value="GBL">GBL Logistics</SelectItem>
                <SelectItem value="PATHAO">Pathao</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Package Weight (grams)</Label>
            <Input
              id="weight"
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              min={100}
              max={50000}
            />
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{order.leads?.client_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{order.leads?.contact_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">NPR {order.amount?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location:</span>
              <span className="font-medium">
                {order.delivery_location === 'INSIDE_VALLEY' ? 'Inside Valley' : 'Outside Valley'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedCourier}>
            {isSubmitting ? 'Submitting...' : 'Submit Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
