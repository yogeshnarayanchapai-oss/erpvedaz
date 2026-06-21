import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Upload, Download, Trash2, CheckCircle2, Lock, Unlock } from 'lucide-react';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import {
  useConsignment, useConsignmentStatusHistory, useUpdateConsignmentStatus,
  useConsignmentCosts, useAddCost, useDeleteCost,
  useConsignmentPayments, useAddPayment, useDeletePayment,
  useConsignmentDocuments, useUploadDocument, useDeleteDocument,
  useSaveConsignment, CONSIGNMENT_STATUSES, STATUS_LABELS, ConsignmentStatus,
} from '@/hooks/useConsignments';
import { useConsignmentSettings } from '@/hooks/useConsignmentSettings';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { toast } from 'sonner';

const DOC_TYPES = ['SUPPLIER_INVOICE','CUSTOMER_INVOICE','PACKING_LIST','BOL_AWB','PO','CUSTOMS','RECEIPT','DELIVERY_PROOF','OTHER'];

export default function ConsignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const storeId = useCurrentStoreId();
  const { effectiveRole } = useEffectiveRole();
  const isReadOnly = effectiveRole === 'ACCOUNTANT';
  const { data: c, isLoading } = useConsignment(id);
  const { data: history = [] } = useConsignmentStatusHistory(id);
  const { data: costs = [] } = useConsignmentCosts(id);
  const { data: payments = [] } = useConsignmentPayments(id);
  const { data: docs = [] } = useConsignmentDocuments(id);
  const updateStatus = useUpdateConsignmentStatus();
  const addCost = useAddCost();
  const delCost = useDeleteCost();
  const addPayment = useAddPayment();
  const delPayment = useDeletePayment();
  const uploadDoc = useUploadDocument();
  const delDoc = useDeleteDocument();
  const save = useSaveConsignment();
  const { data: statusOptions = [] } = useConsignmentSettings('STATUS');
  const { data: paymentCategories = [] } = useConsignmentSettings('PAYMENT_CATEGORY');
  const activeStatusOptions = statusOptions.filter(s => s.is_active);
  const activePaymentCategories = paymentCategories.filter(s => s.is_active);
  const statusLabelMap: Record<string, string> = {
    ...STATUS_LABELS,
    ...Object.fromEntries(statusOptions.map(s => [s.code, s.label])),
  };

  const [statusForm, setStatusForm] = useState<{ status: ConsignmentStatus; remarks: string }>({ status: 'INQUIRY_RECEIVED', remarks: '' });
  const [costForm, setCostForm] = useState({ cost_type: 'PRODUCT', description: '', amount: '' });
  const [payForm, setPayForm] = useState({ direction: 'RECEIVED', payment_for: 'CUSTOMER', amount: '', payment_date: new Date().toISOString().slice(0,10), payment_method: '', reference: '', note: '' });
  const [docType, setDocType] = useState('OTHER');

  if (isLoading || !c) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const totalReceived = payments.filter((p: any) => p.direction === 'RECEIVED').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const totalPaid = payments.filter((p: any) => p.direction === 'PAID').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  // Unified cost = total PAID payments + any manual cost entries (legacy)
  const manualCost = costs.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const totalCost = totalPaid + manualCost;
  const billing = Number(c.customer_billing_amount || 0);
  const profit = billing - totalCost;
  const receivable = billing - totalReceived;

  // Group PAID payments by payment_for for cost breakdown
  const paidByCategory = payments.filter((p: any) => p.direction === 'PAID').reduce((acc: Record<string, number>, p: any) => {
    const key = p.payment_for || 'OTHER';
    acc[key] = (acc[key] || 0) + Number(p.amount || 0);
    return acc;
  }, {});





  const handleStatusUpdate = async () => {
    await updateStatus.mutateAsync({ id: c.id, status: statusForm.status, remarks: statusForm.remarks, storeId: c.store_id });
    setStatusForm({ ...statusForm, remarks: '' });
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    await addCost.mutateAsync({ consignment_id: c.id, store_id: c.store_id, cost_type: costForm.cost_type, description: costForm.description || null, amount: Number(costForm.amount) || 0 });
    setCostForm({ cost_type: 'PRODUCT', description: '', amount: '' });
    // recompute & persist totals
    const newTotal = totalCost + (Number(costForm.amount) || 0);
    await save.mutateAsync({ id: c.id, total_cost: newTotal, estimated_profit: billing - newTotal } as any);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    await addPayment.mutateAsync({
      consignment_id: c.id, store_id: c.store_id,
      party_id: payForm.direction === 'RECEIVED' ? c.customer_party_id : c.supplier_party_id,
      direction: payForm.direction, payment_for: payForm.payment_for,
      amount: Number(payForm.amount) || 0, payment_date: payForm.payment_date,
      payment_method: payForm.payment_method || null, reference: payForm.reference || null, note: payForm.note || null,
    });
    setPayForm({ ...payForm, amount: '', reference: '', note: '' });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadDoc.mutateAsync({ file, consignment_id: c.id, store_id: c.store_id, doc_type: docType });
    e.target.value = '';
  };

  const canComplete = c.status === 'DELIVERED' && docs.length > 0;
  const handleComplete = async () => {
    if (!canComplete) { toast.error('Status must be Delivered and at least one document uploaded'); return; }
    await updateStatus.mutateAsync({ id: c.id, status: 'COMPLETED', remarks: 'Marked completed', storeId: c.store_id });
  };

  const toggleLock = async () => {
    await save.mutateAsync({ id: c.id, is_locked: !c.is_locked } as any);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/inventory/consignments')}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-xl font-bold">{c.consignment_code}</h1>
            <p className="text-xs text-muted-foreground">{c.product_name} · {c.origin_country} → {c.destination}</p>
          </div>
          <Badge variant="outline">{(statusLabelMap[c.status] || c.status)}</Badge>
          {c.is_locked && <Badge variant="outline" className="bg-amber-500/15 text-amber-600">Locked</Badge>}
          {c.is_completed && <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600">Completed</Badge>}
        </div>
        <div className="flex gap-2">
          
          {!isReadOnly && <Button variant="outline" onClick={toggleLock}>{c.is_locked ? <><Unlock className="h-4 w-4 mr-1" /> Unlock</> : <><Lock className="h-4 w-4 mr-1" /> Lock</>}</Button>}
          {!isReadOnly && <Button onClick={handleComplete} disabled={c.is_completed}><CheckCircle2 className="h-4 w-4 mr-1" /> Mark Completed</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Customer Billing</div><div className="text-lg font-bold">{billing.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Cost</div><div className="text-lg font-bold">{totalCost.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Profit</div><div className={`text-lg font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{profit.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Receivable</div><div className="text-lg font-bold">{receivable.toLocaleString()}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="status">Status Timeline</TabsTrigger>
          <TabsTrigger value="costs">Costing</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-3 mt-3">
          <div className="grid md:grid-cols-2 gap-3">
            <Card><CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader><CardContent className="text-sm space-y-1">
              <div><b>Name:</b> {(c as any).customer?.name || '-'}</div>
              <div><b>Phone:</b> {(c as any).customer?.phone || '-'}</div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Supplier</CardTitle></CardHeader><CardContent className="text-sm space-y-1">
              <div><b>Name:</b> {(c as any).supplier?.name || '-'}</div>
              <div><b>Phone:</b> {(c as any).supplier?.phone || '-'}</div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Product</CardTitle></CardHeader><CardContent className="text-sm grid grid-cols-2 gap-2">
              <div><b>Name:</b> {c.product_name || '-'}</div>
              <div><b>Category:</b> {c.product_category || '-'}</div>
              <div><b>Qty:</b> {c.quantity || '-'} {c.unit}</div>
              <div><b>Weight:</b> {c.weight || '-'}</div>
              <div><b>CBM:</b> {c.cbm || '-'}</div>
              <div><b>Mode:</b> {c.shipment_mode || '-'}</div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Shipment</CardTitle></CardHeader><CardContent className="text-sm grid grid-cols-2 gap-2">
              <div><b>Shipment ID:</b> {c.shipment_id || '-'}</div>
              <div><b>Container:</b> {c.container_number || '-'}</div>
              <div><b>Tracking:</b> {c.tracking_number || '-'}</div>
              <div><b>Vehicle:</b> {c.vehicle_number || '-'}</div>
              <div><b>Agent:</b> {c.agent_name || '-'}</div>
              <div><b>Carrier:</b> {c.carrier_name || '-'}</div>
              <div><b>Current Loc:</b> {c.current_location || '-'}</div>
              <div><b>ETA:</b> {c.eta || c.expected_arrival_date || '-'}</div>
              <div className="col-span-2"><b>Delivery Address:</b> {c.delivery_address || '-'}</div>
              <div className="col-span-2"><b>Notes:</b> {c.notes || '-'}</div>
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="status" className="mt-3">
          <Card><CardContent className="p-4 space-y-4">
            {!isReadOnly && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Select value={statusForm.status} onValueChange={v => setStatusForm({ ...statusForm, status: v as ConsignmentStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{activeStatusOptions.map(s => <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="md:col-span-2" placeholder="Remarks" value={statusForm.remarks} onChange={e => setStatusForm({ ...statusForm, remarks: e.target.value })} />
                <Button onClick={handleStatusUpdate} disabled={updateStatus.isPending}>Update Status</Button>
              </div>
            )}
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
              <TableBody>
                {history.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No history</TableCell></TableRow> : history.map((h: any) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{new Date(h.changed_at).toLocaleString()}</TableCell>
                    <TableCell>{h.previous_status ? (statusLabelMap[h.previous_status as string] || h.previous_status) : '-'}</TableCell>
                    <TableCell><Badge variant="outline">{(statusLabelMap[h.new_status as string] || h.new_status)}</Badge></TableCell>
                    <TableCell className="text-xs">{h.remarks || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="costs" className="mt-3">
          <Card><CardContent className="p-4 space-y-4">
            <div className="rounded border bg-muted/30 p-3 text-xs text-muted-foreground">
              💡 Costs auto-track from <b>Paid</b> payments — add them in the <b>Payments</b> tab. This view shows the breakdown.
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Category (Payment For)</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {Object.keys(paidByCategory).length === 0 && manualCost === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-4">No costs yet. Add a Paid payment to start.</TableCell></TableRow>
                ) : (
                  <>
                    {Object.entries(paidByCategory).map(([cat, amt]) => (
                      <TableRow key={cat}>
                        <TableCell><Badge variant="outline">{cat}</Badge></TableCell>
                        <TableCell className="text-right">{Number(amt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
                {costs.length > 0 && (
                  <>
                    <TableRow><TableCell colSpan={2} className="text-xs italic text-muted-foreground pt-4">Legacy manual cost entries:</TableCell></TableRow>
                    {costs.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell><Badge variant="outline">{r.cost_type}</Badge> <span className="text-xs text-muted-foreground">{r.description || ''}</span></TableCell>
                        <TableCell className="text-right">
                          {Number(r.amount).toLocaleString()}
                          {!c.is_locked && !isReadOnly && <Button size="icon" variant="ghost" onClick={() => delCost.mutate({ id: r.id, consignment_id: c.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
                <TableRow><TableCell className="font-bold text-right">Total Cost</TableCell><TableCell className="text-right font-bold">{totalCost.toLocaleString()}</TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>


        <TabsContent value="payments" className="mt-3">
          <Card><CardContent className="p-4 space-y-4">

            {!c.is_locked && !isReadOnly && (
              <form onSubmit={handleAddPayment} className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <Select value={payForm.direction} onValueChange={v => setPayForm({ ...payForm, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="RECEIVED">Received</SelectItem><SelectItem value="PAID">Paid</SelectItem></SelectContent>
                </Select>
                <Select value={payForm.payment_for} onValueChange={v => setPayForm({ ...payForm, payment_for: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{activePaymentCategories.map(t => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="Amount" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required />
                <Input type="date" value={payForm.payment_date} onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} />
                <Input placeholder="Method / Ref" value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })} />
                <Button type="submit">Add</Button>
              </form>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="p-3 rounded border bg-emerald-500/5"><div className="text-xs text-muted-foreground">Received from Customer</div><div className="font-bold">{totalReceived.toLocaleString()}</div></div>
              <div className="p-3 rounded border bg-red-500/5"><div className="text-xs text-muted-foreground">Paid out</div><div className="font-bold">{totalPaid.toLocaleString()}</div></div>
              <div className="p-3 rounded border"><div className="text-xs text-muted-foreground">Receivable</div><div className="font-bold">{receivable.toLocaleString()}</div></div>
              <div className="p-3 rounded border bg-blue-500/5"><div className="text-xs text-muted-foreground">Net (In Hand)</div><div className={`font-bold ${(totalReceived - totalPaid) >= 0 ? 'text-blue-600' : 'text-destructive'}`}>{(totalReceived - totalPaid).toLocaleString()}</div></div>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Direction</TableHead><TableHead>For</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">No payments</TableCell></TableRow> : payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{p.payment_date}</TableCell>
                    <TableCell><Badge variant="outline" className={p.direction === 'RECEIVED' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'}>{p.direction}</Badge></TableCell>
                    <TableCell>{p.payment_for}</TableCell>
                    <TableCell className="text-xs">{p.payment_method || '-'}</TableCell>
                    <TableCell className="text-right">{Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{!c.is_locked && !isReadOnly && <Button size="icon" variant="ghost" onClick={() => delPayment.mutate({ id: p.id, consignment_id: c.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-3">
          <Card><CardContent className="p-4 space-y-4">
            <div className="flex gap-2 items-end flex-wrap">
              <div className="space-y-1"><Label className="text-xs">Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <label className="cursor-pointer">
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploadDoc.isPending} />
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"><Upload className="h-4 w-4" /> {uploadDoc.isPending ? 'Uploading...' : 'Upload File'}</span>
              </label>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>File</TableHead><TableHead>Uploaded</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {docs.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No documents</TableCell></TableRow> : docs.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell><Badge variant="outline">{d.doc_type}</Badge></TableCell>
                    <TableCell className="text-xs">{d.file_name}</TableCell>
                    <TableCell className="text-xs">{new Date(d.uploaded_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" asChild><a href={d.file_url} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /></a></Button>
                      <Button size="icon" variant="ghost" onClick={() => delDoc.mutate({ id: d.id, consignment_id: c.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
