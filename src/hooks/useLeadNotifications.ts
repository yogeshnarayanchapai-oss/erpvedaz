import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { playNotificationSound } from '@/lib/notificationSound';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { showBrowserNotification } from '@/lib/browserNotifications';

export interface LeadNotification {
  id: string;
  leadId: string;
  clientName: string;
  contactNumber: string;
  productName?: string;
  timestamp: Date;
  read: boolean;
}

// Store notifications in memory and localStorage for persistence
const STORAGE_KEY = 'lead_notifications';

function getStoredNotifications(userId: string): LeadNotification[] {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert timestamps back to Date objects and filter last 24 hours
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return parsed
        .map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }))
        .filter((n: LeadNotification) => n.timestamp.getTime() > dayAgo);
    }
  } catch (e) {
    console.error('Error reading notifications from storage:', e);
  }
  return [];
}

function storeNotifications(userId: string, notifications: LeadNotification[]) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(notifications));
  } catch (e) {
    console.error('Error storing notifications:', e);
  }
}

export function useLeadNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();
  const hasInteractedRef = useRef(false);
  const [notifications, setNotifications] = useState<LeadNotification[]>([]);
  const processedLeadsRef = useRef<Set<string>>(new Set());
  const { preferences } = useNotificationPreferences(userId);

  // Load stored notifications on mount
  useEffect(() => {
    if (userId) {
      const stored = getStoredNotifications(userId);
      setNotifications(stored);
      stored.forEach(n => processedLeadsRef.current.add(n.leadId));
    }
  }, [userId]);

  // Track user interaction to enable audio
  useEffect(() => {
    const enableAudio = () => {
      hasInteractedRef.current = true;
    };
    
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
    };
  }, []);

  const addNotification = useCallback((notification: LeadNotification) => {
    // Prevent duplicate notifications for the same lead
    if (processedLeadsRef.current.has(notification.leadId)) {
      return;
    }
    processedLeadsRef.current.add(notification.leadId);

    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, 50); // Keep last 50
      if (userId) {
        storeNotifications(userId, updated);
      }
      return updated;
    });

    // Play sound if enabled
    if (hasInteractedRef.current && preferences.soundEnabled) {
      playNotificationSound();
    }

    // Show toast if enabled
    if (preferences.toastEnabled) {
      toast.success('New Lead Assigned!', {
        description: `${notification.clientName} - ${notification.contactNumber}`,
        duration: 5000,
        action: {
          label: 'View',
          onClick: () => {
            window.location.href = '/calling/leads';
          },
        },
      });
    }

    // Show browser notification if enabled (works even when tab is in background)
    if (preferences.browserEnabled) {
      showBrowserNotification('New Lead Assigned!', {
        body: `${notification.clientName} - ${notification.contactNumber}${notification.productName ? ` · ${notification.productName}` : ''}`,
        tag: `lead-${notification.leadId}`,
        url: '/calling/leads',
      });
    }
  }, [userId, preferences.soundEnabled, preferences.toastEnabled, preferences.browserEnabled]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      if (userId) {
        storeNotifications(userId, updated);
      }
      return updated;
    });
  }, [userId]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      if (userId) {
        storeNotifications(userId, updated);
      }
      return updated;
    });
  }, [userId]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    if (userId) {
      storeNotifications(userId, []);
    }
  }, [userId]);

  // Subscribe to lead assignments
  useEffect(() => {
    if (!userId) return;

    console.log('[LeadNotifications] Setting up subscription for user:', userId);

    const channel = supabase
      .channel(`lead-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
        },
        async (payload) => {
          const newLead = payload.new as any;
          const oldLead = payload.old as any;
          
          // Check if this lead was just assigned to this user
          const wasAssignedToMe = newLead?.assigned_to_user_id === userId;
          const wasNotAssignedBefore = !oldLead?.assigned_to_user_id || oldLead?.assigned_to_user_id !== userId;
          
          if (wasAssignedToMe && wasNotAssignedBefore) {
            console.log('[LeadNotifications] New lead assigned:', newLead);
            
            // Fetch product name
            let productName = '';
            if (newLead.product_id) {
              const { data: product } = await supabase
                .from('products')
                .select('name')
                .eq('id', newLead.product_id)
                .single();
              productName = product?.name || '';
            }

            addNotification({
              id: crypto.randomUUID(),
              leadId: newLead.id,
              clientName: newLead.client_name,
              contactNumber: newLead.contact_number,
              productName,
              timestamp: new Date(),
              read: false,
            });
            
            queryClient.invalidateQueries({ queryKey: ['leads'] });
          }
        }
      )
      .subscribe((status) => {
        console.log('[LeadNotifications] Subscription status:', status);
      });

    return () => {
      console.log('[LeadNotifications] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, addNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
