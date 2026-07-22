import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Truck, ExternalLink } from 'lucide-react';
import { useConnectedCouriers } from '@/hooks/useConnectedCouriers';
import { usePushToCourier } from '@/hooks/usePushToCourier';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orderId: string | null;
  onSuccess?: () => void;
}

export function PushToCourierDialog({ open, onOpenChange, orderId, onSuccess }: Props) {
  const navigate = useNavigate();
  const { data: couriers = [], isLoading } = useConnectedCouriers();
  const [selected, setSelected] = useState<string>('');
  const push = usePushToCourier();

  const handlePush = async () => {
    if (!orderId || !selected) return;
    try {
      await push.mutateAsync({ orderId, courier: selected as any });
      onOpenChange(false);
      onSuccess?.();
      setSelected('');
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" /> Push to Courier
          </DialogTitle>
          <DialogDescription>
            Choose a connected courier. Only couriers with an active API connection are shown.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading couriers…</p>
        ) : couriers.length === 0 ? (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>No courier API is connected.</span>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/logistics-settings')}>
                <ExternalLink className="w-3 h-3 mr-1" /> Connect
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <RadioGroup value={selected} onValueChange={setSelected} className="py-2">
            {couriers.map((c) => (
              <div key={c.id} className="flex items-center space-x-2 border rounded p-3">
                <RadioGroupItem value={c.courier} id={c.id} />
                <Label htmlFor={c.id} className="cursor-pointer flex-1">{c.label}</Label>
              </div>
            ))}
          </RadioGroup>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePush} disabled={!selected || push.isPending}>
            {push.isPending ? 'Pushing…' : 'Push'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
