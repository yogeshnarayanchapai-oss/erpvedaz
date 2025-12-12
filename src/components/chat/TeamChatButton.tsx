import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { TeamChatDialog } from './TeamChatDialog';
import { useUnreadMessageCount } from '@/hooks/useTeamChat';

export function TeamChatButton() {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadMessageCount();

  return (
    <>
      {/* Floating Action Button - hidden when chat is open */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center justify-center"
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
      )}
      <TeamChatDialog open={open} onOpenChange={setOpen} />
    </>
  );
}