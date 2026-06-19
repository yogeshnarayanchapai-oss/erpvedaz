import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useIsModuleStoreWise } from '@/hooks/useModuleStoreSettings';
import { toast } from 'sonner';

async function logActivity(params: { consignment_id: string | null; store_id: string; action: string; details?: any }) {
  try {
    const { data: user } = await supabase.auth.getUser();
    await (supabase as any).from('consignment_activity_logs').insert({
      consignment_id: params.consignment_id,
      store_id: params.store_id,
      action: params.action,
      details: params.details ?? null,
      performed_by: user?.user?.id,
    });
  } catch (e) {
    console.error('activity log failed', e);
  }
}

async function getConsignmentMeta(id: string): Promise<{ store_id: string | null; code: string | null }> {
  const { data } = await (supabase as any).from('consignments').select('store_id, consignment_code').eq('id', id).maybeSingle();
  return { store_id: data?.store_id || null, code: data?.consignment_code || null };
}

export type ConsignmentStatus =
  | 'INQUIRY_RECEIVED' | 'QUOTATION_SENT' | 'ORDER_CONFIRMED' | 'ADVANCE_RECEIVED'
  | 'SUPPLIER_ORDERED' | 'GOODS_READY' | 'PICKED_UP' | 'IN_ORIGIN_WAREHOUSE'
  | 'SHIPPED' | 'IN_TRANSIT' | 'ARRIVED_AT_PORT' | 'CUSTOMS_PENDING'
  | 'CUSTOMS_CLEARED' | 'IN_NEPAL_WAREHOUSE' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED';

export const CONSIGNMENT_STATUSES: ConsignmentStatus[] = [
  'INQUIRY_RECEIVED','QUOTATION_SENT','ORDER_CONFIRMED','ADVANCE_RECEIVED',
  'SUPPLIER_ORDERED','GOODS_READY','PICKED_UP','IN_ORIGIN_WAREHOUSE',
  'SHIPPED','IN_TRANSIT','ARRIVED_AT_PORT','CUSTOMS_PENDING',
  'CUSTOMS_CLEARED','IN_NEPAL_WAREHOUSE','OUT_FOR_DELIVERY','DELIVERED','COMPLETED'
];

export const STATUS_LABELS: Record<ConsignmentStatus, string> = {
  INQUIRY_RECEIVED:'Inquiry Received', QUOTATION_SENT:'Quotation Sent',
  ORDER_CONFIRMED:'Order Confirmed', ADVANCE_RECEIVED:'Advance Received',
  SUPPLIER_ORDERED:'Supplier Ordered', GOODS_READY:'Goods Ready',
  PICKED_UP:'Picked Up', IN_ORIGIN_WAREHOUSE:'In Origin Warehouse',
  SHIPPED:'Shipped', IN_TRANSIT:'In Transit', ARRIVED_AT_PORT:'Arrived at Port',
  CUSTOMS_PENDING:'Customs Pending', CUSTOMS_CLEARED:'Customs Cleared',
  IN_NEPAL_WAREHOUSE:'In Nepal Warehouse', OUT_FOR_DELIVERY:'Out for Delivery',
  DELIVERED:'Delivered', COMPLETED:'Completed',
};

export type ShipmentMode = 'AIR' | 'SEA' | 'ROAD' | 'COURIER';

export interface Consignment {
  id: string;
  store_id: string;
  consignment_code: string;
  customer_party_id: string | null;
  supplier_party_id: string | null;
  product_name: string | null;
  product_category: string | null;
  quantity: number | null;
  unit: string | null;
  weight: number | null;
  cbm: number | null;
  origin_country: string | null;
  destination: string | null;
  shipment_mode: ShipmentMode | null;
  order_date: string | null;
  expected_arrival_date: string | null;
  notes: string | null;
  shipment_id: string | null;
  container_number: string | null;
  tracking_number: string | null;
  vehicle_number: string | null;
  agent_name: string | null;
  carrier_name: string | null;
  warehouse_location: string | null;
  current_location: string | null;
  eta: string | null;
  delivery_address: string | null;
  status: ConsignmentStatus;
  customer_billing_amount: number | null;
  total_cost: number | null;
  estimated_profit: number | null;
  actual_profit: number | null;
  is_completed: boolean;
  completed_at: string | null;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  customer?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
}

