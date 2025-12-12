import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect, useCallback } from 'react';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatRoom {
  id: string;
  name: string;
  type: 'GLOBAL' | 'DEPARTMENT' | 'DIRECT';
  created_by: string | null;
  created_at: string;
  store_id: string | null;
  participants: string[] | null;
  is_muted_by: string[] | null;
  role_based_group: string | null;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  store_id: string | null;
  is_read: boolean;
  read_at: string | null;
  read_by: string[] | null;
  file_url: string | null;
  file_type: string | null;
  file_name: string | null;
  mentions: string[] | null;
  is_pinned: boolean;
  pinned_by: string | null;
  pinned_at: string | null;
  sender_name?: string;
  sender_username?: string;
}

export interface StoreUser {
  id: string;
  name: string;
  username: string | null;
  email: string;
  role: string;
}

// Upload file to chat storage
export async function uploadChatFile(file: File, storeId: string): Promise<{ url: string; name: string; type: string } | null> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${storeId}/${user.user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(fileName);

    return {
      url: urlData.publicUrl,
      name: file.name,
      type: file.type,
    };
  } catch (error: any) {
    console.error('File upload error:', error);
    toast.error('Failed to upload file');
    return null;
  }
}

// Default group definitions
export const DEFAULT_GROUPS = [
  { name: 'General', role_based_group: null, type: 'DEPARTMENT' as const },
  { name: 'Marketing', role_based_group: 'MARKETING', type: 'DEPARTMENT' as const },
  { name: 'Sales', role_based_group: 'CALLING,FOLLOWUP', type: 'DEPARTMENT' as const },
  { name: 'Logistics', role_based_group: 'LOGISTICS', type: 'DEPARTMENT' as const },
  { name: 'HR', role_based_group: 'HR', type: 'DEPARTMENT' as const },
];

export function useStoreChatRooms() {
  const storeId = useCurrentStoreId();
  const queryClient = useQueryClient();

  // Subscribe to realtime updates
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel(`chat-rooms-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-rooms', storeId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);

  return useQuery({
    queryKey: ['chat-rooms', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Filter rooms where user is a participant
      const filteredRooms = (data || []).filter((room: ChatRoom) => {
        // GLOBAL rooms are visible to everyone in the store
        if (room.type === 'GLOBAL') return true;
        
        // For DM and DEPARTMENT rooms, check if user is in participants array
        if (room.participants && Array.isArray(room.participants)) {
          return room.participants.includes(user.id);
        }
        
        // If no participants defined, room is visible to creator only
        return room.created_by === user.id;
      });
      
      return filteredRooms as ChatRoom[];
    },
    enabled: !!storeId,
  });
}

export function useStoreChatMessages(roomId: string | null) {
  const queryClient = useQueryClient();

  // Subscribe to realtime updates
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`messages-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
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

      // Get all messages for this room
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set((messages || []).map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, username')
        .in('id', senderIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, { name: p.name, username: p.username }]));

      return ((messages || []) as any[]).map(m => ({
        ...m,
        sender_name: profileMap.get(m.sender_id)?.name || 'Unknown',
        sender_username: profileMap.get(m.sender_id)?.username || null,
      })) as ChatMessage[];
    },
    enabled: !!roomId,
  });
}

