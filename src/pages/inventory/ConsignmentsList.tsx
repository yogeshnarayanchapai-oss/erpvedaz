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
import { Package, Plus, Eye, Edit2, Trash2, Truck, CheckCircle2, Clock, Ship, Download, Menu } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { SearchablePartySelect } from '@/components/accounting/SearchablePartySelect';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useConsignments, useSaveConsignment, useDeleteConsignment, useUpdateConsignmentStatus, Consignment, CONSIGNMENT_STATUSES, STATUS_LABELS, ConsignmentStatus, ShipmentMode } from '@/hooks/useConsignments';
import * as XLSX from 'xlsx';

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

const emptyForm: any = {
  customer_party_id: '', supplier_party_id: '',
  product_name: '', product_category: '', quantity: '', unit: '', weight: '', cbm: '',
  origin_country: '', destination: '', shipment_mode: 'SEA',
  order_date: new Date().toISOString().slice(0,10), expected_arrival_date: '',
  notes: '',
  shipment_id: '', container_number: '', tracking_number: '', vehicle_number: '',
  agent_name: '', carrier_name: '', warehouse_location: '', current_location: '',
  eta: '', delivery_address: '',
  customer_billing_amount: '',
  status: 'INQUIRY_RECEIVED' as ConsignmentStatus,
};

export default function ConsignmentsList() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [mode, setMode] = useState('all');
  const [origin, setOrigin] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: rows = [], isLoading } = useConsignments({
    search, status, mode, origin, from, to,
    completed: tab === 'completed',
  });

  // counts (separate query unfiltered for stat cards - reuse same hook without completed filter)
  const { data: allRows = [] } = useConsignments({});

  const stats = useMemo(() => {
    const active = allRows.filter(r => !r.is_completed);
    return {
      active: active.length,
      completed: allRows.filter(r => r.is_completed).length,
      inTransit: active.filter(r => IN_TRANSIT_STATUSES.includes(r.status)).length,
      customs: active.filter(r => CUSTOMS_STATUSES.includes(r.status)).length,
      receivable: active.reduce((s, r) => s + (Number(r.customer_billing_amount) || 0), 0),
      payable: active.reduce((s, r) => s + (Number(r.total_cost) || 0), 0),
      profit: active.reduce((s, r) => s + (Number(r.estimated_profit) || 0), 0),
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

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDlgOpen(true); };
  const openEdit = (c: Consignment) => {
    setEditing(c);
    setForm({
      ...emptyForm, ...c,
      customer_party_id: c.customer_party_id || '',
      supplier_party_id: c.supplier_party_id || '',
      quantity: c.quantity ?? '', weight: c.weight ?? '', cbm: c.cbm ?? '',
      customer_billing_amount: c.customer_billing_amount ?? '',
    });
    setDlgOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = (v: any) => v === '' || v == null ? null : Number(v);
    const payload: any = {
      ...form,
      customer_party_id: form.customer_party_id || null,
      supplier_party_id: form.supplier_party_id || null,
      quantity: num(form.quantity),
      weight: num(form.weight),
      cbm: num(form.cbm),
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
      Status: STATUS_LABELS[r.status],
      ETA: r.eta || r.expected_arrival_date || '',
      Billing: r.customer_billing_amount || 0,
      Cost: r.total_cost || 0,
      Profit: r.estimated_profit || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consignments');
    XLSX.writeFile(wb, `consignments_${tab}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" /> Consignment Management</h1>
          <p className="text-sm text-muted-foreground">Track and manage import / export consignments end-to-end</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportXlsx}><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Consignment</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard title="Active" value={stats.active} icon={<Package className="h-4 w-4" />} variant="primary" />
        <StatCard title="Completed" value={stats.completed} icon={<CheckCircle2 className="h-4 w-4" />} variant="success" />
        <StatCard title="In Transit" value={stats.inTransit} icon={<Ship className="h-4 w-4" />} variant="info" />
        <StatCard title="Customs Pending" value={stats.customs} icon={<Clock className="h-4 w-4" />} variant="warning" />
        <StatCard title="Receivable / Payable" value={`${stats.receivable.toLocaleString()} / ${stats.payable.toLocaleString()}`} description={`Est. Profit: ${stats.profit.toLocaleString()}`} icon={<Truck className="h-4 w-4" />} variant="default" />
      </div>

      <Card>
        <CardContent className="p-3 grid grid-cols-2 md:grid-cols-6 gap-2">
          <Input placeholder="Search code / customer / supplier / product" value={search} onChange={e => setSearch(e.target.value)} className="md:col-span-2" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Status</SelectItem>{CONSIGNMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
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
          <div className="flex gap-1">
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
        <TabsList>
          <TabsTrigger value="active">Active Consignments</TabsTrigger>
          <TabsTrigger value="completed">Completed Consignments</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-3">
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
                    <TableHead>ETA</TableHead>
                    <TableHead className="text-right">Billing</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No consignments found</TableCell></TableRow>
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
                      <TableCell onDoubleClick={(e) => { e.stopPropagation(); setInlineStatusId(r.id); }} onClick={(e) => e.stopPropagation()}>
                        {inlineStatusId === r.id ? (
                          <Select value={r.status} onValueChange={(v) => { updateStatus.mutate({ id: r.id, status: v as ConsignmentStatus, storeId: storeId! }); setInlineStatusId(null); }} onOpenChange={(o) => { if (!o) setInlineStatusId(null); }}>
                            <SelectTrigger className="h-7 text-xs w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{CONSIGNMENT_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{r.eta || r.expected_arrival_date || '-'}</TableCell>
                      <TableCell className="text-right">{(r.customer_billing_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(r.total_cost || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(r.estimated_profit || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost"><Menu className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/inventory/consignments/${r.id}`)}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(r)} disabled={r.is_locked}><Edit2 className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
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
        </TabsContent>
      </Tabs>

      {/* Create / Edit dialog */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="!max-w-[1100px] max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.consignment_code}` : 'New Consignment'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <section>
              <h3 className="font-semibold text-sm mb-2">Basic Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><Label>Customer</Label><SearchablePartySelect value={form.customer_party_id} onValueChange={v => setForm({ ...form, customer_party_id: v })} partyType="CUSTOMER" showAddButton={false} /></div>
                <div><Label>Supplier</Label><SearchablePartySelect value={form.supplier_party_id} onValueChange={v => setForm({ ...form, supplier_party_id: v })} partyType="SUPPLIER" showAddButton={false} /></div>
                <div><Label>Product Name</Label><Input value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} /></div>
                <div><Label>Category</Label><Input value={form.product_category} onChange={e => setForm({ ...form, product_category: e.target.value })} /></div>
                <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
                <div><Label>Unit</Label><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
                <div><Label>Weight (kg)</Label><Input type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
                <div><Label>CBM / Volume</Label><Input type="number" value={form.cbm} onChange={e => setForm({ ...form, cbm: e.target.value })} /></div>
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
                    <SelectContent>{CONSIGNMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </section>
            <section>
              <h3 className="font-semibold text-sm mb-2">Shipment Details</h3>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDlgOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save'}</Button>
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
    </div>
  );
}
