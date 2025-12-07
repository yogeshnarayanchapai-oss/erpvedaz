import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSendToCourier, useRecommendedCourier, CourierProvider } from '@/hooks/useLogistics';
import { Truck, Loader2, MapPin, Package, Phone, User, Scale } from 'lucide-react';

interface OrderData {
  id: string;
  customerName: string;
  customerPhone: string;
  fullAddress: string;
  codAmount: number;
  productName: string;
  quantity: number;
  deliveryLocation?: string | null;
}

interface SendToCourierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderData | null;
}

const COURIER_INFO: Record<CourierProvider, { name: string; color: string }> = {
  NCM: { name: 'NCM Courier', color: 'bg-blue-500' },
  GBL: { name: 'GBL Logistics', color: 'bg-green-500' },
  PATHAO: { name: 'Pathao Delivery', color: 'bg-orange-500' },
  GAAUBESI: { name: 'Gaaubesi', color: 'bg-purple-500' },
};

export function SendToCourierDialog({ open, onOpenChange, order }: SendToCourierDialogProps) {
  const sendToCourier = useSendToCourier();
  const recommendedCourier = useRecommendedCourier(order?.deliveryLocation || undefined);
  
  const [courier, setCourier] = useState<CourierProvider>('NCM');
  const [weightGrams, setWeightGrams] = useState(500);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    fullAddress: '',
    codAmount: 0,
    productName: '',
    quantity: 1,
  });

  useEffect(() => {
    if (order) {
      setFormData({
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        fullAddress: order.fullAddress || '',
        codAmount: order.codAmount || 0,
        productName: order.productName || '',
        quantity: order.quantity || 1,
      });
      
      // Set recommended courier
      if (recommendedCourier) {
        setCourier(recommendedCourier);
      } else if (order.deliveryLocation === 'INSIDE_VALLEY') {
        setCourier('PATHAO');
      } else {
        setCourier('NCM');
      }
    }
  }, [order, recommendedCourier]);

  const handleSubmit = async () => {
    if (!order) return;

    await sendToCourier.mutateAsync({
      orderId: order.id,
      courier,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      fullAddress: formData.fullAddress,
      codAmount: formData.codAmount,
      productName: formData.productName,
      quantity: formData.quantity,
      weightGrams,
    });

    onOpenChange(false);
  };

  const isValid = formData.customerName && formData.customerPhone && formData.fullAddress;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Send to Courier
          </DialogTitle>
          <DialogDescription>
            Select a courier and verify order details before sending
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Courier Selection */}
          <div className="space-y-2">
            <Label>Select Courier</Label>
            <div className="flex gap-2">
              {(Object.keys(COURIER_INFO) as CourierProvider[]).map((c) => (
                <Button
                  key={c}
                  variant={courier === c ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setCourier(c)}
                >
                  <div className={`w-2 h-2 rounded-full ${COURIER_INFO[c].color} mr-2`} />
                  {COURIER_INFO[c].name}
                  {recommendedCourier === c && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Recommended
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
            {order?.deliveryLocation && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {order.deliveryLocation === 'INSIDE_VALLEY' ? 'Inside Valley' : 'Outside Valley'}
              </p>
            )}
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <User className="w-3 h-3" /> Customer Name
              </Label>
              <Input
                value={formData.customerName}
                onChange={(e) => setFormData(p => ({ ...p, customerName: e.target.value }))}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </Label>
              <Input
                value={formData.customerPhone}
                onChange={(e) => setFormData(p => ({ ...p, customerPhone: e.target.value }))}
                placeholder="98xxxxxxxx"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Full Address
            </Label>
            <Input
              value={formData.fullAddress}
              onChange={(e) => setFormData(p => ({ ...p, fullAddress: e.target.value }))}
              placeholder="Complete delivery address"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Package className="w-3 h-3" /> Product
              </Label>
              <Input
                value={formData.productName}
                onChange={(e) => setFormData(p => ({ ...p, productName: e.target.value }))}
                placeholder="Product name"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={formData.quantity}
                onChange={(e) => setFormData(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Scale className="w-3 h-3" /> Weight (g)
              </Label>
              <Input
                type="number"
                min={100}
                value={weightGrams}
                onChange={(e) => setWeightGrams(parseInt(e.target.value) || 500)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>COD Amount (₹)</Label>
            <Input
              type="number"
              min={0}
              value={formData.codAmount}
              onChange={(e) => setFormData(p => ({ ...p, codAmount: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || sendToCourier.isPending}>
            {sendToCourier.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Truck className="w-4 h-4 mr-2" />
            )}
            Send to {COURIER_INFO[courier].name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