export function useConsignments(filters?: { search?: string; status?: string; mode?: string; origin?: string; completed?: boolean }) {
  const storeId = useCurrentStoreId();
  return useQuery({
    queryKey: ['consignments', storeId, filters],
    enabled: !!storeId,
    queryFn: async () => {
      let q = (supabase as any).from('consignments').select(`
        *,
        customer:parties!consignments_customer_party_id_fkey(id, name),
        supplier:parties!consignments_supplier_party_id_fkey(id, name)
      `).eq('store_id', storeId).order('created_at', { ascending: false });

      if (filters?.completed !== undefined) q = q.eq('is_completed', filters.completed);
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.mode && filters.mode !== 'all') q = q.eq('shipment_mode', filters.mode);
      if (filters?.origin) q = q.ilike('origin_country', `%${filters.origin}%`);

      const { data, error } = await q;
      if (error) throw error;
      let rows = (data || []) as Consignment[];

      // Aggregate live totals from costs + payments so edits/deletes reflect immediately
      const ids = rows.map(r => r.id);
      if (ids.length) {
        const [{ data: costs }, { data: pays }] = await Promise.all([
          (supabase as any).from('consignment_costs').select('consignment_id, amount').in('consignment_id', ids),
          (supabase as any).from('consignment_payments').select('consignment_id, direction, amount').in('consignment_id', ids),
        ]);
        const costMap: Record<string, number> = {};
        (costs || []).forEach((c: any) => { costMap[c.consignment_id] = (costMap[c.consignment_id] || 0) + Number(c.amount || 0); });
        const paidMap: Record<string, number> = {};
        const recvMap: Record<string, number> = {};
        (pays || []).forEach((p: any) => {
          const amt = Number(p.amount || 0);
          if (p.direction === 'PAID') paidMap[p.consignment_id] = (paidMap[p.consignment_id] || 0) + amt;
          if (p.direction === 'RECEIVED') recvMap[p.consignment_id] = (recvMap[p.consignment_id] || 0) + amt;
        });
        rows = rows.map(r => {
          const manualCost = costMap[r.id] || 0;
          const paid = paidMap[r.id] || 0;
          const total_cost = manualCost + paid;
          const received = recvMap[r.id] || 0;
          const billing = Number(r.customer_billing_amount || 0);
          return {
            ...r,
            total_cost,
            total_received: received,
            receivable: billing - received,
            payable: manualCost, // remaining unpaid manual cost entries
            estimated_profit: billing - total_cost,
          } as any;
        });
      }

      if (filters?.search) {
        const s = filters.search.toLowerCase();
        rows = rows.filter(r =>
          r.consignment_code?.toLowerCase().includes(s) ||
          r.customer?.name?.toLowerCase().includes(s) ||
          r.supplier?.name?.toLowerCase().includes(s) ||
          r.product_name?.toLowerCase().includes(s)
        );
      }
      return rows;
    },
  });
}

export function useConsignment(id: string | undefined) {
  return useQuery({
    queryKey: ['consignment', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('consignments').select(`
        *,
        customer:parties!consignments_customer_party_id_fkey(id, name, phone),
        supplier:parties!consignments_supplier_party_id_fkey(id, name, phone)
      `).eq('id', id).single();
      if (error) throw error;
      return data as Consignment;
    },
  });
}

