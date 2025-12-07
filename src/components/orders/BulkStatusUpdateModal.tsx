import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];

interface BulkStatusUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: string[];
  onSuccess?: () => void;
}

const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
];

export function BulkStatusUpdateModal({ 
  open, 
  onOpenChange, 
  selectedOrders,
  onSuccess 
}: BulkStatusUpdateModalProps) {
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [note, setNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!newStatus) {
      toast.error('Please select a status');
      return;
    }

    if (selectedOrders.length === 0) {
      toast.error('No orders selected');
      return;
    }

    setIsUpdating(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const orderId of selectedOrders) {
        const { error } = await supabase
          .from('orders')
          .update({ 
            order_status: newStatus as OrderStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (error) {
          failCount++;
          console.error(`Failed to update order ${orderId}:`, error);
        } else {
          successCount++;
          
          // Log to order history
          await supabase.from('order_history').insert({
            order_id: orderId,
            event_type: 'STATUS_CHANGE',
            old_value: null,
            new_value: newStatus,
            description: `Bulk status update to ${newStatus}${note ? `. Note: ${note}` : ''}`,
            portal: 'ADMIN',
          });
        }
      }

      if (successCount > 0) {
        toast.success(`Updated ${successCount} order(s) to ${newStatus}`);
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        onSuccess?.();
        onOpenChange(false);
        setNewStatus('');
        setNote('');
      }
      
      if (failCount > 0) {
        toast.error(`Failed to update ${failCount} order(s)`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Bulk Status Update
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedOrders.length}</Badge>
            <span className="text-sm text-muted-foreground">orders selected</span>
          </div>

          <div className="space-y-2">
            <Label>New Status *</Label>
            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as OrderStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Note (Optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for this bulk update..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={isUpdating || !newStatus}
          >
            {isUpdating ? 'Updating...' : `Update ${selectedOrders.length} Orders`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
