import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { playNotificationSound } from '@/lib/notificationSound';
import { toast } from 'sonner';

export type NotificationType = 
  | 'LEAD_TRANSFER'
  | 'ORDER_CONFIRMED'
  | 'ORDER_REDIRECTED'
  | 'DELIVERY_UPDATED'
  | 'LEAD_CNR'
  | 'LEAD_FOLLOWUP'
  | 'LEAD_CANCELLED'
  | 'LOGISTICS_EXPORTED'
  | 'SYSTEM';

export interface Notification {
  id: string;
  created_at: string;
  type: string;
  title: string;
  message: string;
  actor_id: string | null;
  actor_name: string | null;
  target_role: string | null;
  target_user_id: string | null;
  portal: string | null;
  link_path: string | null;
  read_at: string | null;
  meta: Record<string, any> | null;
  store_id: string | null;
}

export interface CreateNotificationParams {
  type: NotificationType | string;
  title: string;
  message: string;
  actorId?: string;
  actorName?: string;
  targetRole?: string;
  targetUserId?: string;
  portal?: string;
  linkPath?: string;
  meta?: Record<string, any>;
  storeId?: string;
}

export function useNotifications() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [hasInteracted, setHasInteracted] = useState(false);

  // Track user interaction for audio
  useEffect(() => {
    const enableAudio = () => setHasInteracted(true);
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });
    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
    };
  }, []);

  // Fetch notifications for current user/role
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', profile?.id, profile?.role],
    queryFn: async () => {
      if (!profile?.id) return [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`target_user_id.eq.${profile.id},target_role.eq.${profile.role}`)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!profile?.id,
    refetchInterval: 60000, // Refetch every minute as backup
  });

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read_at).length;

  // Get latest notifications for dropdown
  const latestNotifications = notifications.slice(0, 20);

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      
      const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!profile?.id || !profile?.role) return;

    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Check if this notification is for the current user
          const isForCurrentUser = 
            newNotification.target_user_id === profile.id ||
            newNotification.target_role === profile.role;

          if (isForCurrentUser) {
            // Play sound if user has interacted
            if (hasInteracted) {
              playNotificationSound();
            }

            // Show toast
            toast.info(newNotification.title, {
              description: newNotification.message,
              duration: 5000,
              action: newNotification.link_path ? {
                label: 'View',
                onClick: () => {
                  window.location.href = newNotification.link_path!;
                },
              } : undefined,
            });

            // Update cache
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role, hasInteracted, queryClient]);

  return {
    notifications,
    latestNotifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}

// Utility function to create notifications (used from other parts of the app)
export async function createNotification(params: CreateNotificationParams) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      type: params.type,
      title: params.title,
      message: params.message,
      actor_id: params.actorId,
      actor_name: params.actorName,
      target_role: params.targetRole,
      target_user_id: params.targetUserId,
      portal: params.portal,
      link_path: params.linkPath,
      meta: params.meta || {},
      store_id: params.storeId || null,
    });

  if (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

// Create multiple notifications at once (e.g., to multiple roles)
export async function createNotifications(notificationsList: CreateNotificationParams[]) {
  const inserts = notificationsList.map(params => ({
    type: params.type,
    title: params.title,
    message: params.message,
    actor_id: params.actorId,
    actor_name: params.actorName,
    target_role: params.targetRole,
    target_user_id: params.targetUserId,
    portal: params.portal,
    link_path: params.linkPath,
    meta: params.meta || {},
    store_id: params.storeId || null,
  }));

  const { error } = await supabase.from('notifications').insert(inserts);

  if (error) {
    console.error('Failed to create notifications:', error);
    throw error;
  }
}
