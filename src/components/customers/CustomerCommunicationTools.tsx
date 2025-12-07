import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Mail, Copy, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerCommunicationToolsProps {
  customerName: string;
  phone: string;
  altPhone?: string | null;
  email?: string | null;
  address?: string | null;
  orderCount?: number;
}

export function CustomerCommunicationTools({
  customerName,
  phone,
  altPhone,
  email,
  address,
  orderCount = 0,
}: CustomerCommunicationToolsProps) {
  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  const handleWhatsApp = (number: string) => {
    const message = encodeURIComponent(`Hello ${customerName}, this is from Vakari Vision.`);
    window.open(`https://wa.me/${number.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleEmail = () => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Communication Tools</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          onClick={() => handleCall(phone)}
          className="w-full"
          variant="default"
        >
          <Phone className="w-4 h-4 mr-2" />
          Call Primary
        </Button>

        {altPhone && (
          <Button
            onClick={() => handleCall(altPhone)}
            className="w-full"
            variant="outline"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call Alt
          </Button>
        )}

        <Button
          onClick={() => handleWhatsApp(phone)}
          className="w-full"
          variant="default"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          WhatsApp
        </Button>

        {email && (
          <Button
            onClick={handleEmail}
            className="w-full"
            variant="outline"
          >
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </Button>
        )}

        {address && (
          <Button
            onClick={() => copyToClipboard(address, 'Address')}
            className="w-full"
            variant="outline"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Address
          </Button>
        )}

        <Button
          onClick={() => copyToClipboard(`${customerName}\n${phone}\nTotal Orders: ${orderCount}`, 'Customer Info')}
          className="w-full"
          variant="outline"
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          Copy Customer Info
        </Button>
      </div>
    </Card>
  );
}
