import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type OrderCommentRow = Database['public']['Tables']['order_comments']['Row'];

export interface OrderComment extends OrderCommentRow {
  profiles?: {
    name: string;
    email: string;
  } | null;
}

export function useOrderComments(orderId: string) {
  return useQuery({
    queryKey: ['order-comments', orderId],
    queryFn: async () => {
      // First get the comments
      const { data: comments, error: commentsError } = await supabase
        .from('order_comments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;
      if (!comments) return [];

      // Then get profile info for each user
      const userIds = comments.map(c => c.user_id).filter(Boolean) as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      // Combine the data
      return comments.map(comment => ({
        ...comment,
        profiles: profiles?.find(p => p.id === comment.user_id) || null,
      })) as OrderComment[];
    },
    enabled: !!orderId,
  });
}

export function useAddOrderComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, commentText }: { orderId: string; commentText: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('order_comments')
        .insert({
          order_id: orderId,
          user_id: user.id,
          comment: commentText,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order-comments', variables.orderId] });
      toast.success('Comment added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });
}
