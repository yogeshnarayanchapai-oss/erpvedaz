import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProducts } from '@/hooks/useProducts';
import { useLeadSources } from '@/hooks/useLeadSources';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { Lead } from '@/hooks/useLeads';

interface BulkEditLeadsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeads: Lead[];
  onComplete: () => void;
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

export function BulkEditLeadsForm({ open, onOpenChange, selectedLeads, onComplete }: BulkEditLeadsFormProps) {
  const { data: products = [] } = useProducts();
  const { data: leadSources = [] } = useLeadSources();
  const { currentStore } = useCurrentStore();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize rows when dialog opens with selected leads data
  useEffect(() => {
    if (open && selectedLeads.length > 0) {
      setRows(selectedLeads.map(lead => ({
        id: lead.id,
        date: lead.date || new Date().toISOString().split('T')[0],
        client_name: lead.client_name || '',
        contact_number: lead.contact_number || '',
        alt_phone: lead.alt_phone || '',
        product_id: lead.product_id || '',
        source: lead.source || '',
        remark: lead.remark || '',
      })));
    }
  }, [open, selectedLeads]);

  const updateRow = (id: string, field: keyof LeadRow, value: string) => {
    setRows(rows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handleSubmit = async () => {
    const invalidRows = rows.filter(
      row => !row.client_name.trim() || !row.contact_number.trim()
    );

    if (invalidRows.length > 0) {
      toast.error(`Please fill required fields (${invalidRows.length} incomplete)`);
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get actor name
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      const actorName = actorProfile?.name || 'Unknown User';

      // Get store_id from current store context
      const storeId = currentStore?.id || null;

      // Update each lead
      for (const row of rows) {
        const { error } = await supabase
          .from('leads')
          .update({
            date: row.date,
            client_name: row.client_name.trim(),
            contact_number: row.contact_number.trim(),
            alt_phone: row.alt_phone.trim() || null,
            product_id: row.product_id || null,
            source: row.source || null,
            remark: row.remark.trim() || null,
          })
          .eq('id', row.id);

        if (error) throw error;
      }

      // Notify ADMIN and OWNER users
      const { data: adminOwners } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['ADMIN', 'OWNER']);

      if (adminOwners && adminOwners.length > 0) {
        const notifications = adminOwners.map(profile => ({
          target_user_id: profile.id,
          title: 'Leads Bulk Edited',
          message: `${rows.length} lead(s) were bulk edited by ${actorName}`,
          type: 'LEAD_EDITED',
          store_id: storeId,
          actor_id: user.id,
          actor_name: actorName,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      toast.success(`${rows.length} leads updated successfully`);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Update failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold">Bulk Edit Leads ({selectedLeads.length})</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_100px_1fr_120px_100px_1fr_140px_1fr] gap-2 mb-2 text-xs font-medium text-muted-foreground">
            <div>#</div>
            <div>Date *</div>
            <div>Customer Name *</div>
            <div>Phone *</div>
            <div>Alt Phone</div>
            <div>Product</div>
            <div>Source</div>
            <div>Remark</div>
          </div>

          {/* Table Rows */}
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div 
                key={row.id} 
                className="grid grid-cols-[40px_100px_1fr_120px_100px_1fr_140px_1fr] gap-2 items-center"
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
                    <SelectValue placeholder={leadSources.length === 0 ? "No sources" : "Select source"} />
                  </SelectTrigger>
                  <SelectContent>
                    {leadSources.length === 0 ? (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        No lead sources found.<br />Add sources in Data Tools.
                      </div>
                    ) : (
                      leadSources.map(s => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                
                <Input 
                  value={row.remark} 
                  onChange={(e) => updateRow(row.id, 'remark', e.target.value)} 
                  className="h-9 text-sm"
                  placeholder="Remark"
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Saving...' : `Save ${rows.length} Leads`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
