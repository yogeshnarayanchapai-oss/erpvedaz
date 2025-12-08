import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { notifyNewLeadsCreated } from '@/lib/notificationHelpers';

const SOURCE_OPTIONS = [
  { value: 'Facebook Ads', label: 'Facebook Ads' },
  { value: 'Shopify', label: 'Shopify' },
  { value: 'Website', label: 'Website' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Calling', label: 'Calling' },
];

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LeadRow {
  id: string;
  date: string;
  client_name: string;
  contact_number: string;
  alt_phone: string;
  product_id: string;
  source: string;
  remark: string;
}

export function AddLeadDialog({ open, onOpenChange }: AddLeadDialogProps) {
  const { profile } = useAuth();
  const { currentStore } = useCurrentStore();
  const { data: products = [] } = useProducts();
  const queryClient = useQueryClient();

  const createEmptyRow = (): LeadRow => ({
    id: crypto.randomUUID(),
    date: new Date().toISOString().split('T')[0],
    client_name: '',
    contact_number: '',
    alt_phone: '',
    product_id: '',
    source: 'Facebook Ads',
    remark: '',
  });

  const [rows, setRows] = useState<LeadRow[]>([createEmptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setRows([createEmptyRow()]);
    }
  }, [open]);

  const addRows = (count: number) => {
    const newRows = Array.from({ length: count }, () => createEmptyRow());
    setRows([...rows, ...newRows]);
  };

  const deleteRow = (id: string) => {
    if (rows.length === 1) {
      toast.error('Cannot delete the last row');
      return;
    }
    setRows(rows.filter(row => row.id !== id));
  };

  const updateRow = (id: string, field: keyof LeadRow, value: string) => {
    setRows(rows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handleSubmit = async () => {
    const invalidRows = rows.filter(
      row => !row.client_name.trim() || !row.contact_number.trim() || !row.product_id || !row.source
    );

    if (invalidRows.length > 0) {
      toast.error(`Please fill required fields (${invalidRows.length} incomplete)`);
      return;
    }

    setIsSubmitting(true);
    try {
      const leadsToInsert = rows.map(row => ({
        date: row.date,
        client_name: row.client_name.trim(),
        contact_number: row.contact_number.trim(),
        alt_phone: row.alt_phone.trim() || null,
        product_id: row.product_id,
        source: row.source,
        remark: row.remark.trim() || null,
        created_by_user_id: profile?.id,
        assigned_to_user_id: profile?.id,
        status: 'NEW' as const,
        current_team: 'CALLING' as const,
        lead_bucket: 'NEW' as const,
        pool_status: 'ASSIGNED' as const,
        store_id: currentStore?.id || null,
      }));

      const { error } = await supabase.from('leads').insert(leadsToInsert);
      if (error) throw error;

      // Send notification to Admin about new leads
      try {
        await notifyNewLeadsCreated({
          count: rows.length,
          createdByName: profile?.name || 'Staff',
          createdById: profile?.id || '',
          portal: 'CALLING',
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }

      toast.success(`${rows.length} lead${rows.length > 1 ? 's' : ''} created`);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      onOpenChange(false);
      setRows([createEmptyRow()]);
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold">Add New Leads (Bulk Entry)</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_100px_1fr_120px_100px_1fr_140px_1fr_40px] gap-2 mb-2 text-xs font-medium text-muted-foreground">
            <div></div>
            <div>Date *</div>
            <div>Customer Name *</div>
            <div>Phone *</div>
            <div>Alt Phone</div>
            <div>Product *</div>
            <div>Source *</div>
            <div>Remark</div>
            <div></div>
          </div>

          {/* Table Rows */}
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div 
                key={row.id} 
                className="grid grid-cols-[40px_100px_1fr_120px_100px_1fr_140px_1fr_40px] gap-2 items-center"
              >
                <div className="text-sm font-medium text-muted-foreground">#{index + 1}</div>
                
                <Input 
                  type="date" 
                  value={row.date} 
                  onChange={(e) => updateRow(row.id, 'date', e.target.value)} 
                  className="h-9 text-sm"
                />
                
                <Input 
                  value={row.client_name} 
                  onChange={(e) => updateRow(row.id, 'client_name', e.target.value)} 
                  className="h-9 text-sm"
                  placeholder="Customer name"
                />
                
                <Input 
                  value={row.contact_number} 
                  onChange={(e) => updateRow(row.id, 'contact_number', e.target.value)} 
                  className="h-9 text-sm"
                  placeholder="Phone"
                />
                
                <Input 
                  value={row.alt_phone} 
                  onChange={(e) => updateRow(row.id, 'alt_phone', e.target.value)} 
                  className="h-9 text-sm"
                  placeholder="Optional"
                />
                
                <Select value={row.product_id} onValueChange={(v) => updateRow(row.id, 'product_id', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.filter(p => p.is_active).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={row.source} onValueChange={(v) => updateRow(row.id, 'source', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Input 
                  value={row.remark} 
                  onChange={(e) => updateRow(row.id, 'remark', e.target.value)} 
                  className="h-9 text-sm"
                  placeholder="Remark"
                />
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  onClick={() => deleteRow(row.id)} 
                  className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-row justify-between bg-muted/30">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => addRows(1)}>
              <Plus className="w-4 h-4 mr-1" />
              Add 1
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addRows(5)}>
              <Plus className="w-4 h-4 mr-1" />
              Add 5
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : `Create ${rows.length}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