export function useSaveConsignment() {
  const qc = useQueryClient();
  const storeId = useCurrentStoreId();
  return useMutation({
    mutationFn: async (payload: Partial<Consignment> & { id?: string }) => {
      const { id } = payload as any;
      const writableFields = [
        'consignment_code', 'customer_party_id', 'supplier_party_id', 'product_name', 'product_category',
        'quantity', 'unit', 'weight', 'cbm', 'origin_country', 'destination', 'shipment_mode', 'order_date',
        'expected_arrival_date', 'notes', 'shipment_id', 'container_number', 'tracking_number', 'vehicle_number',
        'agent_name', 'carrier_name', 'warehouse_location', 'current_location', 'eta', 'delivery_address',
        'status', 'customer_billing_amount', 'total_cost', 'estimated_profit', 'actual_profit',
        'is_completed', 'completed_at', 'is_locked',
      ];
      const rest = writableFields.reduce((acc: any, key) => {
        if (Object.prototype.hasOwnProperty.call(payload, key)) acc[key] = (payload as any)[key];
        return acc;
      }, {});
      if (id) {
        // Fetch previous to diff numeric/billing edits
        const { data: prev } = await (supabase as any).from('consignments').select('*').eq('id', id).single();
        const { data, error } = await (supabase as any).from('consignments').update(rest).eq('id', id).select().single();
        if (error) throw error;
        // Log meaningful edits
        const changed: Record<string, { from: any; to: any }> = {};
        Object.keys(rest).forEach(k => {
          const a = (prev as any)?.[k];
          const b = (rest as any)[k];
          if (String(a ?? '') !== String(b ?? '')) changed[k] = { from: a ?? null, to: b ?? null };
        });
        if (Object.keys(changed).length) {
          const amountFields = ['customer_billing_amount', 'total_cost', 'estimated_profit', 'actual_profit'];
          const isAmountEdit = Object.keys(changed).some(k => amountFields.includes(k));
          await logActivity({
            consignment_id: id,
            store_id: data.store_id,
            action: isAmountEdit ? 'AMOUNT_EDITED' : 'CONSIGNMENT_EDITED',
            details: { code: data.consignment_code, changed },
          });
        }
        return data;
      }
      const { data, error } = await (supabase as any).from('consignments').insert({ ...rest, store_id: storeId }).select().single();
      if (error) throw error;
      await logActivity({
        consignment_id: data.id,
        store_id: data.store_id,
        action: 'CONSIGNMENT_CREATED',
        details: { code: data.consignment_code, customer_billing_amount: data.customer_billing_amount },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consignments'] });
      qc.invalidateQueries({ queryKey: ['consignment'] });
      qc.invalidateQueries({ queryKey: ['consignment-activity-logs'] });
      toast.success('Consignment saved');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save'),
  });
}

export function useDeleteConsignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const meta = await getConsignmentMeta(id);
      const { error } = await (supabase as any).from('consignments').delete().eq('id', id);
      if (error) throw error;
      if (meta.store_id) {
        await logActivity({
          consignment_id: null,
          store_id: meta.store_id,
          action: 'CONSIGNMENT_DELETED',
          details: { code: meta.code, id },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consignments'] });
      qc.invalidateQueries({ queryKey: ['consignment-activity-logs'] });
      toast.success('Consignment deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete'),
  });
}

export function useUpdateConsignmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, remarks, storeId }: { id: string; status: ConsignmentStatus; remarks?: string; storeId: string }) => {
      const { data: prev } = await (supabase as any).from('consignments').select('status, consignment_code').eq('id', id).single();
      const patch: any = { status };
      if (status === 'COMPLETED') { patch.is_completed = true; patch.completed_at = new Date().toISOString(); patch.is_locked = true; }
      const { error } = await (supabase as any).from('consignments').update(patch).eq('id', id);
      if (error) throw error;
      const { data: user } = await supabase.auth.getUser();
      await (supabase as any).from('consignment_status_history').insert({
        consignment_id: id, store_id: storeId, previous_status: prev?.status, new_status: status, remarks, changed_by: user?.user?.id,
      });
      await logActivity({
        consignment_id: id,
        store_id: storeId,
        action: 'STATUS_CHANGED',
        details: { code: prev?.consignment_code, from: prev?.status, to: status, remarks },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consignments'] });
      qc.invalidateQueries({ queryKey: ['consignment'] });
      qc.invalidateQueries({ queryKey: ['consignment-history'] });
      qc.invalidateQueries({ queryKey: ['consignment-activity-logs'] });
      toast.success('Status updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });
}

export function useConsignmentStatusHistory(id: string | undefined) {
  return useQuery({
    queryKey: ['consignment-history', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('consignment_status_history').select('*').eq('consignment_id', id).order('changed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useConsignmentCosts(id: string | undefined) {
  return useQuery({
    queryKey: ['consignment-costs', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('consignment_costs').select('*').eq('consignment_id', id).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAddCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = await (supabase as any).from('consignment_costs').insert(row).select().single();
      if (error) throw error;
      const meta = await getConsignmentMeta(row.consignment_id);
      await logActivity({
        consignment_id: row.consignment_id,
        store_id: row.store_id || meta.store_id!,
        action: 'COST_ADDED',
        details: { code: meta.code, label: row.label || row.description, amount: row.amount },
      });
      return data;
    },
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: ['consignment-costs', vars.consignment_id] });
      qc.invalidateQueries({ queryKey: ['consignments'] });
      qc.invalidateQueries({ queryKey: ['consignment-activity-logs'] });
      toast.success('Cost added');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, consignment_id }: { id: string; consignment_id: string }) => {
      const { data: prev } = await (supabase as any).from('consignment_costs').select('*').eq('id', id).maybeSingle();
      const { error } = await (supabase as any).from('consignment_costs').delete().eq('id', id);
      if (error) throw error;
      const meta = await getConsignmentMeta(consignment_id);
      if (meta.store_id) {
        await logActivity({
          consignment_id,
          store_id: meta.store_id,
          action: 'COST_DELETED',
          details: { code: meta.code, label: prev?.label || prev?.description, amount: prev?.amount },
        });
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['consignment-costs', vars.consignment_id] });
      qc.invalidateQueries({ queryKey: ['consignments'] });
      qc.invalidateQueries({ queryKey: ['consignment-activity-logs'] });
    },
  });
}

export function useConsignmentPayments(id: string | undefined) {
  return useQuery({
    queryKey: ['consignment-payments', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('consignment_payments').select('*').eq('consignment_id', id).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = await (supabase as any).from('consignment_payments').insert(row).select().single();
      if (error) throw error;
      const meta = await getConsignmentMeta(row.consignment_id);
      await logActivity({
        consignment_id: row.consignment_id,
        store_id: row.store_id || meta.store_id!,
        action: row.direction === 'RECEIVED' ? 'PAYMENT_RECEIVED' : 'PAYMENT_PAID',
        details: { code: meta.code, direction: row.direction, amount: row.amount, method: row.method, note: row.note },
      });
      return data;
    },
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: ['consignment-payments', vars.consignment_id] });
      qc.invalidateQueries({ queryKey: ['consignments'] });
      qc.invalidateQueries({ queryKey: ['consignment-activity-logs'] });
      toast.success('Payment recorded');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, consignment_id }: { id: string; consignment_id: string }) => {
      const { data: prev } = await (supabase as any).from('consignment_payments').select('*').eq('id', id).maybeSingle();
      const { error } = await (supabase as any).from('consignment_payments').delete().eq('id', id);
      if (error) throw error;
      const meta = await getConsignmentMeta(consignment_id);
      if (meta.store_id) {
        await logActivity({
          consignment_id,
          store_id: meta.store_id,
          action: 'PAYMENT_DELETED',
          details: { code: meta.code, direction: prev?.direction, amount: prev?.amount, method: prev?.method },
        });
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['consignment-payments', vars.consignment_id] });
      qc.invalidateQueries({ queryKey: ['consignments'] });
      qc.invalidateQueries({ queryKey: ['consignment-activity-logs'] });
    },
  });
}

