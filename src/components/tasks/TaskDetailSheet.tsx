import { useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Task, useTaskRemarks, useTaskStatusHistory, useTaskAttachments, useAddTaskAttachment, useAddTaskRemark } from '@/hooks/useTasks';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import {
  Clock,
  User,
  Calendar,
  AlertCircle,
  MessageSquare,
  History,
  Link2,
  Plus,
  Reply,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailSheet({ task, open, onOpenChange }: TaskDetailSheetProps) {
  const { data: remarks } = useTaskRemarks(task?.id || '');
  const { data: statusHistory } = useTaskStatusHistory(task?.id || '');
  const { data: attachments } = useTaskAttachments(task?.id || '');
  const addAttachment = useAddTaskAttachment();
  const addRemark = useAddTaskRemark();
  const { effectiveRole } = useEffectiveRole();

  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkName, setNewLinkName] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const canReply = ['ADMIN', 'MANAGER', 'HR', 'OWNER'].includes(effectiveRole);

  if (!task) return null;

  const handleAddLink = async () => {
    if (!newLinkUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      await addAttachment.mutateAsync({
        taskId: task.id,
        url: newLinkUrl.trim(),
        fileName: newLinkName.trim() || newLinkUrl.trim(),
      });
      setNewLinkUrl('');
      setNewLinkName('');
      setShowAddLink(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleReply = async (parentRemarkId: string) => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    try {
      await addRemark.mutateAsync({
        taskId: task.id,
        remark: replyText.trim(),
        isIssue: false,
        parentRemarkId,
      });
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-left">{task.title}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] pr-4 mt-4">
          <div className="space-y-6">
            {/* Status & Priority */}
            <div className="flex items-center gap-2 flex-wrap">
              <TaskStatusBadge status={task.status} />
              <TaskPriorityBadge priority={task.priority} />
              {task.has_issues && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Has Issues
                </Badge>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Description
                </h4>
                <p className="text-sm">{task.description}</p>
              </div>
            )}

            {/* Task Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Assigned To</p>
                  <p className="font-medium">{task.assigned_to?.name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Assigned By</p>
                  <p className="font-medium">{task.assigned_by?.name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Due Date</p>
                  <p className="font-medium">
                    {format(new Date(task.due_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Created</p>
                  <p className="font-medium">
                    {format(new Date(task.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Attachments & Links */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Link2 className="h-4 w-4" />
                  Links & Attachments
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddLink(!showAddLink)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Link
                </Button>
              </div>

              {showAddLink && (
                <div className="space-y-2 mb-3 p-3 bg-muted/50 rounded-lg">
                  <Input
                    placeholder="URL (e.g., https://...)"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                  />
                  <Input
                    placeholder="Display name (optional)"
                    value={newLinkName}
                    onChange={(e) => setNewLinkName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddLink}
                      disabled={addAttachment.isPending}
                    >
                      {addAttachment.isPending ? 'Adding...' : 'Add'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddLink(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {attachments?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No attachments yet</p>
                )}
                {attachments?.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-2"
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex-1 truncate"
                    >
                      {attachment.file_name}
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {attachment.uploaded_by?.name || 'Unknown'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Status History */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-medium mb-3">
                <History className="h-4 w-4" />
                Status History
              </h4>
              <div className="space-y-3">
                {statusHistory?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No status changes yet</p>
                )}
                {statusHistory?.map((history) => (
                  <div
                    key={history.id}
                    className="flex items-start gap-3 text-sm bg-muted/50 rounded-lg p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {history.old_status && (
                          <>
                            <TaskStatusBadge status={history.old_status} className="text-xs" />
                            <span className="text-muted-foreground">→</span>
                          </>
                        )}
                        <TaskStatusBadge status={history.new_status} className="text-xs" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        by {history.changed_by?.name || 'System'} •{' '}
                        {format(new Date(history.changed_at), 'MMM dd, hh:mm a')}
                      </p>
                      {history.notes && (
                        <p className="text-xs mt-1">{history.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Remarks */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-medium mb-3">
                <MessageSquare className="h-4 w-4" />
                Remarks & Issues
              </h4>
              <div className="space-y-3">
                {remarks?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No remarks yet</p>
                )}
                {remarks?.map((remark) => (
                  <div key={remark.id} className="space-y-2">
                    {/* Parent Remark */}
                    <div
                      className={`text-sm rounded-lg p-3 ${
                        remark.is_issue
                          ? 'bg-red-500/10 border border-red-500/20'
                          : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {remark.is_issue && (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className="font-medium text-xs">
                          {remark.created_by?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(remark.created_at), 'MMM dd, hh:mm a')}
                        </span>
                      </div>
                      <p className="text-sm">{remark.remark}</p>

                      {/* Reply Button (for Admin/Manager/HR) */}
                      {canReply && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 text-xs"
                          onClick={() => setReplyingTo(replyingTo === remark.id ? null : remark.id)}
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                      )}

                      {/* Reply Input */}
                      {replyingTo === remark.id && (
                        <div className="mt-2 space-y-2">
                          <Input
                            placeholder="Write your reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7"
                              onClick={() => handleReply(remark.id)}
                              disabled={addRemark.isPending}
                            >
                              {addRemark.isPending ? 'Sending...' : 'Send'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Replies */}
                    {remark.replies && remark.replies.length > 0 && (
                      <div className="ml-4 space-y-2 border-l-2 border-muted pl-3">
                        {remark.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="text-sm rounded-lg p-2 bg-primary/5"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Reply className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium text-xs">
                                {reply.created_by?.name || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(reply.created_at), 'MMM dd, hh:mm a')}
                              </span>
                            </div>
                            <p className="text-sm">{reply.remark}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}