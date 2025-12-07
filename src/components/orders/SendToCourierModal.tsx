import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Truck } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  leads?: { client_name: string; contact_number: string; full_address: string | null } | null;
  amount: number | null;
  delivery_location: string | null;
}

interface SendToCourierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
  onSubmit: () => void;
}

export function SendToCourierModal({ open, onOpenChange, orders, onSubmit }: SendToCourierModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Placeholder for courier API integration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`${orders.length} order(s) prepared for courier submission`);
      onSubmit();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to submit orders to courier');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Submit to Courier
          </DialogTitle>
          <DialogDescription>
            Review {orders.length} order(s) before submitting to courier service
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{order.leads?.client_name || 'Unknown Customer'}</p>
                    <p className="text-sm text-muted-foreground">{order.leads?.contact_number}</p>
                  </div>
                  <Badge variant="secondary">
                    NPR {order.amount?.toLocaleString() || 0}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {order.leads?.full_address || 'No address provided'}
                </p>
                {order.delivery_location && (
                  <Badge variant="outline" className="text-xs">
                    {order.delivery_location.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Total: {orders.length} order(s)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
