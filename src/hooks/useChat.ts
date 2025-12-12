import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export interface ChatRoom {
  id: string;
  name: string;
  type: 'GLOBAL' | 'DEPARTMENT' | 'DIRECT';
  created_by: string | null;
  created_at: string;
  store_id: string | null;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  sender_name?: string;
}

export function useChatRooms() {
  const storeId = useCurrentStoreId();

  return useQuery({
    queryKey: ['chat-rooms', storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as ChatRoom[];
    },
    enabled: !!storeId,
  });
}

export function useChatMessages(roomId: string | null) {
  const queryClient = useQueryClient();

  // Subscribe to realtime updates
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`messages-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', roomId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);

  return useQuery({
    queryKey: ['chat-messages', roomId],
    queryFn: async () => {
      if (!roomId) return [];

      // Get messages
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      // Get sender names from profiles
      const senderIds = [...new Set((messages || []).map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', senderIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p.name]));

      return ((messages || []) as any[]).map(m => ({
        ...m,
        sender_name: profileMap.get(m.sender_id) || 'Unknown'
      })) as ChatMessage[];
    },
    enabled: !!roomId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async ({ roomId, message }: { roomId: string; message: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: user.user.id,
          message_text: message,
          store_id: storeId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', variables.roomId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send message');
    },
  });
}

export function useCreateChatRoom() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async (data: Partial<ChatRoom>) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from('chat_rooms')
        .insert({
          name: data.name || 'New Room',
          type: data.type || 'DEPARTMENT',
          created_by: user.user?.id,
          store_id: storeId,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
      toast.success('Chat room created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create chat room');
    },
  });
}

export function useDeleteChatRoom() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('chat_rooms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
      toast.success('Chat room deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete chat room');
    },
  });
}