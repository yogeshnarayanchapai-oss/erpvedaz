import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { playNotificationSound } from '@/lib/notificationSound';

export function useLeadAssignmentNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();
  const hasInteractedRef = useRef(false);

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

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`lead-assignments-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `assigned_to_user_id=eq.${userId}`,
        },
        (payload) => {
          const newLead = payload.new as any;
          
          // Play notification sound
          if (hasInteractedRef.current) {
            playNotificationSound();
          }
          
          toast.success('New Lead Assigned!', {
            description: `${newLead.client_name} - ${newLead.contact_number}`,
            duration: 5000,
            action: {
              label: 'View',
              onClick: () => {
                window.location.href = '/calling/leads';
              },
            },
          });
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: `assigned_to_user_id=eq.${userId}`,
        },
        (payload) => {
          const oldLead = payload.old as any;
          const newLead = payload.new as any;
          
          // Only notify if this lead was just assigned to this user (wasn't assigned before)
          if (oldLead.assigned_to_user_id !== userId && newLead.assigned_to_user_id === userId) {
            // Play notification sound
            if (hasInteractedRef.current) {
              playNotificationSound();
            }
            
            toast.success('Lead Assigned to You!', {
              description: `${newLead.client_name} - ${newLead.contact_number}`,
              duration: 5000,
              action: {
                label: 'View',
                onClick: () => {
                  window.location.href = '/calling/leads';
                },
              },
            });
          }
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
