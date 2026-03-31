import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, X } from 'lucide-react';
import { CompactProductSelect } from '@/components/ui/compact-product-select';
import { useProducts } from '@/hooks/useProducts';
import { useLeadSources } from '@/hooks/useLeadSources';
import { useBulkCreateLeads, type BulkLeadInput } from '@/hooks/useBulkCreateLeads';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { toast } from 'sonner';

interface BulkAddLeadsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillData?: LeadRow[];
  onSuccess?: () => void;
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
  _socialbox_id?: string;
}

const DRAFT_KEY_PREFIX = 'bulk-leads-draft-';

export function BulkAddLeadsForm({ open, onOpenChange, prefillData, onSuccess }: BulkAddLeadsFormProps) {
  const { currentStore } = useCurrentStore();
  const { data: products = [] } = useProducts();
  const { data: leadSources = [] } = useLeadSources();
  const bulkCreateLeads = useBulkCreateLeads();

  const defaultSource = leadSources.length > 0 ? leadSources[0].name : '';
  const draftKey = `${DRAFT_KEY_PREFIX}${currentStore?.id || 'default'}`;

  // Track the last selected product to use as default for new rows
  const [lastSelectedProduct, setLastSelectedProduct] = useState<string>('');

  const createEmptyRow = useCallback((defaultProductId?: string): LeadRow => ({
    id: crypto.randomUUID(),
    date: new Date().toISOString().split('T')[0],
    client_name: '',
    contact_number: '',
    alt_phone: '',
    product_id: defaultProductId || '',
    source: defaultSource,
    remark: '',
  }), [defaultSource]);

  const [rows, setRows] = useState<LeadRow[]>([createEmptyRow()]);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Check if there's any filled data
  const hasFilledData = useCallback(() => {
    return rows.some(r => r.client_name.trim() || r.contact_number.trim());
  }, [rows]);

  // Save draft to localStorage
  const saveDraft = useCallback((rowsToSave: LeadRow[]) => {
    const filledRows = rowsToSave.filter(r => r.client_name.trim() || r.contact_number.trim());
    if (filledRows.length > 0) {
      localStorage.setItem(draftKey, JSON.stringify(rowsToSave));
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    setIsDraftRestored(false);
  }, [draftKey]);

  // Load prefill data, draft, or reset when dialog opens
  useEffect(() => {
    if (open) {
      // If prefillData is provided, use it directly
      if (prefillData && prefillData.length > 0) {
        setRows(prefillData);
        setIsDraftRestored(false);
        return;
      }

      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft) as LeadRow[];
          if (parsed.length > 0) {
            setRows(parsed);
            setIsDraftRestored(true);
            return;
          }
        } catch (e) {
          console.error('Failed to parse draft:', e);
        }
      }
      // No draft found, start fresh
      const source = leadSources.length > 0 ? leadSources[0].name : '';
      setRows([{
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        client_name: '',
        contact_number: '',
        alt_phone: '',
        product_id: '',
        source: source,
        remark: '',
      }]);
      setIsDraftRestored(false);
    }
  }, [open, draftKey, leadSources, prefillData]);

  const addRows = (count: number) => {
    // Use the last selected product as default for new rows
    const newRows = Array.from({ length: count }, () => createEmptyRow(lastSelectedProduct));
    const updatedRows = [...rows, ...newRows];
    setRows(updatedRows);
    saveDraft(updatedRows);
  };

  const deleteRow = (id: string) => {
    if (rows.length === 1) {
      toast.error('Cannot delete the last row');
      return;
    }
    const updatedRows = rows.filter(row => row.id !== id);
    setRows(updatedRows);
    saveDraft(updatedRows);
  };

  const updateRow = (id: string, field: keyof LeadRow, value: string) => {
    const updatedRows = rows.map(row => (row.id === id ? { ...row, [field]: value } : row));
    setRows(updatedRows);
    saveDraft(updatedRows);
    
    // Track the last selected product for new rows
    if (field === 'product_id' && value) {
      setLastSelectedProduct(value);
    }
  };

  // Handle close attempt
  const handleCloseAttempt = (shouldClose: boolean) => {
    if (!shouldClose) return;
    
    if (hasFilledData()) {
      setShowDiscardConfirm(true);
    } else {
      onOpenChange(false);
    }
  };

  // Confirm discard
  const handleConfirmDiscard = () => {
    clearDraft();
    setShowDiscardConfirm(false);
    setLastSelectedProduct('');
    setRows([createEmptyRow()]);
    onOpenChange(false);
  };

  // Manual clear draft
  const handleClearDraft = () => {
    clearDraft();
    setLastSelectedProduct('');
    const source = leadSources.length > 0 ? leadSources[0].name : '';
    setRows([{
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      client_name: '',
      contact_number: '',
      alt_phone: '',
      product_id: '',
      source: source,
      remark: '',
    }]);
    toast.success('Draft cleared');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleSubmit = async () => {
    // Prevent double-submit
    if (isSubmitting) {
      toast.error('Already processing, please wait...');
      return;
    }

    const validRows = rows.filter(
      row => row.client_name.trim() && row.contact_number.trim() && row.product_id && row.source
    );

    if (validRows.length === 0) {
      toast.error('Please fill at least one complete row (name, phone, product, source)');
      return;
    }

    const invalidCount = rows.length - validRows.length;
    if (invalidCount > 0) {
      toast.warning(`${invalidCount} incomplete row(s) will be skipped`);
    }

    setIsSubmitting(true);
    setProgress({ current: 0, total: validRows.length });

    const leadsToCreate: BulkLeadInput[] = validRows.map(row => ({
      date: row.date,
      client_name: row.client_name.trim(),
      contact_number: row.contact_number.trim(),
      alt_phone: row.alt_phone.trim() || undefined,
      product_id: row.product_id,
      source: row.source,
      remark: row.remark.trim() || undefined,
    }));

    try {
      const result = await bulkCreateLeads.mutateAsync(leadsToCreate);
      setProgress({ current: result.length, total: result.length });
      clearDraft();
      setLastSelectedProduct('');
      onOpenChange(false);
      setRows([createEmptyRow()]);
      onSuccess?.();
    } catch (error: any) {
      console.error('Bulk create error:', error);
      // Error toast is already handled by mutation's onError
    } finally {
      setIsSubmitting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const filledCount = rows.filter(r => r.client_name.trim() || r.contact_number.trim()).length;

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseAttempt}>
        <DialogContent className="w-[98vw] !max-w-[1800px] max-h-[92vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg font-semibold">Add New Leads (Bulk Entry)</DialogTitle>
              {isDraftRestored && (
                <Badge variant="secondary" className="text-xs">
                  Draft Restored
                </Badge>
              )}
              {hasFilledData() && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearDraft}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear Draft
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Table Header */}
            <div className="grid grid-cols-[40px_130px_minmax(150px,2fr)_150px_130px_minmax(150px,2fr)_160px_minmax(120px,1.5fr)_40px] gap-3 mb-2 text-xs font-medium text-muted-foreground">
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
                  
                  <CompactProductSelect
                    products={products}
                    value={row.product_id}
                    onSelect={(v) => updateRow(row.id, 'product_id', v)}
                    placeholder="Select product"
                  />
                  
                  <Select value={row.source} onValueChange={(v) => updateRow(row.id, 'source', v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={leadSources.length === 0 ? "No sources configured" : "Select source"} />
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

          <DialogFooter className="px-6 py-4 border-t flex-col sm:flex-row justify-between gap-3 bg-muted/30">
            {isSubmitting && progress.total > 0 && (
              <div className="w-full sm:w-auto flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <span>Creating {progress.current}/{progress.total}...</span>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => addRows(1)} disabled={isSubmitting}>
                <Plus className="w-4 h-4 mr-1" />
                Add 1
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addRows(5)} disabled={isSubmitting}>
                <Plus className="w-4 h-4 mr-1" />
                Add 5
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleCloseAttempt(true)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || bulkCreateLeads.isPending}>
                {isSubmitting ? `Creating ${progress.current}/${progress.total}...` : `Create ${rows.length}`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard Confirmation Dialog */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Leads</AlertDialogTitle>
            <AlertDialogDescription>
              You have {filledCount} unsaved lead{filledCount > 1 ? 's' : ''}. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