export interface ConsignmentActivityLog {
  id: string;
  consignment_id: string | null;
  store_id: string;
  action: string;
  details: any;
  performed_by: string | null;
  performed_at: string;
  performer_name?: string | null;
  consignment_code?: string | null;
}

export function useConsignmentActivityLogs(filters?: { startDate?: string; endDate?: string; action?: string; search?: string }) {
  const storeId = useCurrentStoreId();
  const filterByStore = useIsModuleStoreWise('inventory');
  return useQuery({
    queryKey: ['consignment-activity-logs', storeId, filterByStore, filters],
    enabled: !!storeId,
    queryFn: async () => {
      let q = (supabase as any).from('consignment_activity_logs').select('*').order('performed_at', { ascending: false }).limit(500);
      if (filterByStore && storeId) q = q.eq('store_id', storeId);
      if (filters?.startDate) q = q.gte('performed_at', filters.startDate);
      if (filters?.endDate) q = q.lte('performed_at', filters.endDate + 'T23:59:59');
      if (filters?.action && filters.action !== 'all') q = q.eq('action', filters.action);
      const { data, error } = await q;
      if (error) throw error;
      const logs = (data || []) as ConsignmentActivityLog[];

      const performerIds = [...new Set(logs.map(l => l.performed_by).filter(Boolean))] as string[];
      const consignmentIds = [...new Set(logs.map(l => l.consignment_id).filter(Boolean))] as string[];

      const [profilesRes, consignmentsRes] = await Promise.all([
        performerIds.length
          ? supabase.from('profiles').select('id, name').in('id', performerIds)
          : Promise.resolve({ data: [] as any[] }),
        consignmentIds.length
          ? (supabase as any).from('consignments').select('id, consignment_code').in('id', consignmentIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const pMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => { pMap[p.id] = p.name || 'Unknown'; });
      const cMap: Record<string, string> = {};
      (consignmentsRes.data || []).forEach((c: any) => { cMap[c.id] = c.consignment_code; });

      let enriched = logs.map(l => ({
        ...l,
        performer_name: l.performed_by ? pMap[l.performed_by] || null : null,
        consignment_code: l.consignment_id ? cMap[l.consignment_id] || l.details?.code || null : l.details?.code || null,
      }));

      if (filters?.search) {
        const s = filters.search.toLowerCase();
        enriched = enriched.filter(l =>
          (l.consignment_code || '').toLowerCase().includes(s) ||
          (l.performer_name || '').toLowerCase().includes(s) ||
          l.action.toLowerCase().includes(s) ||
          JSON.stringify(l.details || {}).toLowerCase().includes(s)
        );
      }
      return enriched;
    },
  });
}


export function useConsignmentDocuments(id: string | undefined) {
  return useQuery({
    queryKey: ['consignment-docs', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('consignment_documents').select('*').eq('consignment_id', id).order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, consignment_id, store_id, doc_type }: { file: File; consignment_id: string; store_id: string; doc_type: string }) => {
      const path = `${store_id}/${consignment_id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('consignment-docs').upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = await supabase.storage.from('consignment-docs').createSignedUrl(path, 60 * 60 * 24 * 365);
      const { data: user } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('consignment_documents').insert({
        consignment_id, store_id, doc_type, file_name: file.name, file_url: urlData?.signedUrl || path, file_size: file.size, uploaded_by: user?.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['consignment-docs', vars.consignment_id] });
      toast.success('Document uploaded');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; consignment_id: string }) => {
      const { error } = await (supabase as any).from('consignment_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['consignment-docs', vars.consignment_id] }),
  });
}
