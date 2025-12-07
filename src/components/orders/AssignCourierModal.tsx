import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { assignCourier } from '@/services/orderService';

interface AssignCourierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  codAmount: number;
}

const COURIER_PROVIDERS = [
  'NCM',
  'GBL',
  'Pathao',
  'Daraz',
  'Own Delivery',
  'Other',
];

export function AssignCourierModal({
  open,
  onOpenChange,
  orderId,
  codAmount,
}: AssignCourierModalProps) {
  const [courierProvider, setCourierProvider] = useState<string>('');
  const [awbNumber, setAwbNumber] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: () =>
      assignCourier({
        orderId,
        courierProvider,
        awbNumber: awbNumber || undefined,
        trackingCode: trackingCode || undefined,
        notes: notes || undefined,
        portal: 'ADMIN',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-history', orderId] });
      toast.success('Courier assigned successfully');
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign courier: ${error.message}`);
    },
  });

  const resetForm = () => {
    setCourierProvider('');
    setAwbNumber('');
    setTrackingCode('');
    setNotes('');
  };

  const handleSubmit = () => {
    if (!courierProvider) {
      toast.error('Please select a courier provider');
      return;
    }
    assignMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Courier</DialogTitle>
          <DialogDescription>
            Assign this order to a courier service for delivery.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="courier">Select Courier</Label>
            <Select value={courierProvider} onValueChange={setCourierProvider}>
              <SelectTrigger id="courier">
                <SelectValue placeholder="Choose courier..." />
              </SelectTrigger>
              <SelectContent>
                {COURIER_PROVIDERS.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="awb">AWB Number (Optional)</Label>
            <Input
              id="awb"
              value={awbNumber}
              onChange={(e) => setAwbNumber(e.target.value)}
              placeholder="Enter AWB number"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tracking">Tracking ID (Optional)</Label>
            <Input
              id="tracking"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="Enter tracking ID"
            />
          </div>
          <div className="grid gap-2">
            <Label>Expected COD Amount</Label>
            <Input value={`Rs. ${codAmount.toLocaleString()}`} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any delivery notes..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={assignMutation.isPending}>
            {assignMutation.isPending ? 'Assigning...' : 'Assign Courier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}