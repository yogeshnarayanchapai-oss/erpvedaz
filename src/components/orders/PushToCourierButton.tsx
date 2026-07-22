import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Truck } from 'lucide-react';
import { PushToCourierDialog } from './PushToCourierDialog';

interface Props {
  orderId: string;
  disabled?: boolean;
  alreadyPushed?: boolean;
  variant?: 'icon' | 'menu';
}

export function PushToCourierButton({ orderId, disabled, alreadyPushed, variant = 'icon' }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === 'icon' ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          disabled={disabled || alreadyPushed}
          title={alreadyPushed ? 'Already pushed to courier' : 'Push to Courier'}
        >
          <Truck className="h-4 w-4" />
        </Button>
      ) : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className="w-full text-left"
          disabled={disabled || alreadyPushed}
        >
          <span className="inline-flex items-center"><Truck className="w-4 h-4 mr-2" />Push to Courier</span>
        </button>
      )}
      <PushToCourierDialog open={open} onOpenChange={setOpen} orderId={orderId} />
    </>
  );
}
