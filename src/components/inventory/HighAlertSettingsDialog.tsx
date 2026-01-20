import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const QUICK_SELECT_DAYS = [3, 7, 10, 14, 30];

interface HighAlertSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDays: number | null;
  onApply: (days: number) => void;
}

export function HighAlertSettingsDialog({
  open,
  onOpenChange,
  currentDays,
  onApply,
}: HighAlertSettingsDialogProps) {
  const [days, setDays] = useState<number>(currentDays || 7);

  const handleApply = () => {
    if (days >= 1 && days <= 60) {
      onApply(days);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>High Alert Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="highAlertDays">High Alert Days</Label>
            <Input
              id="highAlertDays"
              type="number"
              min={1}
              max={60}
              value={days}
              onChange={(e) => setDays(Math.min(60, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Products with less than {days} days of stock cover (based on avg daily out) will be marked as High Alert.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_SELECT_DAYS.map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={days === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDays(d)}
                >
                  {d} days
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
