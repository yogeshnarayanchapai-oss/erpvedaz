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
import { useAddTaskRemark, useTaskRemarks, useCloseTicket } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { AlertCircle, Loader2, MessageSquare, Lock, Plus, Send } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface AddRemarkDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentRemarkId?: string;
  isReply?: boolean;
  defaultIsIssue?: boolean;
  taskAssignedTo?: string | null;
  taskAssignedBy?: string | null;
}

export function AddRemarkDialog({ 
  taskId, 
  open, 
  onOpenChange, 
  parentRemarkId,
  isReply = false,
  defaultIsIssue = false,
  taskAssignedTo,
  taskAssignedBy,
}: AddRemarkDialogProps) {
  const { user } = useAuth();
  const { effectiveRole } = useEffectiveRole();
  const [newTicketText, setNewTicketText] = useState('');
  const [isIssue, setIsIssue] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const addRemark = useAddTaskRemark();
  const closeTicket = useCloseTicket();
  const { data: remarks, isLoading: remarksLoading } = useTaskRemarks(open ? taskId : '');

  useEffect(() => {
    if (!open) return;
    setNewTicketText('');
    setIsIssue(isReply ? false : defaultIsIssue);
    setReplyText('');
    setActiveTicketId(null);
  }, [open, defaultIsIssue, isReply]);

  const isAdminOrManager = ['ADMIN', 'MANAGER', 'OWNER'].includes(effectiveRole);
  const isAssignedStaff = user?.id === taskAssignedTo;
  const canCloseTicket = isAdminOrManager || isAssignedStaff;

  // Check if there are any open tickets
  const openTickets = remarks?.filter((r: any) => r.status === 'OPEN') || [];
  const closedTickets = remarks?.filter((r: any) => r.status === 'CLOSED') || [];
  const hasOpenTickets = openTickets.length > 0;
  const hasAnyTickets = (remarks?.length || 0) > 0;

  // Can create new ticket only if no open tickets exist
  const canCreateNewTicket = !hasOpenTickets;

  const handleNewTicketSubmit = async () => {
    if (!newTicketText.trim()) return;
    await addRemark.mutateAsync({
      taskId,
      remark: newTicketText.trim(),
      isIssue,
      parentRemarkId,
    });
    setNewTicketText('');
    setIsIssue(false);
  };

  const handleReplyInTicket = async (ticketId: string) => {
    if (!replyText.trim()) return;
    await addRemark.mutateAsync({
      taskId,
      remark: replyText.trim(),
      isIssue: false,
      parentRemarkId: ticketId,
    });
    setReplyText('');
  };

  const handleCloseTicket = async (ticketId: string) => {
    await closeTicket.mutateAsync({ remarkId: ticketId, taskId });
  };

  const renderTicket = (ticket: any, isClosed: boolean) => (
    <div key={ticket.id} className={cn(
      "rounded-lg border p-3",
      ticket.is_issue ? "border-destructive/30 bg-destructive/5" : "border-border",
      isClosed && "opacity-60"
    )}>
      {/* Ticket header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{ticket.created_by?.name || 'Unknown'}</span>
          {ticket.is_issue && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground font-bold flex items-center gap-0.5">
              <AlertCircle className="h-3 w-3" /> Issue
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {ticket.created_at ? format(new Date(ticket.created_at), 'MMM d, h:mm a') : ''}
          </span>
        </div>
        <Badge variant={isClosed ? "secondary" : "default"} className="text-[10px] h-5">
          {isClosed ? <><Lock className="h-3 w-3 mr-1" /> Closed</> : 'Open'}
        </Badge>
      </div>

      {/* Ticket initial message */}
      <p className="text-sm text-foreground mb-2">{ticket.remark}</p>

      {/* Conversation thread */}
      {ticket.replies && ticket.replies.length > 0 && (
        <div className="space-y-2 border-l-2 border-muted pl-3 ml-1">
          {ticket.replies.map((reply: any) => (
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

      {/* Reply input for open tickets */}
      {!isClosed && (
        <div className="mt-3 space-y-2">
          {activeTicketId === ticket.id ? (
            <div className="flex gap-2">
              <Textarea
                placeholder="Write a message..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                className="text-xs"
                autoFocus
              />
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  className="shrink-0 h-8"
                  onClick={() => handleReplyInTicket(ticket.id)}
                  disabled={!replyText.trim() || addRemark.isPending}
                >
                  {addRemark.isPending ? '...' : <Send className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-8 text-[10px]"
                  onClick={() => { setActiveTicketId(null); setReplyText(''); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => { setActiveTicketId(ticket.id); setReplyText(''); }}
              >
                <Send className="h-3 w-3 mr-1" /> Reply
              </Button>
              {canCloseTicket && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleCloseTicket(ticket.id)}
                  disabled={closeTicket.isPending}
                >
                  <Lock className="h-3 w-3 mr-1" /> Close Ticket
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Tickets
          </DialogTitle>
        </DialogHeader>

        {remarksLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[50vh] pr-2">
              <div className="space-y-3">
                {/* Open tickets first */}
                {openTickets.map((ticket: any) => renderTicket(ticket, false))}
                
                {/* Closed tickets */}
                {closedTickets.length > 0 && (
                  <>
                    {openTickets.length > 0 && closedTickets.length > 0 && (
                      <div className="text-[10px] text-muted-foreground text-center py-1">— Closed Tickets —</div>
                    )}
                    {closedTickets.map((ticket: any) => renderTicket(ticket, true))}
                  </>
                )}

                {!hasAnyTickets && !canCreateNewTicket && (
                  <p className="text-xs text-muted-foreground text-center py-4">No tickets yet.</p>
                )}
              </div>
            </ScrollArea>

            {/* New ticket form - only when no open tickets */}
            {canCreateNewTicket && (
              <div className="space-y-3 border-t pt-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  {hasAnyTickets ? 'Create a new ticket' : 'Open your first ticket'}
                </p>
                <Textarea
                  placeholder="Describe your issue or remark..."
                  value={newTicketText}
                  onChange={(e) => setNewTicketText(e.target.value)}
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
                  <Button onClick={handleNewTicketSubmit} disabled={!newTicketText.trim() || addRemark.isPending}>
                    {addRemark.isPending ? 'Creating...' : 'Create Ticket'}
                  </Button>
                </div>
              </div>
            )}

            {/* Close button when not creating */}
            {!canCreateNewTicket && (
              <div className="flex justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
