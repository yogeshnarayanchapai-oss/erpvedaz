import { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { TeamChatDialog } from './TeamChatDialog';
import { useUnreadMessageCount } from '@/hooks/useTeamChat';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export function TeamChatButton() {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadMessageCount();
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  const [notification, setNotification] = useState<string | null>(null);
  const prevUnreadRef = useRef(unreadCount);

  // Listen for new messages and show notification
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel('new-message-notification')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `store_id=eq.${storeId}`,
        },
        async (payload) => {
          // Don't show notification if chat is open
          if (open) return;
          
          // Get sender name
          const senderId = payload.new.sender_id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', senderId)
            .single();
          
          const senderName = profile?.name?.split(' ')[0] || 'Someone';
          setNotification(`New message from ${senderName}`);
          
          // Auto-hide after 3 seconds
          setTimeout(() => {
            setNotification(null);
          }, 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, open]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    // Clear notification when opening chat
    if (isOpen) {
      setNotification(null);
    }
    // Refetch unread count when closing chat to update badge
    if (!isOpen) {
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    }
  };

  return (
    <>
      {/* Floating Action Button - hidden when chat is open */}
      {!open && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          {/* Notification toast */}
          {notification && (
            <div className="animate-in slide-in-from-right-5 fade-in duration-300 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap">
              {notification}
            </div>
          )}
          
          <button
            onClick={() => setOpen(true)}
            className="relative w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center justify-center"
            aria-label="Open Team Chat"
          >
            <MessageCircle className="w-6 h-6" />
            {/* Unread badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      )}
      <TeamChatDialog open={open} onOpenChange={handleOpenChange} />
    </>
  );
}