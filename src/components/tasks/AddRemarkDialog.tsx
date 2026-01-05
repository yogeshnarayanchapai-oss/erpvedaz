import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAddTaskRemark } from '@/hooks/useTasks';
import { AlertCircle } from 'lucide-react';

interface AddRemarkDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentRemarkId?: string;
  isReply?: boolean;
}

export function AddRemarkDialog({ 
  taskId, 
  open, 
  onOpenChange, 
  parentRemarkId,
  isReply = false,
}: AddRemarkDialogProps) {
  const [remark, setRemark] = useState('');
  const [isIssue, setIsIssue] = useState(false);
  const addRemark = useAddTaskRemark();

  const handleSubmit = async () => {
    if (!remark.trim()) return;

    await addRemark.mutateAsync({
      taskId,
      remark: remark.trim(),
      isIssue: isReply ? false : isIssue,
      parentRemarkId,
    });

    setRemark('');
    setIsIssue(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isReply ? 'Reply to Remark' : 'Add Remark'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Textarea
              placeholder={isReply ? "Enter your reply..." : "Enter your remark or issue..."}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={4}
            />
          </div>

          {!isReply && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isIssue"
                checked={isIssue}
                onCheckedChange={(checked) => setIsIssue(checked as boolean)}
              />
              <Label
                htmlFor="isIssue"
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <AlertCircle className="h-4 w-4 text-red-500" />
                Mark as Issue
              </Label>
            </div>
          )}

          {!isReply && (
            <p className="text-xs text-muted-foreground">
              Issues will be highlighted and notify the manager immediately.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!remark.trim() || addRemark.isPending}
            >
              {addRemark.isPending ? (isReply ? 'Sending...' : 'Adding...') : (isReply ? 'Send Reply' : 'Add Remark')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}