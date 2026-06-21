import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Package, Plus, Eye, Edit2, Trash2, Truck, CheckCircle2, Clock, Ship, Download, Menu, Settings } from 'lucide-react';
import { ConsignmentSettingsDialog } from '@/components/inventory/ConsignmentSettingsDialog';
import { useConsignmentSettings } from '@/hooks/useConsignmentSettings';
import { StatCard } from '@/components/dashboard/StatCard';
import { SearchablePartySelect } from '@/components/accounting/SearchablePartySelect';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useConsignments, useSaveConsignment, useDeleteConsignment, useUpdateConsignmentStatus, useConsignmentActivityLogs, Consignment, CONSIGNMENT_STATUSES, STATUS_LABELS, ConsignmentStatus, ShipmentMode } from '@/hooks/useConsignments';
import { exportConsignmentPDF } from '@/lib/consignmentPdf';
import { format, subDays } from 'date-fns';
import * as XLSX from 'xlsx';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';

const formatCompactAmount = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}${(abs / 10000000).toFixed(abs % 10000000 === 0 ? 0 : 2).replace(/\.?0+$/, '')}Cr`;
  if (abs >= 100000) return `${sign}${(abs / 100000).toFixed(abs % 100000 === 0 ? 0 : 2).replace(/\.?0+$/, '')}L`;
  return Math.round(n).toLocaleString();
};

const STATUS_COLORS: Record<string, string> = {
  INQUIRY_RECEIVED: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
  QUOTATION_SENT: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
  ORDER_CONFIRMED: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  ADVANCE_RECEIVED: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  SUPPLIER_ORDERED: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  GOODS_READY: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  PICKED_UP: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  IN_ORIGIN_WAREHOUSE: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  SHIPPED: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  IN_TRANSIT: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  ARRIVED_AT_PORT: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  CUSTOMS_PENDING: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  CUSTOMS_CLEARED: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  IN_NEPAL_WAREHOUSE: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  OUT_FOR_DELIVERY: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  DELIVERED: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  COMPLETED: 'bg-green-700/15 text-green-700 border-green-700/30',
};

const IN_TRANSIT_STATUSES: ConsignmentStatus[] = ['SHIPPED', 'IN_TRANSIT', 'ARRIVED_AT_PORT'];
const CUSTOMS_STATUSES: ConsignmentStatus[] = ['CUSTOMS_PENDING'];

function formatIndianShort(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return '0';
  const crore = 10000000;
  const lakh = 100000;
  if (abs >= crore) {
    return (n / crore).toFixed(2).replace(/\.00$/, '') + ' CR';
  }
  return (n / lakh).toFixed(1).replace(/\.0$/, '') + 'L';
}

const emptyForm: any = {
  customer_party_id: '', supplier_party_id: '',
  product_name: '', product_category: '',
  measurement_type: 'QUANTITY', measurement_value: '', quantity: '', unit: '', weight: '', cbm: '',
  origin_country: '', destination: '', shipment_mode: 'SEA',
  order_date: new Date().toISOString().slice(0,10), expected_arrival_date: '',
  notes: '',
  shipment_id: '', container_number: '', tracking_number: '', vehicle_number: '',
  agent_name: '', carrier_name: '', warehouse_location: '', current_location: '',
  eta: '', delivery_address: '',
  customer_billing_amount: '',
  status: 'INQUIRY_RECEIVED' as ConsignmentStatus,
};

function inferMeasurement(c: Partial<Consignment>): { measurement_type: string; measurement_value: string } {
  if (c.weight != null && Number(c.weight) > 0) return { measurement_type: 'WEIGHT', measurement_value: String(c.weight) };
  if (c.cbm != null && Number(c.cbm) > 0) return { measurement_type: 'VOLUME', measurement_value: String(c.cbm) };
  if (c.quantity != null && Number(c.quantity) > 0) return { measurement_type: 'QUANTITY', measurement_value: String(c.quantity) };
  return { measurement_type: 'QUANTITY', measurement_value: '' };
}


export default function ConsignmentsList() {
  const navigate = useNavigate();
  const { effectiveRole } = useEffectiveRole();
  const isReadOnly = effectiveRole === 'ACCOUNTANT';
  const [mainTab, setMainTab] = useState<'active' | 'completed' | 'activity'>('active');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [mode, setMode] = useState('all');
  const [origin, setOrigin] = useState('');
  const { data: rows = [], isLoading } = useConsignments({
    search, status, mode, origin,
    completed: mainTab === 'completed' ? true : mainTab === 'activity' ? undefined : false,
  });

  // Activity tab filters
  const [actStart, setActStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [actEnd, setActEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [actAction, setActAction] = useState('all');
  const [actSearch, setActSearch] = useState('');
  const { data: activityLogs = [], isLoading: actLoading } = useConsignmentActivityLogs({
    startDate: actStart, endDate: actEnd, action: actAction, search: actSearch,
  });

  // counts (separate query unfiltered for stat cards)
  const { data: allRows = [] } = useConsignments({});

  const stats = useMemo(() => {
    const active = allRows.filter(r => !r.is_completed);
    return {
      active: active.length,
      completed: allRows.filter(r => r.is_completed).length,
      inTransit: active.filter(r => IN_TRANSIT_STATUSES.includes(r.status)).length,
      customs: active.filter(r => CUSTOMS_STATUSES.includes(r.status)).length,
      billing: active.reduce((s, r) => s + (Number(r.customer_billing_amount) || 0), 0),
      received: active.reduce((s, r: any) => s + (Number(r.total_received) || 0), 0),
      cost: active.reduce((s, r) => s + (Number(r.total_cost) || 0), 0),
      receivable: active.reduce((s, r: any) => s + Math.max(0, Number(r.receivable) || 0), 0),
      payable: active.reduce((s, r) => s + Math.max(0, Number(r.total_cost) || 0), 0),
      profit: allRows.filter(r => r.is_completed).reduce((s, r) => s + (Number(r.estimated_profit) || 0), 0),
    };
  }, [allRows]);



  const save = useSaveConsignment();
  const del = useDeleteConsignment();
  const updateStatus = useUpdateConsignmentStatus();
  const storeId = useCurrentStoreId();
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editing, setEditing] = useState<Consignment | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [delId, setDelId] = useState<string | null>(null);
  const [inlineStatusId, setInlineStatusId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: statusOptions = [] } = useConsignmentSettings('STATUS');
  const activeStatusOptions = statusOptions.filter(s => s.is_active);
  const statusLabelMap: Record<string, string> = {
    ...STATUS_LABELS,
    ...Object.fromEntries(statusOptions.map(s => [s.code, s.label])),
  };

  const calcDays = (r: Consignment) => {
    const start = new Date(r.created_at).getTime();
    const end = r.is_completed && r.completed_at ? new Date(r.completed_at).getTime() : Date.now();
    return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setStep(1); setDlgOpen(true); };
  const openEdit = (c: Consignment) => {
    const m = inferMeasurement(c);
    setEditing(c);
    setForm({
      ...emptyForm, ...c,
      customer_party_id: c.customer_party_id || '',
      supplier_party_id: c.supplier_party_id || '',
      quantity: c.quantity ?? '', weight: c.weight ?? '', cbm: c.cbm ?? '',
      measurement_type: m.measurement_type, measurement_value: m.measurement_value,
      customer_billing_amount: c.customer_billing_amount ?? '',
    });
    setStep(1);
    setDlgOpen(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (save.isPending) return;
    const num = (v: any) => v === '' || v == null ? null : Number(v);
    // Map measurement_type + value to the right column
    const mv = num(form.measurement_value);
    const mappedQuantity = form.measurement_type === 'QUANTITY' ? mv : null;
    const mappedWeight = form.measurement_type === 'WEIGHT' ? mv : null;
    const mappedCbm = form.measurement_type === 'VOLUME' ? mv : null;
    const { measurement_type, measurement_value, ...rest } = form;
    const payload: any = {
      ...rest,
      customer_party_id: form.customer_party_id || null,
      supplier_party_id: form.supplier_party_id || null,
      quantity: mappedQuantity,
      weight: mappedWeight,
      cbm: mappedCbm,
      unit: form.measurement_type === 'QUANTITY' ? (form.unit || null) : (form.measurement_type === 'WEIGHT' ? 'kg' : form.measurement_type === 'VOLUME' ? 'CBM' : null),
      customer_billing_amount: num(form.customer_billing_amount),
      expected_arrival_date: form.expected_arrival_date || null,
      eta: form.eta || null,
    };
    if (editing) payload.id = editing.id;
    await save.mutateAsync(payload);
    setDlgOpen(false);
  };


  const exportXlsx = () => {
    const data = rows.map(r => ({
      Code: r.consignment_code,
      Customer: r.customer?.name || '',
      Supplier: r.supplier?.name || '',
      Product: r.product_name || '',
      Mode: r.shipment_mode || '',
      Origin: r.origin_country || '',
      Destination: r.destination || '',
      Status: (statusLabelMap[r.status] || r.status),
      ETA: r.eta || r.expected_arrival_date || '',
      'Time (Days)': calcDays(r),
      Billing: r.customer_billing_amount || 0,
      Cost: r.total_cost || 0,
      Profit: r.estimated_profit || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consignments');
    XLSX.writeFile(wb, `consignments_${mainTab}_${status}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" /> Consignment Management</h1>
          <p className="text-sm text-muted-foreground">Track and manage import / export consignments end-to-end</p>
        </div>
        <div className="flex gap-2">
          {!isReadOnly && <Button variant="outline" onClick={() => setSettingsOpen(true)}><Settings className="h-4 w-4 mr-1" /> Settings</Button>}
          <Button variant="outline" onClick={exportXlsx}><Download className="h-4 w-4 mr-1" /> Export</Button>
          {!isReadOnly && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Consignment</Button>}
        </div>
      </div>

      {/* Top summary: status card + financial card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Consignment Status</div>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => { setMainTab('active'); setStatus('all'); }}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-colors ${mainTab === 'active' && status === 'all' ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted/50'}`}
              >
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Active</span>
                <span className="text-base font-bold">{stats.active}</span>
              </button>
              <button
                onClick={() => { setMainTab('completed'); setStatus('all'); }}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-colors ${mainTab === 'completed' ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted/50'}`}
              >
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Complete</span>
                <span className="text-base font-bold">{stats.completed}</span>
              </button>
              <button
                onClick={() => { setMainTab('active'); setStatus('IN_TRANSIT'); }}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-colors ${mainTab === 'active' && status === 'IN_TRANSIT' ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted/50'}`}
              >
                <span className="text-[10px] font-medium text-muted-foreground uppercase">In Transit</span>
                <span className="text-base font-bold">{stats.inTransit}</span>
              </button>
              <button
                onClick={() => { setMainTab('active'); setStatus('CUSTOMS_PENDING'); }}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-colors ${mainTab === 'active' && status === 'CUSTOMS_PENDING' ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted/50'}`}
              >
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Customs</span>
                <span className="text-base font-bold">{stats.customs}</span>
              </button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Financial Overview</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="flex flex-col items-center justify-center gap-1 rounded-lg border p-2 bg-card">
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Receivable</span>
                <span className="text-base font-bold">{formatIndianShort(stats.receivable)}</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 rounded-lg border p-2 bg-card">
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Cost</span>
                <span className="text-base font-bold">{formatIndianShort(stats.payable)}</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 rounded-lg border p-2 bg-blue-500/5">
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Net (In Hand)</span>
                <span className={`text-base font-bold ${(stats.received - stats.cost) >= 0 ? 'text-blue-600' : 'text-destructive'}`}>{formatIndianShort(stats.received - stats.cost)}</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 rounded-lg border p-2 bg-card">
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Est. Profit</span>
                <span className="text-base font-bold">{formatIndianShort(stats.profit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3 grid grid-cols-2 md:grid-cols-5 gap-2">
          <Input placeholder="Search code / customer / supplier / product" value={search} onChange={e => setSearch(e.target.value)} className="md:col-span-2" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Status</SelectItem>{activeStatusOptions.map(s => <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="AIR">Air</SelectItem><SelectItem value="SEA">Sea</SelectItem>
              <SelectItem value="ROAD">Road</SelectItem><SelectItem value="COURIER">Courier</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Origin country" value={origin} onChange={e => setOrigin(e.target.value)} />
        </CardContent>
      </Card>

      <div>
        <Tabs value={mainTab} onValueChange={(v: any) => { setMainTab(v); setStatus('all'); }}>
          <TabsList className="mb-2">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
        </Tabs>

        {mainTab !== 'activity' && (
          <>
            <div className="text-sm font-medium mb-2 capitalize">
              {mainTab === 'active' ? 'Active Consignments' : 'Completed Consignments'}
              <span className="ml-2 text-xs text-muted-foreground">({rows.length})</span>
            </div>
            <div className="mt-3">
              <Card>
                <CardContent className="p-0 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                      <TableHead>Code</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time (Days)</TableHead>
                        <TableHead className="text-right">Billing</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">In Hand</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                      ) : rows.length === 0 ? (
                        <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">No consignments found</TableCell></TableRow>
                      ) : rows.map(r => (
                        <TableRow key={r.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/admin/inventory/consignments/${r.id}`)}>
                          <TableCell className="font-medium">
                            <button className="text-left hover:underline focus:outline-none" onClick={(e) => { e.stopPropagation(); navigate(`/admin/inventory/consignments/${r.id}`); }}>
                              {r.consignment_code}
                            </button>
                          </TableCell>
                          <TableCell>{r.customer?.name || '-'}</TableCell>
                          <TableCell>{r.supplier?.name || '-'}</TableCell>
                          <TableCell>{r.product_name || '-'}</TableCell>
                          <TableCell>{r.shipment_mode || '-'}</TableCell>
                          <TableCell className="text-xs">{r.origin_country || '-'} → {r.destination || '-'}</TableCell>
                          <TableCell onDoubleClick={(e) => { if (isReadOnly) return; e.stopPropagation(); setInlineStatusId(r.id); }} onClick={(e) => e.stopPropagation()}>
                            {inlineStatusId === r.id && !isReadOnly ? (
                              <Select value={r.status} onValueChange={(v) => { updateStatus.mutate({ id: r.id, status: v as ConsignmentStatus, storeId: storeId! }); setInlineStatusId(null); }} onOpenChange={(o) => { if (!o) setInlineStatusId(null); }}>
                                <SelectTrigger className="h-7 text-xs w-[160px]"><SelectValue /></SelectTrigger>
                                <SelectContent>{activeStatusOptions.map(s => <SelectItem key={s.code} value={s.code} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className={STATUS_COLORS[r.status]}>{(statusLabelMap[r.status] || r.status)}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{calcDays(r)}</TableCell>
                          <TableCell className="text-right">{formatCompactAmount(r.customer_billing_amount || 0)}</TableCell>
                          <TableCell className="text-right">{formatCompactAmount(r.total_cost || 0)}</TableCell>
                          <TableCell className="text-right">{formatCompactAmount(r.estimated_profit || 0)}</TableCell>
                          <TableCell className={`text-right font-medium ${((r as any).total_received || 0) - ((r as any).total_cost || 0) < 0 ? 'text-destructive' : 'text-foreground'}`}>
                            {formatCompactAmount(((r as any).total_received || 0) - ((r as any).total_cost || 0))}
                          </TableCell>
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost"><Menu className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/admin/inventory/consignments/${r.id}`)}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(r)} disabled={r.is_locked}><Edit2 className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportConsignmentPDF(r)}><Download className="h-4 w-4 mr-2" /> Export PDF</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDelId(r.id)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {mainTab === 'activity' && (
          <ActivitySection
            startDate={actStart} setStartDate={setActStart}
            endDate={actEnd} setEndDate={setActEnd}
            action={actAction} setAction={setActAction}
            search={actSearch} setSearch={setActSearch}
            logs={activityLogs} isLoading={actLoading}
            onOpenConsignment={(id) => navigate(`/admin/inventory/consignments/${id}`)}
          />
        )}
      </div>



      {/* Create / Edit dialog */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="!max-w-[1100px] max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.consignment_code}` : 'New Consignment'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {step === 1 && (
              <section>
                <h3 className="font-semibold text-sm mb-2">Basic Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><Label>Customer</Label><SearchablePartySelect value={form.customer_party_id} onValueChange={v => setForm({ ...form, customer_party_id: v })} partyType="CUSTOMER" showAddButton={false} /></div>
                  <div><Label>Supplier</Label><SearchablePartySelect value={form.supplier_party_id} onValueChange={v => setForm({ ...form, supplier_party_id: v })} partyType="SUPPLIER" showAddButton={false} /></div>
                  <div><Label>Product Name</Label><Input value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} /></div>
                  <div><Label>Category</Label><Input value={form.product_category} onChange={e => setForm({ ...form, product_category: e.target.value })} /></div>
                  <div>
                    <Label>Measure By</Label>
                    <Select value={form.measurement_type} onValueChange={v => setForm({ ...form, measurement_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUANTITY">Quantity (pcs)</SelectItem>
                        <SelectItem value="WEIGHT">Weight (kg)</SelectItem>
                        <SelectItem value="VOLUME">Volume (CBM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>
                      {form.measurement_type === 'WEIGHT' ? 'Weight (kg)' : form.measurement_type === 'VOLUME' ? 'Volume (CBM)' : 'Quantity'}
                    </Label>
                    <Input type="number" value={form.measurement_value} onChange={e => setForm({ ...form, measurement_value: e.target.value })} placeholder="Enter value" />
                  </div>
                  {form.measurement_type === 'QUANTITY' && (
                    <div><Label>Unit (e.g. pcs, box)</Label><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
                  )}
                  <div><Label>Shipment Mode</Label>
                    <Select value={form.shipment_mode} onValueChange={v => setForm({ ...form, shipment_mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="AIR">Air</SelectItem><SelectItem value="SEA">Sea</SelectItem><SelectItem value="ROAD">Road</SelectItem><SelectItem value="COURIER">Courier</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Origin Country</Label><Input value={form.origin_country} onChange={e => setForm({ ...form, origin_country: e.target.value })} /></div>
                  <div><Label>Destination</Label><Input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} /></div>
                  <div><Label>Order Date</Label><Input type="date" value={form.order_date} onChange={e => setForm({ ...form, order_date: e.target.value })} /></div>
                  <div><Label>Expected Arrival</Label><Input type="date" value={form.expected_arrival_date} onChange={e => setForm({ ...form, expected_arrival_date: e.target.value })} /></div>
                  <div><Label>Customer Billing Amount</Label><Input type="number" value={form.customer_billing_amount} onChange={e => setForm({ ...form, customer_billing_amount: e.target.value })} /></div>
                  <div><Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{activeStatusOptions.map(s => <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Shipment Details <span className="text-xs font-normal text-muted-foreground">(optional)</span></h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><Label>Shipment ID</Label><Input value={form.shipment_id} onChange={e => setForm({ ...form, shipment_id: e.target.value })} /></div>
                  <div><Label>Container No.</Label><Input value={form.container_number} onChange={e => setForm({ ...form, container_number: e.target.value })} /></div>
                  <div><Label>Tracking No.</Label><Input value={form.tracking_number} onChange={e => setForm({ ...form, tracking_number: e.target.value })} /></div>
                  <div><Label>Vehicle No.</Label><Input value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} /></div>
                  <div><Label>Agent / Forwarder</Label><Input value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} /></div>
                  <div><Label>Carrier</Label><Input value={form.carrier_name} onChange={e => setForm({ ...form, carrier_name: e.target.value })} /></div>
                  <div><Label>Warehouse Location</Label><Input value={form.warehouse_location} onChange={e => setForm({ ...form, warehouse_location: e.target.value })} /></div>
                  <div><Label>Current Location</Label><Input value={form.current_location} onChange={e => setForm({ ...form, current_location: e.target.value })} /></div>
                  <div><Label>ETA</Label><Input type="date" value={form.eta} onChange={e => setForm({ ...form, eta: e.target.value })} /></div>
                  <div className="md:col-span-3"><Label>Delivery Address</Label><Input value={form.delivery_address} onChange={e => setForm({ ...form, delivery_address: e.target.value })} /></div>
                  <div className="md:col-span-3"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                </div>
              </section>
            )}

            <DialogFooter className="flex-wrap gap-2">
              <div className="flex-1 text-xs text-muted-foreground">Step {step} of 2</div>
              <Button type="button" variant="outline" onClick={() => setDlgOpen(false)}>Cancel</Button>
              {step === 1 ? (
                <>
                  <Button type="button" variant="secondary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSave(); }} disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save & Close'}</Button>
                  <Button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStep(2); }}>Next: Shipment →</Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStep(1); }}>← Back</Button>
                  <Button type="button" variant="secondary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSave(); }} disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save & Close'}</Button>
                  <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save All'}</Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!delId} onOpenChange={o => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete consignment?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. All related costs, payments, documents and history will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (delId) { await del.mutateAsync(delId); setDelId(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConsignmentSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  CONSIGNMENT_CREATED: 'Consignment Created',
  CONSIGNMENT_EDITED: 'Consignment Edited',
  CONSIGNMENT_DELETED: 'Consignment Deleted',
  AMOUNT_EDITED: 'Amount Edited',
  STATUS_CHANGED: 'Status Changed',
  COST_ADDED: 'Cost Added',
  COST_DELETED: 'Cost Deleted',
  PAYMENT_RECEIVED: 'Payment Received',
  PAYMENT_PAID: 'Payment Paid',
  PAYMENT_DELETED: 'Payment Deleted',
};

const ACTION_COLORS: Record<string, string> = {
  CONSIGNMENT_CREATED: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  CONSIGNMENT_EDITED: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  CONSIGNMENT_DELETED: 'bg-red-500/15 text-red-600 border-red-500/30',
  AMOUNT_EDITED: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  STATUS_CHANGED: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  COST_ADDED: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  COST_DELETED: 'bg-red-500/15 text-red-600 border-red-500/30',
  PAYMENT_RECEIVED: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  PAYMENT_PAID: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  PAYMENT_DELETED: 'bg-red-500/15 text-red-600 border-red-500/30',
};

function describeLog(log: any): string {
  const d = log.details || {};
  switch (log.action) {
    case 'CONSIGNMENT_CREATED': return `Created ${d.code || ''}${d.customer_billing_amount ? ` · Billing NPR ${Number(d.customer_billing_amount).toLocaleString()}` : ''}`;
    case 'CONSIGNMENT_DELETED': return `Deleted ${d.code || ''}`;
    case 'AMOUNT_EDITED': {
      const ch = d.changed || {};
      return Object.entries(ch).map(([k, v]: any) => `${k}: ${v.from ?? '-'} → ${v.to ?? '-'}`).join(', ');
    }
    case 'CONSIGNMENT_EDITED': {
      const ch = d.changed || {};
      const keys = Object.keys(ch).slice(0, 3).join(', ');
      return `Edited fields: ${keys}${Object.keys(ch).length > 3 ? '...' : ''}`;
    }
    case 'STATUS_CHANGED': return `${d.from || '-'} → ${d.to || '-'}${d.remarks ? ` · ${d.remarks}` : ''}`;
    case 'COST_ADDED': return `${d.label || 'Cost'} · NPR ${Number(d.amount || 0).toLocaleString()}`;
    case 'COST_DELETED': return `Removed ${d.label || 'cost'} · NPR ${Number(d.amount || 0).toLocaleString()}`;
    case 'PAYMENT_RECEIVED': return `Received NPR ${Number(d.amount || 0).toLocaleString()}${d.method ? ` via ${d.method}` : ''}`;
    case 'PAYMENT_PAID': return `Paid NPR ${Number(d.amount || 0).toLocaleString()}${d.method ? ` via ${d.method}` : ''}`;
    case 'PAYMENT_DELETED': return `Removed ${d.direction || ''} payment · NPR ${Number(d.amount || 0).toLocaleString()}`;
    default: return JSON.stringify(d);
  }
}

function ActivitySection(props: {
  startDate: string; setStartDate: (v: string) => void;
  endDate: string; setEndDate: (v: string) => void;
  action: string; setAction: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  logs: any[]; isLoading: boolean;
  onOpenConsignment: (id: string) => void;
}) {
  const { startDate, setStartDate, endDate, setEndDate, action, setAction, search, setSearch, logs, isLoading, onOpenConsignment } = props;
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">Start Date</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">End Date</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Action Type</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Search</Label>
            <Input placeholder="Code / user / details" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="text-sm font-medium">Activity ({logs.length})</div>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Consignment</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No activity in this period</TableCell></TableRow>
              ) : logs.map(log => (
                <TableRow key={log.id} className={log.consignment_id ? 'hover:bg-muted/50 cursor-pointer' : ''} onClick={() => log.consignment_id && onOpenConsignment(log.consignment_id)}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(log.performed_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ACTION_COLORS[log.action] || ''}>{ACTION_LABELS[log.action] || log.action}</Badge>
                  </TableCell>
                  <TableCell className="font-medium text-xs">{log.consignment_code || '-'}</TableCell>
                  <TableCell className="text-xs max-w-[420px] whitespace-pre-wrap break-words">{describeLog(log)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.performer_name || 'System'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

