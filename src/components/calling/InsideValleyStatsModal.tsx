import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, CheckCircle, Clock } from 'lucide-react';

interface InsideValleyStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivered: number;
  pending: number;
  dateRange: { from: string; to: string };
}

export function InsideValleyStatsModal({
  open,
  onOpenChange,
  delivered,
  pending,
  dateRange,
}: InsideValleyStatsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Inside Valley Delivery Stats
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-sm text-muted-foreground mb-4">
          Date Range: {dateRange.from} to {dateRange.to}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="font-medium text-success">Delivered</span>
            </div>
            <div className="text-3xl font-bold text-success">{delivered}</div>
            <div className="text-sm text-muted-foreground">Orders completed</div>
          </div>

          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-warning" />
              <span className="font-medium text-warning">Pending</span>
            </div>
            <div className="text-3xl font-bold text-warning">{pending}</div>
            <div className="text-sm text-muted-foreground">Awaiting delivery</div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Inside Valley</span>
            <span className="font-semibold">{delivered + pending}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-muted-foreground">Delivery Rate</span>
            <span className="font-semibold text-success">
              {delivered + pending > 0 
                ? `${((delivered / (delivered + pending)) * 100).toFixed(1)}%` 
                : '0%'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
