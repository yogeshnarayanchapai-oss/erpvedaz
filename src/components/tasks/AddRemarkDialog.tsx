import { useEffect, useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAddTaskRemark, useTaskRemarks } from '@/hooks/useTasks';
import { AlertCircle, Reply, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AddRemarkDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentRemarkId?: string;
  isReply?: boolean;
  defaultIsIssue?: boolean;
}

export function AddRemarkDialog({ 
  taskId, 
  open, 
  onOpenChange, 
  parentRemarkId,
  isReply = false,
  defaultIsIssue = false,
}: AddRemarkDialogProps) {
  const [remark, setRemark] = useState('');
  const [isIssue, setIsIssue] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const addRemark = useAddTaskRemark();
  const { data: remarks, isLoading: remarksLoading } = useTaskRemarks(open ? taskId : '');

  useEffect(() => {
    if (!open) return;
    setRemark('');
    setIsIssue(isReply ? false : defaultIsIssue);
    setReplyingTo(null);
    setReplyText('');
  }, [open, defaultIsIssue, isReply]);

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
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!replyText.trim()) return;
    await addRemark.mutateAsync({
      taskId,
      remark: replyText.trim(),
      isIssue: false,
      parentRemarkId: parentId,
    });
    setReplyText('');
    setReplyingTo(null);
  };

  const hasRemarks = remarks && remarks.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Remarks
          </DialogTitle>
        </DialogHeader>

        {/* Existing remarks */}
        {remarksLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : hasRemarks ? (
          <ScrollArea className="max-h-[40vh] pr-2">
            <div className="space-y-3">
              {remarks.map((r: any) => (
                <div key={r.id} className={cn(
                  "rounded-lg border p-3",
                  r.is_issue ? "border-destructive/30 bg-destructive/5" : "border-border"
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">{r.created_by?.name || 'Unknown'}</span>
                        {r.is_issue && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Issue
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {r.created_at ? format(new Date(r.created_at), 'MMM d, h:mm a') : ''}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{r.remark}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => { setReplyingTo(replyingTo === r.id ? null : r.id); setReplyText(''); }}
                      title="Reply"
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Replies */}
                  {r.replies && r.replies.length > 0 && (
                    <div className="mt-2 ml-4 space-y-2 border-l-2 border-muted pl-3">
                      {r.replies.map((reply: any) => (
                        <div key={reply.id}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-semibold">{reply.created_by?.name || 'Unknown'}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {reply.created_at ? format(new Date(reply.created_at), 'MMM d, h:mm a') : ''}
                            </span>
                          </div>
                          <p className="text-xs text-foreground">{reply.remark}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply input */}
                  {replyingTo === r.id && (
                    <div className="mt-2 ml-4 flex gap-2">
                      <Textarea
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        className="shrink-0 h-auto"
                        onClick={() => handleReplySubmit(r.id)}
                        disabled={!replyText.trim() || addRemark.isPending}
                      >
                        {addRemark.isPending ? '...' : 'Reply'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">No remarks yet</p>
        )}

        {/* Add new remark */}
        <div className="space-y-3 border-t pt-3">
          <Textarea
            placeholder="Enter your remark or issue..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={3}
          />

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isIssue"
              checked={isIssue}
              onCheckedChange={(checked) => setIsIssue(checked as boolean)}
            />
            <Label htmlFor="isIssue" className="flex items-center gap-2 text-sm cursor-pointer">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Mark as Issue
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!remark.trim() || addRemark.isPending}>
              {addRemark.isPending ? 'Adding...' : 'Add Remark'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
