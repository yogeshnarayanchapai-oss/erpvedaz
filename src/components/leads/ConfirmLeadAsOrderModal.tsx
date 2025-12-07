import { useState, useEffect } from 'react';
import { Lead } from '@/hooks/useLeads';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBranches } from '@/hooks/useBranches';
import { useProducts } from '@/hooks/useProducts';
import { useConfirmLeadAsOrder } from '@/hooks/useConfirmLeadAsOrder';
import { Loader2, CheckCircle } from 'lucide-react';
import { MultiProductSelector, ProductLine, createEmptyProductLine, calculateGrandTotal, productLinesToOrderItems } from '@/components/orders/MultiProductSelector';

interface ConfirmLeadAsOrderModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ConfirmLeadAsOrderModal({
  lead,
  open,
  onOpenChange,
  onSuccess,
}: ConfirmLeadAsOrderModalProps) {
  const { data: branches = [] } = useBranches();
  const { data: products = [] } = useProducts();
  const confirmMutation = useConfirmLeadAsOrder();

  const [productLines, setProductLines] = useState<ProductLine[]>([createEmptyProductLine()]);
  const [deliveryLocation, setDeliveryLocation] = useState<'INSIDE_VALLEY' | 'OUTSIDE_VALLEY'>('INSIDE_VALLEY');
  const [destinationBranch, setDestinationBranch] = useState<string>('');
  const [fullAddress, setFullAddress] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'COD' | 'PREPAID'>('COD');

  // Initialize form when modal opens with lead data
  useEffect(() => {
    if (lead && open) {
      setDeliveryLocation('INSIDE_VALLEY');
      setDestinationBranch(lead?.destination_branch || '');
      setFullAddress(lead?.full_address || '');
      setPaymentType('COD');
      
      // Pre-fill with lead's product if available
      if (lead.product_id) {
        const product = products.find(p => p.id === lead.product_id);
        if (product) {
          setProductLines([{
            id: crypto.randomUUID(),
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            unit_price: product.sell_price || 0,
            discount: 0,
          }]);
        } else {
          setProductLines([createEmptyProductLine()]);
        }
      } else {
        setProductLines([createEmptyProductLine()]);
      }
    }
  }, [lead, open, products]);

  const handleConfirm = async () => {
    if (!lead) return;

    const validItems = productLines.filter(item => item.product_id);
    if (validItems.length === 0) return;

    const totalAmount = calculateGrandTotal(productLines);

    try {
      await confirmMutation.mutateAsync({
        leadId: lead.id,
        items: productLinesToOrderItems(productLines),
        totalAmount,
        deliveryLocation,
        destinationBranch,
        fullAddress,
        isCod: paymentType === 'COD',
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!lead) return null;

  const totalAmount = calculateGrandTotal(productLines);
  const hasValidProducts = productLines.some(item => item.product_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Confirm Lead as Order
          </DialogTitle>
          <DialogDescription>
            Convert this lead into a confirmed order. Fill in the order details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Info (read-only) */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-muted-foreground text-xs">Customer Name</Label>
              <p className="font-medium">{lead.client_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Phone</Label>
              <p className="font-medium">{lead.contact_number}</p>
            </div>
          </div>

          {/* Multi-Product Selection */}
          <div className="border rounded-lg p-4">
            <MultiProductSelector
              items={productLines}
              onChange={setProductLines}
              disabled={confirmMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Delivery Location</Label>
            <Select value={deliveryLocation} onValueChange={(v) => setDeliveryLocation(v as 'INSIDE_VALLEY' | 'OUTSIDE_VALLEY')}>
              <SelectTrigger>
                <SelectValue placeholder="Select delivery type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INSIDE_VALLEY">Inside Valley</SelectItem>
                <SelectItem value="OUTSIDE_VALLEY">Outside Valley</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Destination Branch</Label>
            <Select value={destinationBranch} onValueChange={setDestinationBranch}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.branch_name}>
                    {branch.branch_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Full Address</Label>
            <Textarea
              id="address"
              placeholder="Enter delivery address"
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Type</Label>
            <Select value={paymentType} onValueChange={(v) => setPaymentType(v as 'COD' | 'PREPAID')}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COD">Cash on Delivery (COD)</SelectItem>
                <SelectItem value="PREPAID">Prepaid / Online Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Order Summary */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <span className="text-lg font-bold text-primary">NPR {totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={confirmMutation.isPending || !hasValidProducts}
          >
            {confirmMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