export function useSearchMessages(roomId: string | null, searchQuery: string) {
  return useQuery({
    queryKey: ['chat-messages-search', roomId, searchQuery],
    queryFn: async () => {
      if (!roomId || !searchQuery.trim()) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .ilike('message_text', `%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!roomId && searchQuery.length > 2,
  });
}

export function usePinnedMessages(roomId: string | null) {
  return useQuery({
    queryKey: ['chat-pinned-messages', roomId],
    queryFn: async () => {
      if (!roomId) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_pinned', true)
        .order('pinned_at', { ascending: false });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!roomId,
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async ({ 
      roomId, 
      message, 
      fileUrl, 
      fileType, 
      fileName,
      mentions 
    }: { 
      roomId: string; 
      message: string;
      fileUrl?: string;
      fileType?: string;
      fileName?: string;
      mentions?: string[];
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get sender's profile name
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.user.id)
        .single();

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: user.user.id,
          message_text: message,
          store_id: storeId,
          file_url: fileUrl || null,
          file_type: fileType || null,
          file_name: fileName || null,
          mentions: mentions || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Get room info to notify members
      const { data: room } = await supabase
        .from('chat_rooms')
        .select('name, type, participants')
        .eq('id', roomId)
        .single();

      if (room) {
        let notifyUserIds: string[] = [];

        if (room.type === 'DIRECT' && room.participants) {
          // For DMs, notify the other participant
          notifyUserIds = room.participants.filter((id: string) => id !== user.user!.id);
        } else {
          // For group chats, get all users in the store (excluding sender)
          const { data: storeUsers } = await supabase
            .from('user_store_access')
            .select('user_id')
            .eq('store_id', storeId)
            .eq('is_active', true);

          if (storeUsers) {
            notifyUserIds = storeUsers
              .map(u => u.user_id)
              .filter(id => id !== user.user!.id);
          }
        }

        // Check if users have muted this room
        const { data: roomData } = await supabase
          .from('chat_rooms')
          .select('is_muted_by')
          .eq('id', roomId)
          .single();

        const mutedBy = roomData?.is_muted_by || [];
        notifyUserIds = notifyUserIds.filter(id => !mutedBy.includes(id));

        // Create notifications for all room members (except mentioned users who get special notification)
        const mentionedSet = new Set(mentions || []);
        const nonMentionedUsers = notifyUserIds.filter(id => !mentionedSet.has(id));

        if (nonMentionedUsers.length > 0) {
          const notifications = nonMentionedUsers.map(userId => ({
            user_id: userId,
            type: 'CHAT_MESSAGE',
            title: room.type === 'DIRECT' 
              ? `New message from ${senderProfile?.name || 'User'}`
              : `New message in ${room.name}`,
            message: message.substring(0, 100),
            store_id: storeId,
            metadata: { room_id: roomId, message_id: data.id },
          }));

          await supabase.from('notifications').insert(notifications);
        }

        // Create notifications for mentions
        if (mentions && mentions.length > 0) {
          const mentionNotifications = mentions.map(userId => ({
            user_id: userId,
            type: 'MENTION',
            title: 'You were mentioned in a chat',
            message: message.substring(0, 100),
            store_id: storeId,
            metadata: { room_id: roomId, message_id: data.id },
          }));

          await supabase.from('notifications').insert(mentionNotifications);
        }
      }

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
      
      const insertData = {
        name: data.name || 'New Room',
        type: data.type || 'DEPARTMENT',
        created_by: user.user?.id,
        store_id: storeId,
        role_based_group: data.role_based_group || null,
        participants: data.participants || null,
      };

      const { data: result, error } = await supabase
        .from('chat_rooms')
        .insert(insertData)
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

export function useAddRoomParticipants() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ roomId, participantIds }: { roomId: string; participantIds: string[] }) => {
      // First get current participants
      const { data: room, error: fetchError } = await supabase
        .from('chat_rooms')
        .select('participants')
        .eq('id', roomId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Merge new participants with existing ones (deduplicated)
      const currentParticipants = room?.participants || [];
      const allParticipants = [...new Set([...currentParticipants, ...participantIds])];
      
      const { error } = await supabase
        .from('chat_rooms')
        .update({ participants: allParticipants })
        .eq('id', roomId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
      toast.success('Staff added to room');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add staff');
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

export function useMarkMessagesAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ roomId, messageIds }: { roomId: string; messageIds: string[] }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Update read_by array for each message
      for (const messageId of messageIds) {
        const { data: msg } = await supabase
          .from('chat_messages')
          .select('read_by')
          .eq('id', messageId)
          .single();

        const currentReadBy = msg?.read_by || [];
        if (!currentReadBy.includes(user.user.id)) {
          await supabase
            .from('chat_messages')
            .update({
              read_by: [...currentReadBy, user.user.id],
              read_at: new Date().toISOString(),
            })
            .eq('id', messageId);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', variables.roomId] });
    },
  });
}

export function usePinMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ messageId, roomId, pin }: { messageId: string; roomId: string; pin: boolean }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('chat_messages')
        .update({
          is_pinned: pin,
          pinned_by: pin ? user.user?.id : null,
          pinned_at: pin ? new Date().toISOString() : null,
        })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ['chat-pinned-messages', variables.roomId] });
      toast.success(variables.pin ? 'Message pinned' : 'Message unpinned');
    },
  });
}

export function useToggleMuteRoom() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ roomId, mute }: { roomId: string; mute: boolean }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: room } = await supabase
        .from('chat_rooms')
        .select('is_muted_by')
        .eq('id', roomId)
        .single();

      const currentMuted = room?.is_muted_by || [];
      const newMuted = mute
        ? [...currentMuted, user.user.id]
        : currentMuted.filter((id: string) => id !== user.user?.id);

      const { error } = await supabase
        .from('chat_rooms')
        .update({ is_muted_by: newMuted })
        .eq('id', roomId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
  });
}

export function useStoreUsers() {
  const storeId = useCurrentStoreId();
  
  return useQuery({
    queryKey: ['store-users-chat', storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data, error } = await supabase
        .from('user_store_access')
        .select(`
          user_id,
          store_role,
          profiles:user_id(id, name, username, email, role)
        `)
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.profiles?.id,
        name: item.profiles?.name,
        username: item.profiles?.username,
        email: item.profiles?.email,
        role: item.store_role || item.profiles?.role,
      })).filter((u: any) => u.id) as StoreUser[];
    },
    enabled: !!storeId,
  });
}

export function useCreateDMRoom() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  
  return useMutation({
    mutationFn: async ({ targetUserId, targetName }: { targetUserId: string; targetName: string }) => {
      console.log('Creating DM with:', { targetUserId, targetName, storeId });
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      if (!storeId) throw new Error('No store selected');

      // Check if DM room already exists between these two users
      const { data: existingRooms } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('type', 'DIRECT')
        .eq('store_id', storeId);

      // Find existing room where both users are participants
      const existingRoom = existingRooms?.find(room => {
        const participants = room.participants || [];
        return participants.includes(user.user!.id) && participants.includes(targetUserId);
      });

      if (existingRoom) {
        return existingRoom;
      }

      // Get current user profile name
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.user.id)
        .single();

      // Create new DM room with staff names
      const { data: result, error } = await supabase
        .from('chat_rooms')
        .insert({
          name: `${myProfile?.name || 'User'} & ${targetName}`,
          type: 'DIRECT',
          store_id: storeId,
          created_by: user.user.id,
          participants: [user.user.id, targetUserId],
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create DM');
    },
  });
}

export function useEnsureDefaultGroups() {
  const storeId = useCurrentStoreId();
  const createRoom = useCreateChatRoom();
  const { data: rooms } = useStoreChatRooms();
  
  return useMutation({
    mutationFn: async () => {
      if (!storeId || !rooms) return;

      const existingNames = new Set(rooms.map(r => r.name));
      
      for (const group of DEFAULT_GROUPS) {
        if (!existingNames.has(group.name)) {
          await createRoom.mutateAsync({
            name: group.name,
            type: group.type,
            role_based_group: group.role_based_group,
          });
        }
      }
    },
  });
}

// Hook to get unread message count across all rooms
export function useUnreadMessageCount() {
  const storeId = useCurrentStoreId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Subscribe to realtime updates for new messages
  useEffect(() => {
    if (!storeId || !user?.id) return;

    const channel = supabase
      .channel(`unread-messages-${storeId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-count', storeId, user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-count', storeId, user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, user?.id, queryClient]);

  return useQuery({
    queryKey: ['unread-count', storeId, user?.id],
    queryFn: async () => {
      if (!storeId || !user?.id) return 0;

      // Get all rooms for this store (including DM rooms where user is participant)
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('id')
        .or(`store_id.eq.${storeId},participants.cs.{${user.id}}`);

      if (!rooms || rooms.length === 0) return 0;

      const roomIds = rooms.map(r => r.id);

      // Count messages not read by this user (where sender is not current user)
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('id, read_by, sender_id')
        .in('room_id', roomIds)
        .neq('sender_id', user.id);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      // Count messages where current user is not in read_by array
      const unreadCount = (messages || []).filter(msg => {
        const readBy = msg.read_by || [];
        return !readBy.includes(user.id);
      }).length;

      return unreadCount;
    },
    enabled: !!storeId && !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds as backup
  });
}

// Hook to get unread count per room
export function useUnreadCountPerRoom() {
  const storeId = useCurrentStoreId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Subscribe to realtime updates
  useEffect(() => {
    if (!storeId || !user?.id) return;

    const channel = supabase
      .channel(`unread-per-room-${storeId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-per-room', storeId, user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, user?.id, queryClient]);

  return useQuery({
    queryKey: ['unread-per-room', storeId, user?.id],
    queryFn: async () => {
      if (!storeId || !user?.id) return {};

      // Get all rooms (including DM rooms where user is participant)
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('id')
        .or(`store_id.eq.${storeId},participants.cs.{${user.id}}`);

      if (!rooms || rooms.length === 0) return {};

      const roomIds = rooms.map(r => r.id);

      // Get all messages not sent by current user
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id, room_id, read_by, sender_id')
        .in('room_id', roomIds)
        .neq('sender_id', user.id);

      // Count unread per room
      const unreadPerRoom: Record<string, number> = {};
      (messages || []).forEach(msg => {
        const readBy = msg.read_by || [];
        if (!readBy.includes(user.id)) {
          unreadPerRoom[msg.room_id] = (unreadPerRoom[msg.room_id] || 0) + 1;
        }
      });

      return unreadPerRoom;
    },
    enabled: !!storeId && !!user?.id,
  });
}

// Hook to mark all messages in a room as read
export function useMarkRoomAsRead() {
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (roomId: string) => {
      if (!user?.id) return;

      // Get all unread messages in this room
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id, read_by')
        .eq('room_id', roomId)
        .neq('sender_id', user.id);

      if (!messages || messages.length === 0) return;

      // Update each message to add current user to read_by
      for (const msg of messages) {
        const currentReadBy = msg.read_by || [];
        if (!currentReadBy.includes(user.id)) {
          await supabase
            .from('chat_messages')
            .update({
              read_by: [...currentReadBy, user.id],
              read_at: new Date().toISOString(),
            })
            .eq('id', msg.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['unread-per-room'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
}
