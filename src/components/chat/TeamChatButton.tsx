import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { TeamChatDialog } from './TeamChatDialog';

export function TeamChatButton() {
  const [open, setOpen] = useState(false);

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
        </button>
      )}
      <TeamChatDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
