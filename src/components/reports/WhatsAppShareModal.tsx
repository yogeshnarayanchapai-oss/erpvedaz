import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMessageChannels } from '@/hooks/useMessaging';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Send, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WhatsAppShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTitle: string;
  dateFrom: Date;
  dateTo: Date;
  message: string;
}

export function WhatsAppShareModal({
  open,
  onOpenChange,
  reportTitle,
  dateFrom,
  dateTo,
  message,
}: WhatsAppShareModalProps) {
  const { data: channels = [] } = useMessageChannels();
  const whatsAppChannels = channels.filter(c => c.type === 'WHATSAPP' && c.is_active);
  
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [recipient, setRecipient] = useState('');
  const [editedMessage, setEditedMessage] = useState(message);
  const [isSending, setIsSending] = useState(false);

  // Update message when prop changes
  useState(() => {
    setEditedMessage(message);
  });

  const handleSend = async () => {
    if (!selectedChannel) {
      toast.error('Please select a WhatsApp channel');
      return;
    }
    if (!recipient) {
      toast.error('Please enter a recipient number or group');
      return;
    }

    setIsSending(true);
    try {
      // For now, open WhatsApp web with the message
      // In a full implementation, this would call the WhatsApp API via the channel
      const encodedMessage = encodeURIComponent(editedMessage);
      const cleanNumber = recipient.replace(/[^0-9]/g, '');
      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
      
      window.open(whatsappUrl, '_blank');
      toast.success('Opening WhatsApp...');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to share: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share to WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {whatsAppChannels.length === 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No WhatsApp channel configured. Please add one in Admin → Messaging → Channels.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Report Period</Label>
                <p className="text-sm text-muted-foreground">
                  {format(dateFrom, 'dd MMM yyyy')} - {format(dateTo, 'dd MMM yyyy')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">WhatsApp Channel</Label>
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {whatsAppChannels.map(channel => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient (Phone / Group)</Label>
                <Input
                  id="recipient"
                  placeholder="e.g., 9779841234567 or group name"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter phone number with country code (e.g., 977...)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Message Preview</Label>
                <Textarea
                  value={editedMessage}
                  onChange={(e) => setEditedMessage(e.target.value)}
                  rows={10}
                  className="font-mono text-xs"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {whatsAppChannels.length > 0 && (
            <Button onClick={handleSend} disabled={isSending}>
              <Send className="w-4 h-4 mr-2" />
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
