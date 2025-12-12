import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { TeamChatDialog } from './TeamChatDialog';

export function TeamChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <MessageCircle className="w-4 h-4" />
        Team Chat
      </Button>
      <TeamChatDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
