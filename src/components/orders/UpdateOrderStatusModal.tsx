import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { updateOrderStatus, OrderStatus, PaymentStatus } from '@/services/orderService';

interface UpdateOrderStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  currentOrderStatus: string;
  currentPaymentStatus: string;
}

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'DISPATCHED',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
  'REDIRECT',
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  'PENDING',
  'PAID',
  'COD',
];

export function UpdateOrderStatusModal({
  open,
  onOpenChange,
  orderId,
  currentOrderStatus,
  currentPaymentStatus,
}: UpdateOrderStatusModalProps) {
  // Default to valid values if current status is null/undefined
  const [orderStatus, setOrderStatus] = useState<string>(currentOrderStatus || 'CONFIRMED');
  const [paymentStatus, setPaymentStatus] = useState<string>(currentPaymentStatus || 'PENDING');
  const queryClient = useQueryClient();

  // Update state when props change (e.g., when modal opens with new order)
  useEffect(() => {
    if (open) {
      setOrderStatus(currentOrderStatus || 'CONFIRMED');
      setPaymentStatus(currentPaymentStatus || 'PENDING');
    }
  }, [open, currentOrderStatus, currentPaymentStatus]);

  const updateMutation = useMutation({
    mutationFn: () => {
      // Validate values before sending
      const validOrderStatus = orderStatus && ORDER_STATUSES.includes(orderStatus as OrderStatus) 
        ? orderStatus as OrderStatus 
        : undefined;
      const validPaymentStatus = paymentStatus && PAYMENT_STATUSES.includes(paymentStatus as PaymentStatus)
        ? paymentStatus as PaymentStatus
        : undefined;
      
      if (!validOrderStatus && !validPaymentStatus) {
        throw new Error('Please select at least one status to update');
      }
      
      return updateOrderStatus({
        orderId,
        orderStatus: validOrderStatus,
        paymentStatus: validPaymentStatus,
        portal: 'ADMIN',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-history', orderId] });
      toast.success('Order status updated successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            Change the order and payment status for this order.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="order-status">Order Status</Label>
            <Select value={orderStatus} onValueChange={setOrderStatus}>
              <SelectTrigger id="order-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment-status">Payment Status</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger id="payment-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}