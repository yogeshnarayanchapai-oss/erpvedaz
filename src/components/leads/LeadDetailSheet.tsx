import { useState } from 'react';
import { Lead } from '@/hooks/useLeads';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, MessageSquare, Edit, ShoppingCart, User, MapPin, Package, Calendar, Clock, FileText, CheckCircle } from 'lucide-react';
import { getLeadStatusBadgeClass, formatStatusLabel } from '@/lib/statusColors';
import { FormattedDate } from '@/components/FormattedDate';
import { format } from 'date-fns';
import { ConfirmLeadAsOrderModal } from './ConfirmLeadAsOrderModal';
import { useAuth } from '@/contexts/AuthContext';

interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (lead: Lead) => void;
  onCreateOrder?: (lead: Lead) => void;
  onCall?: (phone: string) => void;
  onWhatsApp?: (phone: string) => void;
}

export function LeadDetailSheet({
  lead,
  open,
  onOpenChange,
  onEdit,
  onCreateOrder,
  onCall,
  onWhatsApp,
}: LeadDetailSheetProps) {
  const { profile } = useAuth();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  
  if (!lead) return null;

  // Permission check: can confirm orders if admin, manager, or calling staff
  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'MANAGER' || profile?.role === 'SALES_MANAGER';
  const canConfirmOrders = isAdmin || profile?.role === 'CALLING';
  
  // Can show "Confirm as Order" if lead is not already confirmed and user has permission
  const canShowConfirmButton = canConfirmOrders && lead.status !== 'CONFIRMED' && !lead.order_id;
  const hasOrder = !!lead.order_id;

  const handleCall = () => {
    if (onCall) {
      onCall(lead.contact_number);
    } else {
      window.location.href = `tel:${lead.contact_number}`;
    }
  };

  const handleWhatsApp = () => {
    if (onWhatsApp) {
      onWhatsApp(lead.contact_number);
    } else {
      window.open(`https://wa.me/${lead.contact_number.replace(/\D/g, '')}`, '_blank');
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Lead Details
            <Badge variant="outline" className={getLeadStatusBadgeClass(lead.status || 'NEW')}>
              {formatStatusLabel(lead.status || 'NEW')}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCall} className="flex-1">
              <Phone className="w-4 h-4 mr-2" />
              Call
            </Button>
            <Button variant="outline" onClick={handleWhatsApp} className="flex-1">
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>

          {/* Edit / Confirm Actions */}
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" onClick={() => onEdit(lead)} className="flex-1">
                <Edit className="w-4 h-4 mr-2" />
                Edit Lead
              </Button>
            )}
            {canShowConfirmButton && (
              <Button onClick={() => setConfirmModalOpen(true)} className="flex-1 bg-success hover:bg-success/90">
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm as Order
              </Button>
            )}
            {hasOrder && (
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-2 bg-success/10 text-success">
                <ShoppingCart className="w-4 h-4" />
                Order Created
              </Badge>
            )}
          </div>

          <Separator />

          {/* Customer Info */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                Customer Information
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium">{lead.client_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <p className="font-medium">{lead.contact_number}</p>
                </div>
                {lead.alt_phone && (
                  <div>
                    <span className="text-muted-foreground">Alt Phone:</span>
                    <p className="font-medium">{lead.alt_phone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address Info */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4" />
                Location & Address
              </h4>
              <div className="space-y-2 text-sm">
                {lead.destination_branch && (
                  <div>
                    <span className="text-muted-foreground">Branch:</span>
                    <p className="font-medium">{lead.destination_branch}</p>
                  </div>
                )}
                {lead.full_address && (
                  <div>
                    <span className="text-muted-foreground">Full Address:</span>
                    <p className="font-medium">{lead.full_address}</p>
                  </div>
                )}
                {!lead.destination_branch && !lead.full_address && (
                  <p className="text-muted-foreground italic">No address provided</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Product Info */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-sm">
                <Package className="w-4 h-4" />
                Product Interest
              </h4>
              <div className="text-sm">
                <p className="font-medium">{lead.products?.name || 'Not specified'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Lead Details */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                Lead Details
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium"><FormattedDate date={lead.date} /></p>
                </div>
                <div>
                  <span className="text-muted-foreground">Source:</span>
                  <p className="font-medium">{(lead as any).lead_sources?.name || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Assigned To:</span>
                  <p className="font-medium">{lead.assigned_to?.name || 'Unassigned'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created By:</span>
                  <p className="font-medium">{lead.created_by_staff?.name || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className={`${getLeadStatusBadgeClass(lead.status || 'NEW')} text-xs`}>
                    {formatStatusLabel(lead.status || 'NEW')}
                  </Badge>
                </div>
                {lead.status === 'CONFIRMED' && (
                  <div>
                    <span className="text-muted-foreground">Confirmed By:</span>
                    <p className="font-medium text-success">{(lead as any).confirmed_by_staff?.name || lead.created_by_staff?.name || '-'}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Follow-up Info */}
          {lead.next_followup_at && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  Follow-up Schedule
                </h4>
                <div className="text-sm">
                  <p className="font-medium">
                    {format(new Date(lead.next_followup_at), 'dd MMM yyyy HH:mm')}
                  </p>
                  {lead.followup_reason && (
                    <p className="text-muted-foreground mt-1">{lead.followup_reason}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Remarks */}
          {lead.remark && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4" />
                  Remarks
                </h4>
                <p className="text-sm">{lead.remark}</p>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Created: {lead.created_at ? format(new Date(lead.created_at), 'dd MMM yyyy HH:mm') : '-'}</p>
            {(lead as any).confirmed_at && (
              <p>Confirmed: {format(new Date((lead as any).confirmed_at), 'dd MMM yyyy HH:mm')}</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
    
    <ConfirmLeadAsOrderModal
      lead={lead}
      open={confirmModalOpen}
      onOpenChange={setConfirmModalOpen}
      onSuccess={() => onOpenChange(false)}
    />
    </>
  );
}
