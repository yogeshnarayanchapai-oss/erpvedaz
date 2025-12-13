import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
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
  | 'SYSTEM'
  // HRM notification types
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'LEAVE_REQUEST'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'LEAVE_STATUS'
  | 'ATTENDANCE'
  | 'PAYROLL_CREATED'
  | 'PAYROLL_PAID'
  | 'LEAVE_QUOTA_UPDATED'
  | 'ASSET_ASSIGNED'
  | 'NOTICE_PUBLISHED';

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
  const { currentStore } = useCurrentStore();
  const queryClient = useQueryClient();
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const isOwner = profile?.role === 'OWNER';

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

  // Fetch notifications for current user/role - RLS handles store filtering
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', profile?.id, profile?.role, currentStore?.id, isOwner],
    queryFn: async () => {
      if (!profile?.id) return [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // RLS policies handle store filtering automatically
      // Just filter by user/role and RLS takes care of the rest
      let query = supabase
        .from('notifications')
        .select('*')
        .or(`target_user_id.eq.${profile.id},target_role.eq.${profile.role}`)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      // For OWNER viewing a specific store, filter to that store's notifications
      if (isOwner && currentStore?.id) {
        query = query.eq('store_id', currentStore.id);
      }

      const { data, error } = await query;

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

  // Realtime subscription with store-specific channel
  useEffect(() => {
    if (!profile?.id || !profile?.role) return;

    // Create store-specific channel name to scope subscriptions
    const channelName = isOwner 
      ? `notifications-owner-${profile.id}-${currentStore?.id || 'all'}`
      : `notifications-${currentStore?.id || 'no-store'}-${profile.id}`;

    const subscriptionConfig: any = {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
    };

    // Add store_id filter for non-owners with a store context
    if (!isOwner && currentStore?.id) {
      subscriptionConfig.filter = `store_id=eq.${currentStore.id}`;
    } else if (isOwner && currentStore?.id) {
      // OWNER viewing specific store - filter to that store
      subscriptionConfig.filter = `store_id=eq.${currentStore.id}`;
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', subscriptionConfig, (payload) => {
        const newNotification = payload.new as Notification;
        
        // Check if this notification is for the current user
        const isForCurrentUser = 
          newNotification.target_user_id === profile.id ||
          newNotification.target_role === profile.role;

        // Strict store validation - null store_id role notifications should NOT be shown
        const isForCurrentStore = 
          // User-targeted notifications without store_id (direct messages)
          (newNotification.target_user_id === profile.id && !newNotification.target_role) ||
          // Store-specific notifications must match current store
          (newNotification.store_id && newNotification.store_id === currentStore?.id);

        if (isForCurrentUser && isForCurrentStore) {
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
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role, hasInteracted, queryClient, isOwner, currentStore?.id]);

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
