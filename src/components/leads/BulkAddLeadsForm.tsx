import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useLeadSources } from '@/hooks/useLeadSources';
import { useBulkCreateLeads, type BulkLeadInput } from '@/hooks/useBulkCreateLeads';
import { toast } from 'sonner';

interface BulkAddLeadsFormProps {
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
  source_id: string;
  remark: string;
}

export function BulkAddLeadsForm({ open, onOpenChange }: BulkAddLeadsFormProps) {
  const { data: products = [] } = useProducts();
  const { data: sources = [] } = useLeadSources();
  const bulkCreateLeads = useBulkCreateLeads();

  // Find default source (Facebook Ads)
  const defaultSourceId = sources.find(s => s.name.toLowerCase().includes('facebook'))?.id || '';

  const createEmptyRow = () => ({
    id: crypto.randomUUID(),
    date: new Date().toISOString().split('T')[0],
    client_name: '',
    contact_number: '',
    alt_phone: '',
    product_id: '',
    source_id: defaultSourceId,
    remark: '',
  });

  const [rows, setRows] = useState<LeadRow[]>([createEmptyRow()]);

  // Update default source when sources load
  useEffect(() => {
    if (defaultSourceId && rows.every(r => !r.source_id)) {
      setRows(rows.map(row => ({ ...row, source_id: defaultSourceId })));
    }
  }, [defaultSourceId]);

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
      row => !row.client_name.trim() || !row.contact_number.trim() || !row.product_id || !row.source_id
    );

    if (invalidRows.length > 0) {
      toast.error(`Please fill required fields (${invalidRows.length} incomplete)`);
      return;
    }

    const leadsToCreate: BulkLeadInput[] = rows.map(row => ({
      date: row.date,
      client_name: row.client_name.trim(),
      contact_number: row.contact_number.trim(),
      alt_phone: row.alt_phone.trim() || undefined,
      product_id: row.product_id,
      source_id: row.source_id,
      remark: row.remark.trim() || undefined,
    }));

    await bulkCreateLeads.mutateAsync(leadsToCreate);
    onOpenChange(false);
    setRows([createEmptyRow()]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Leads (Bulk Entry)</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg">
                <div className="col-span-1"><Label className="text-xs">#{index + 1}</Label></div>
                <div className="col-span-1">
                  <Label className="text-xs">Date *</Label>
                  <Input type="date" value={row.date} onChange={(e) => updateRow(row.id, 'date', e.target.value)} className="h-9" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Customer Name *</Label>
                  <Input value={row.client_name} onChange={(e) => updateRow(row.id, 'client_name', e.target.value)} className="h-9" />
                </div>
                <div className="col-span-1">
                  <Label className="text-xs">Phone *</Label>
                  <Input value={row.contact_number} onChange={(e) => updateRow(row.id, 'contact_number', e.target.value)} className="h-9" />
                </div>
                <div className="col-span-1">
                  <Label className="text-xs">Alt Phone</Label>
                  <Input value={row.alt_phone} onChange={(e) => updateRow(row.id, 'alt_phone', e.target.value)} className="h-9" placeholder="Optional" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Product *</Label>
                  <Select value={row.product_id} onValueChange={(v) => updateRow(row.id, 'product_id', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{products.filter(p => p.is_active).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Source *</Label>
                  <Select value={row.source_id} onValueChange={(v) => updateRow(row.id, 'source_id', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{sources.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Label className="text-xs">Remark</Label>
                  <Input value={row.remark} onChange={(e) => updateRow(row.id, 'remark', e.target.value)} className="h-9" />
                </div>
                <div className="col-span-1 flex items-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => deleteRow(row.id)} className="h-9 w-9 p-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="border-t pt-4 flex-row justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => addRows(1)}><Plus className="w-3 h-3 mr-1" />Add 1</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addRows(5)}><Plus className="w-3 h-3 mr-1" />Add 5</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={bulkCreateLeads.isPending}>
              {bulkCreateLeads.isPending ? 'Creating...' : `Create ${rows.length}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
