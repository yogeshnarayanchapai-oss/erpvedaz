import { useState } from 'react';
import { MessageSquare, Send, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WhatsAppButtonProps {
  phone: string;
  customerName?: string;
  productName?: string;
  amount?: number;
  orderId?: string;
  leadId?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function WhatsAppButton({
  phone,
  customerName,
  productName,
  amount,
  orderId,
  leadId,
  variant = 'outline',
  size = 'sm',
}: WhatsAppButtonProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Generate default message template
  const generateDefaultMessage = () => {
    let msg = `नमस्ते${customerName ? ` ${customerName}` : ''} जी,\n\n`;
    
    if (productName) {
      msg += `तपाईंले ${productName} order गर्नुभएको थियो।\n`;
    }
    
    if (amount) {
      msg += `Amount: Rs. ${amount.toLocaleString()}\n`;
    }
    
    if (orderId) {
      msg += `Order ID: #${orderId.slice(0, 8)}\n`;
    }
    
    msg += '\nधन्यवाद,\nVakari Vision Team';
    
    return msg;
  };

  const handleOpenDialog = () => {
    setMessage(generateDefaultMessage());
    setOpen(true);
  };

  // Format phone number for WhatsApp (Nepal format)
  const formatPhoneForWhatsApp = (phoneNumber: string): string => {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If starts with 0, remove it and add country code
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // If doesn't have country code, add Nepal's
    if (!cleaned.startsWith('977')) {
      cleaned = '977' + cleaned;
    }
    
    return cleaned;
  };

  const handleSendWhatsApp = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    
    try {
      // Log the message
      await supabase.from('message_logs').insert({
        channel_id: '00000000-0000-0000-0000-000000000000', // Placeholder for WhatsApp
        recipient_phone: phone,
        payload_preview: message.substring(0, 200),
        status: 'SENT',
        related_lead_id: leadId || null,
        related_order_id: orderId || null,
      });
    } catch (error) {
      // Log error but don't block sending
      console.error('Failed to log message:', error);
    }

    // Open WhatsApp with the message
    const formattedPhone = formatPhoneForWhatsApp(phone);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    setSending(false);
    setOpen(false);
    toast.success('Opening WhatsApp...');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} onClick={handleOpenDialog} className="gap-2">
          <MessageSquare className="w-4 h-4" />
          WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            Send WhatsApp Message
          </DialogTitle>
          <DialogDescription>
            Edit the message below and click send to open WhatsApp with the prefilled text.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>To: {phone}</Label>
            {customerName && (
              <p className="text-sm text-muted-foreground">{customerName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[200px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendWhatsApp} 
            disabled={sending || !message.trim()}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4" />
            Open in WhatsApp
            <ExternalLink className="w-3 h-3" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}