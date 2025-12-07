import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { submitOrdersToCourier } from '@/services/courierSubmissionService';

interface SubmitToCourierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrderIds: string[];
  onSuccess?: () => void;
}

export function SubmitToCourierModal({
  open,
  onOpenChange,
  selectedOrderIds,
  onSuccess,
}: SubmitToCourierModalProps) {
  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [deliveryInstruction, setDeliveryInstruction] = useState('');
  const queryClient = useQueryClient();

  // Fetch couriers
  const { data: couriers = [], isLoading: loadingCouriers } = useQuery({
    queryKey: ['couriers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('is_active', true)
        .order('display_name');
      
      if (error) throw error;
      return data;
    },
  });

  const selectedCourier = couriers.find(c => c.id === selectedCourierId);

  const submitMutation = useMutation({
    mutationFn: () =>
      submitOrdersToCourier({
        orderIds: selectedOrderIds,
        courierId: selectedCourierId,
        deliveryInstruction,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-history'] });
      
      const successCount = result.results.filter(r => r.success).length;
      const failCount = result.results.filter(r => !r.success).length;
      
      if (failCount === 0) {
        toast.success(`Successfully submitted ${successCount} order(s) to ${result.courierName}`);
      } else {
        toast.warning(`Submitted ${successCount} order(s) to ${result.courierName}. ${failCount} failed.`);
      }
      
      onOpenChange(false);
      onSuccess?.();
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit orders: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedCourierId('');
    setDeliveryInstruction('');
  };

  const handleSubmit = () => {
    if (!selectedCourierId) {
      toast.error('Please select a courier');
      return;
    }
    
    if (!selectedCourier?.is_api_connected) {
      toast.error('API not connected for this courier');
      return;
    }
    
    submitMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit to Courier</DialogTitle>
          <DialogDescription>
            Submit {selectedOrderIds.length} order(s) to courier service
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="courier">Select Courier *</Label>
            <Select 
              value={selectedCourierId} 
              onValueChange={setSelectedCourierId}
              disabled={loadingCouriers}
            >
              <SelectTrigger id="courier">
                <SelectValue placeholder="Choose courier..." />
              </SelectTrigger>
              <SelectContent>
                {couriers.map((courier) => (
                  <SelectItem key={courier.id} value={courier.id}>
                    {courier.display_name}
                    {!courier.is_api_connected && ' (Not Connected)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCourier && !selectedCourier.is_api_connected && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                API not connected for this courier. Please connect API from Courier Settings first.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="instruction">Delivery Instruction (Optional)</Label>
            <Textarea
              id="instruction"
              value={deliveryInstruction}
              onChange={(e) => setDeliveryInstruction(e.target.value)}
              placeholder="Add any delivery instructions..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {selectedCourier && !selectedCourier.is_api_connected && (
            <Button
              variant="outline"
              onClick={() => {
                // Navigate to courier settings
                window.location.href = '/admin/logistics/settings';
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect API
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={
                submitMutation.isPending || 
                !selectedCourierId || 
                !selectedCourier?.is_api_connected
              }
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
