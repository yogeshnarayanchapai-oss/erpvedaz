import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useOrderComments, useAddOrderComment } from '@/hooks/useOrderComments';
import { format } from 'date-fns';

interface OrderCommentsSectionProps {
  orderId: string;
}

export function OrderCommentsSection({ orderId }: OrderCommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const { data: comments, isLoading } = useOrderComments(orderId);
  const addComment = useAddOrderComment();

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    
    addComment.mutate(
      { orderId, commentText: newComment },
      {
        onSuccess: () => setNewComment(''),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="flex-1"
          />
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || addComment.isPending}
            size="icon"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading comments...</p>
          ) : !comments || comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {comment.profiles?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.profiles?.name || 'User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm">{comment.comment}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
