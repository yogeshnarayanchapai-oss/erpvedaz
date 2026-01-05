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
import { Task, useTaskRemarks, useTaskStatusHistory } from '@/hooks/useTasks';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import {
  Clock,
  User,
  Calendar,
  AlertCircle,
  MessageSquare,
  History,
} from 'lucide-react';

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailSheet({ task, open, onOpenChange }: TaskDetailSheetProps) {
  const { data: remarks } = useTaskRemarks(task?.id || '');
  const { data: statusHistory } = useTaskStatusHistory(task?.id || '');

  if (!task) return null;

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
                  <div
                    key={remark.id}
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
