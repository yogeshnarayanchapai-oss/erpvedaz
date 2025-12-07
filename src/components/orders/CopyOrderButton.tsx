import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { generateOrderSummary, copyToClipboard, OrderSummaryInput } from '@/lib/orderSummary';
import { toast } from 'sonner';

interface OrderItem {
  product_name: string;
  quantity: number;
}

interface CopyOrderButtonProps {
  customerName: string;
  phone: string;
  address: string;
  orderItems: OrderItem[];
  totalAmount: number;
  paymentMethod: string;
  orderBy: string;
  deliveryLocation?: string;
  branch?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function CopyOrderButton({
  customerName,
  phone,
  address,
  orderItems,
  totalAmount,
  paymentMethod,
  orderBy,
  deliveryLocation,
  branch,
  variant = 'outline',
  size = 'default',
  className = '',
}: CopyOrderButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const input: OrderSummaryInput = {
      customerName,
      phone,
      address,
      products: orderItems.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
      })),
      totalAmount,
      paymentMethod,
      orderBy,
      deliveryLocation,
      branch,
    };

    const summary = generateOrderSummary(input);
    const success = await copyToClipboard(summary);

    if (success) {
      setCopied(true);
      toast.success('Order summary copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleCopy}
            className={className}
          >
            {copied ? (
              <Check className="h-4 w-4 mr-2 text-success" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {size !== 'icon' && (copied ? 'Copied!' : 'Copy Order')}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copies compact order summary for WhatsApp/Notes</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
