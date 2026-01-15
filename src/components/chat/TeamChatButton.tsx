import { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { TeamChatDialog } from './TeamChatDialog';
import { useUnreadMessageCount } from '@/hooks/useTeamChat';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function TeamChatButton() {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadMessageCount();
  const queryClient = useQueryClient();
  const storeId = useCurrentStoreId();
  const { user } = useAuth();
  const [notification, setNotification] = useState<string | null>(null);
  const prevUnreadRef = useRef(unreadCount);

  // Listen for new messages and show notification
  useEffect(() => {
    if (!storeId || !user?.id) return;

    const channel = supabase
      .channel(`new-message-notification-${storeId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `store_id=eq.${storeId}`,
        },
        async (payload) => {
          // Don't show notification for own messages
          const senderId = payload.new.sender_id;
          if (senderId === user.id) return;
          
          // Get sender name and room info
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, username, email')
            .eq('id', senderId)
            .single();
          
          const { data: room } = await supabase
            .from('chat_rooms')
            .select('name')
            .eq('id', payload.new.room_id)
            .single();
          
          const senderName = profile?.name || profile?.username || profile?.email || 'Someone';
          const roomName = room?.name || 'Team Chat';
          const messagePreview = (payload.new.message_text || '').substring(0, 50);
          
          // Show toast notification (always)
          toast.info(`${senderName} sent you a new message`, {
            description:
              (roomName ? `${roomName}: ` : '') +
              (messagePreview + (messagePreview.length >= 50 ? '...' : '')),
            duration: 4000,
          });
          
          // Show floating notification if chat is closed
          if (!open) {
            setNotification(`New message from ${senderName.split(' ')[0]}`);
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
              setNotification(null);
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, user?.id, open]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    // Clear notification when opening chat
    if (isOpen) {
      setNotification(null);
    }
    // Refetch unread count when closing chat to update badge
    if (!isOpen) {
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['unread-per-room'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-badges'] });
    }
  };

  return (
    <>
      {/* Floating Action Button - responsive positioning */}
      {!open && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2 md:gap-3 safe-bottom">
          {/* Notification toast */}
          {notification && (
            <div className="animate-in slide-in-from-right-5 fade-in duration-300 bg-primary text-primary-foreground px-3 md:px-4 py-1.5 md:py-2 rounded-lg shadow-lg text-xs md:text-sm font-medium whitespace-nowrap max-w-[200px] truncate">
              {notification}
            </div>
          )}
          
          <button
            onClick={() => setOpen(true)}
            className="relative w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center touch-target no-select"
            aria-label="Open Team Chat"
          >
            <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
            {/* Unread badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] md:min-w-[22px] h-[20px] md:h-[22px] px-1 md:px-1.5 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] md:text-xs font-bold rounded-full">
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