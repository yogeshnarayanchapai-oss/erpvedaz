import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useRefreshCourierStatus } from '@/hooks/useRefreshCourierStatus';

interface Props {
  orderId: string;
  disabled?: boolean;
}

export function RefreshCourierStatusButton({ orderId, disabled }: Props) {
  const refresh = useRefreshCourierStatus();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => { e.stopPropagation(); refresh.mutate(orderId); }}
      disabled={disabled || refresh.isPending}
      title="Refresh courier status"
    >
      <RefreshCw className={`h-4 w-4 ${refresh.isPending ? 'animate-spin' : ''}`} />
    </Button>
  );
}
