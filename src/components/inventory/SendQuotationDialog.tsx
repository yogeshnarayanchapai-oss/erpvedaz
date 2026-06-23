import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Download, ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useCompanyInfo } from '@/hooks/useHRM';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateQuotationPDF, QuotationData, computeQuotation } from '@/lib/consignmentQuotationPdf';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProductName?: string;
  customer?: { name?: string; phone?: string; address?: string };
  quotationNo?: string;
}

interface TermPreset {
  id: string;
  title: string;
  content: string;
  is_default: boolean;
  store_id: string | null;
}

const emptyData: QuotationData = {
  productName: '', hsCode: '', taxRate: 10, duty: 0, vat: 13,
  grossWeight: 0, ratePerPcs: 0, totalQty: 0, exchangeRate: 1.6015,
  transportIndia: 0, customAgent: 0, borderTransport: 0,
  bankCharge: 0, insurance: 0, nepalTransport: 0, serviceChargePct: 5,
};

export function SendQuotationDialog({ open, onOpenChange, defaultProductName, customer, quotationNo }: Props) {
  const storeId = useCurrentStoreId();
  const { data: company } = useCompanyInfo();
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [data, setData] = useState<QuotationData>(emptyData);
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);
  const [newTermTitle, setNewTermTitle] = useState('');
  const [newTermContent, setNewTermContent] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [showAddTerm, setShowAddTerm] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setData({ ...emptyData, productName: defaultProductName || '' });
      setShowAddTerm(false);
      setNewTermTitle(''); setNewTermContent(''); setSaveAsDefault(false);
    }
  }, [open, defaultProductName]);

  const { data: terms = [] } = useQuery({
    queryKey: ['quotation_terms', storeId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('consignment_quotation_terms')
        .select('*')
        .or(`store_id.eq.${storeId},store_id.is.null`)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TermPreset[];
    },
  });

  // Preselect defaults when terms load
  useEffect(() => {
    if (terms.length && selectedTermIds.length === 0) {
      setSelectedTermIds(terms.filter(t => t.is_default).map(t => t.id));
    }
  }, [terms]);

  const saveTerm = useMutation({
    mutationFn: async () => {
      if (!newTermTitle.trim() || !newTermContent.trim()) throw new Error('Title and content are required');
      const { data: inserted, error } = await (supabase as any)
        .from('consignment_quotation_terms')
        .insert({
          store_id: storeId,
          title: newTermTitle.trim(),
          content: newTermContent.trim(),
          is_default: saveAsDefault,
        })
        .select('*').single();
      if (error) throw error;
      return inserted as TermPreset;
    },
    onSuccess: (t) => {
      toast.success('Term saved');
      qc.invalidateQueries({ queryKey: ['quotation_terms'] });
      setSelectedTermIds(prev => [...prev, t.id]);
      setNewTermTitle(''); setNewTermContent(''); setSaveAsDefault(false); setShowAddTerm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delTerm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('consignment_quotation_terms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['quotation_terms'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const totals = computeQuotation(data);

  const onDownload = async () => {
    const selectedTerms = terms.filter(t => selectedTermIds.includes(t.id)).map(t => t.content);
    await generateQuotationPDF({
      data, company: company || {}, customer, terms: selectedTerms, quotationNo,
    });
    toast.success('Quotation PDF downloaded');
  };

  const num = (v: any) => v === '' || v == null ? 0 : Number(v);
  const set = (k: keyof QuotationData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData(d => ({ ...d, [k]: typeof d[k] === 'number' ? num(e.target.value) : e.target.value as any }));
  const nv = (n: number) => (n === 0 ? '' : n);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[900px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Send Quotation {step === 1 ? '— Details' : '— Terms & Conditions'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div><Label className="text-xs">Product name</Label><Input className="h-8" value={data.productName} onChange={e => setData({ ...data, productName: e.target.value })} /></div>
              <div><Label className="text-xs">HS Code</Label><Input className="h-8" value={data.hsCode} onChange={e => setData({ ...data, hsCode: e.target.value })} /></div>
              <div><Label className="text-xs">Gross weight (kg)</Label><Input className="h-8" type="number" placeholder="0" value={nv(data.grossWeight)} onChange={set('grossWeight')} /></div>
              <div><Label className="text-xs">Total rate per pcs (INR)</Label><Input className="h-8" type="number" placeholder="0" value={nv(data.ratePerPcs)} onChange={set('ratePerPcs')} /></div>

              <div><Label className="text-xs">Total qty (kg / pcs)</Label><Input className="h-8" type="number" placeholder="0" value={nv(data.totalQty)} onChange={set('totalQty')} /></div>
              <div><Label className="text-xs">Exchange rate (INR→NPR)</Label><Input className="h-8" type="number" step="0.0001" placeholder="1.6015" value={nv(data.exchangeRate)} onChange={set('exchangeRate')} /></div>
              <div><Label className="text-xs">Tax rate (%)</Label><Input className="h-8" type="number" placeholder="0" value={nv(data.taxRate)} onChange={set('taxRate')} /></div>
              <div><Label className="text-xs">Duty (%)</Label><Input className="h-8" type="number" placeholder="0" value={nv(data.duty)} onChange={set('duty')} /></div>

              <div><Label className="text-xs">VAT (%)</Label><Input className="h-8" type="number" placeholder="0" value={nv(data.vat)} onChange={set('vat')} /></div>
              <div><Label className="text-xs">Transportation (India)</Label><Input className="h-8" type="number" placeholder="0" value={nv(data.transportIndia)} onChange={set('transportIndia')} /></div>
              <div><Label className="text-xs">Custom agent (Ind+Nep)</Label><Input className="h-8" type="number" placeholder="0" value={nv(data.customAgent)} onChange={set('customAgent')} /></div>
              <div><Label className="text-xs">Border transportation</Label><Input className="h-8" type="number" placeholder="0" value={nv(data.borderTransport)} onChange={set('borderTransport')} /></div>

              <div><Label className="text-xs">Bank charge</Label><Input className="h-8" type="number" placeholder="0" value={nv(data.bankCharge)} onChange={set('bankCharge')} /></div>
              <div><Label className="text-xs">Insurance</Label><Input className="h-8" type="number" placeholder="0" value={nv(data.insurance)} onChange={set('insurance')} /></div>
              <div><Label className="text-xs">Nepal transportation</Label><Input className="h-8" type="number" placeholder="0" value={nv(data.nepalTransport)} onChange={set('nepalTransport')} /></div>
              <div><Label className="text-xs">Service charge (%)</Label><Input className="h-8" type="number" placeholder="0" value={nv(data.serviceChargePct)} onChange={set('serviceChargePct')} /></div>
            </div>


            <Card className="p-3 bg-muted/30">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Product (NPR)</div><div className="font-semibold">{totals.productPriceNPR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
                <div><div className="text-xs text-muted-foreground">Tax+Duty+VAT</div><div className="font-semibold">{(totals.taxAmt + totals.dutyAmt + totals.vatAmt).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
                <div><div className="text-xs text-muted-foreground">Overheads + Service</div><div className="font-semibold">{(totals.overheads + totals.serviceCharge).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
                <div><div className="text-xs text-muted-foreground">Grand Total (NPR)</div><div className="font-bold text-primary">{totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
              </div>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Saved Terms & Conditions</Label>
                <Button size="sm" variant="outline" onClick={() => setShowAddTerm(s => !s)}>
                  <Plus className="h-4 w-4 mr-1" /> Add New
                </Button>
              </div>
              {terms.length === 0 && <p className="text-sm text-muted-foreground">No saved terms yet. Add one below.</p>}
              <div className="space-y-2">
                {terms.map(t => (
                  <div key={t.id} className="flex items-start gap-2 p-2 border rounded-md hover:bg-muted/30">
                    <Checkbox
                      checked={selectedTermIds.includes(t.id)}
                      onCheckedChange={(v) => setSelectedTermIds(prev => v ? [...prev, t.id] : prev.filter(x => x !== t.id))}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {t.title}
                        {t.is_default && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">DEFAULT</span>}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-pre-line">{t.content}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => delTerm.mutate(t.id)} className="h-7 w-7 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {showAddTerm && (
              <Card className="p-3 space-y-2 border-dashed">
                <div><Label>Title</Label><Input value={newTermTitle} onChange={e => setNewTermTitle(e.target.value)} placeholder="e.g. Standard Import Terms" /></div>
                <div><Label>Content</Label><Textarea rows={4} value={newTermContent} onChange={e => setNewTermContent(e.target.value)} placeholder="Enter the terms text..." /></div>
                <div className="flex items-center gap-2"><Switch checked={saveAsDefault} onCheckedChange={setSaveAsDefault} /><Label className="text-sm">Mark as default (pre-selected next time)</Label></div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setShowAddTerm(false)}>Cancel</Button>
                  <Button size="sm" onClick={() => saveTerm.mutate()} disabled={saveTerm.isPending}>{saveTerm.isPending ? 'Saving...' : 'Save Term'}</Button>
                </div>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <div className="flex-1 text-xs text-muted-foreground">Step {step} of 2 · Grand Total: <span className="font-semibold text-foreground">NPR {totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {step === 1 ? (
            <Button onClick={() => setStep(2)}><ArrowRight className="h-4 w-4 ml-1" /> Next: Terms</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={onDownload}><Download className="h-4 w-4 mr-1" /> Download Quotation PDF</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
