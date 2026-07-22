import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';

export type CourierProvider = 'NCM' | 'GBL' | 'PATHAO' | 'GAAUBESI';
export type LogisticsDeliveryStatus = 
  | 'PENDING_PICKUP' 
  | 'PICKED_UP' 
  | 'IN_TRANSIT' 
  | 'OUT_FOR_DELIVERY' 
  | 'DELIVERED' 
  | 'CANCELED' 
  | 'RTO' 
  | 'RETURNED_TO_SELLER';
export type CODSettlementStatus = 'PENDING' | 'SETTLED' | 'PARTIAL';

export interface LogisticsSettings {
  id: string;
  courier: CourierProvider;
  display_name: string | null;
  is_active: boolean;
  api_base_url: string | null;
  api_token: string | null;
  default_pickup_address: string | null;
  default_sender_name: string | null;
  default_sender_phone: string | null;
  partner_id: string | null;
  account_type: string | null;
  client_id: string | null;
  client_password: string | null;
  secret_key: string | null;
  store_id: string | null;
  pickup_city: string | null;
  pickup_branch: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogisticsOrder {
  id: string;
  order_id: string | null;
  courier: CourierProvider;
  tracking_id: string | null;
  parcel_code: string | null;
  courier_order_id: string | null;
  delivery_status: LogisticsDeliveryStatus;
  courier_status: string | null;
  status_updated_at: string | null;
  pickup_date: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  cod_amount: number | null;
  cod_collected: boolean;
  cod_settled: boolean;
  customer_name: string;
  customer_phone: string;
  full_address: string;
  product_name: string | null;
  quantity: number;
  weight_grams: number;
  api_response: any;
  last_webhook_data: any;
  last_error: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  orders?: {
    id: string;
    store_id?: string | null;
    leads?: { client_name: string; contact_number: string } | null;
    products?: { name: string } | null;
    amount: number | null;
  } | null;
}

export interface CODSettlement {
  id: string;
  courier: CourierProvider;
  logistics_order_id: string | null;
  order_id: string | null;
  cod_amount: number;
  settled_amount: number;
  pending_amount: number | null;
  status: CODSettlementStatus;
  settlement_date: string | null;
  bank_reference: string | null;
  courier_settlement_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutingRule {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  is_active: boolean;
  delivery_location: string | null;
  districts: string[] | null;
  min_weight_grams: number | null;
  max_weight_grams: number | null;
  is_cod: boolean | null;
  recommended_courier: CourierProvider;
  created_at: string;
  updated_at: string;
}

// Hook to fetch logistics settings
export function useLogisticsSettings() {
  return useQuery({
    queryKey: ['logistics-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_settings')
        .select('*')
        .order('courier');
      if (error) throw error;
      return data as LogisticsSettings[];
    },
  });
}

// Hook to save logistics settings (insert if no id, update if id present)
export function useSaveLogisticsSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Partial<LogisticsSettings> & { courier: CourierProvider }) => {
      const payload: any = { ...settings };
      let result;
      if (settings.id) {
        const { data, error } = await supabase
          .from('logistics_settings')
          .update(payload)
          .eq('id', settings.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        delete payload.id;
        const { data, error } = await supabase
          .from('logistics_settings')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        result = data;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics-settings'] });
      queryClient.invalidateQueries({ queryKey: ['connected-couriers'] });
      toast.success('Settings saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}

// Hook to delete a logistics settings row
export function useDeleteLogisticsSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('logistics_settings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics-settings'] });
      queryClient.invalidateQueries({ queryKey: ['connected-couriers'] });
      toast.success('Courier removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Hook to fetch logistics orders
export function useLogisticsOrders(filters?: {
  courier?: CourierProvider;
  status?: LogisticsDeliveryStatus;
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
}) {
  const currentStoreId = useCurrentStoreId();
  const storeId = filters?.storeId || currentStoreId;

  return useQuery({
    queryKey: ['logistics-orders', filters, storeId],
    queryFn: async () => {
      let query = supabase
        .from('logistics_orders')
        .select(`
          *,
          orders (
            id,
            amount,
            store_id,
            leads ( client_name, contact_number ),
            products ( name )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (filters?.courier) {
        query = query.eq('courier', filters.courier);
      }
      if (filters?.status) {
        query = query.eq('delivery_status', filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by store_id through the orders relation
      let result = data as LogisticsOrder[];
      if (storeId) {
        result = result.filter(lo => lo.orders?.store_id === storeId || !lo.orders);
      }
      
      return result;
    },
    enabled: !!storeId,
  });
}

// Hook to send order to courier
export function useSendToCourier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      orderId: string;
      courier: CourierProvider;
      customerName: string;
      customerPhone: string;
      fullAddress: string;
      codAmount: number;
      productName: string;
      quantity: number;
      weightGrams?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-to-courier', {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order sent to courier successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send to courier: ${error.message}`);
    },
  });
}

// Hook to fetch COD settlements
export function useCODSettlements(filters?: {
  courier?: CourierProvider;
  status?: CODSettlementStatus;
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
}) {
  const currentStoreId = useCurrentStoreId();
  const storeId = filters?.storeId || currentStoreId;

  return useQuery({
    queryKey: ['cod-settlements', filters, storeId],
    queryFn: async () => {
      let query = supabase
        .from('cod_settlements')
        .select(`
          *,
          orders (store_id)
        `)
        .order('created_at', { ascending: false });
      
      if (filters?.courier) {
        query = query.eq('courier', filters.courier);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by store_id through orders relation
      let result = data as (CODSettlement & { orders?: { store_id: string } })[];
      if (storeId) {
        result = result.filter(s => s.orders?.store_id === storeId || !s.orders);
      }
      
      return result as CODSettlement[];
    },
    enabled: !!storeId,
  });
}

// Hook to fetch routing rules
export function useRoutingRules() {
  return useQuery({
    queryKey: ['routing-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routing_rules')
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as RoutingRule[];
    },
  });
}

// Hook to save routing rule
export function useSaveRoutingRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rule: Partial<RoutingRule>) => {
      if (rule.id) {
        const { id, ...updateData } = rule;
        const { data, error } = await supabase
          .from('routing_rules')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('routing_rules')
          .insert(rule as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-rules'] });
      toast.success('Routing rule saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save rule: ${error.message}`);
    },
  });
}

// Hook to delete routing rule
export function useDeleteRoutingRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('routing_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-rules'] });
      toast.success('Rule deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });
}

// Hook to get recommended courier based on routing rules
export function useRecommendedCourier(deliveryLocation?: string) {
  const { data: rules = [] } = useRoutingRules();
  
  if (!deliveryLocation) return null;
  
  const matchingRule = rules
    .filter(r => r.is_active)
    .sort((a, b) => b.priority - a.priority)
    .find(r => !r.delivery_location || r.delivery_location === deliveryLocation);
  
  return matchingRule?.recommended_courier || null;
}

// Hook to test courier connection
export function useTestCourierConnection() {
  return useMutation({
    mutationFn: async (courier: CourierProvider) => {
      const { data, error } = await supabase.functions.invoke('test-courier-connection', {
        body: { courier },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success('Connection successful');
      } else {
        toast.error(`Connection failed: ${data?.message || 'Unknown error'}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Connection test failed: ${error.message}`);
    },
  });
}

// Logistics dashboard metrics
export function useLogisticsDashboardMetrics(dateFrom?: string, dateTo?: string) {
  const { data: orders = [] } = useLogisticsOrders({ dateFrom, dateTo });
  const { data: settlements = [] } = useCODSettlements({ dateFrom, dateTo });
  
  const metrics = {
    byCourier: {
      NCM: { total: 0, delivered: 0, rto: 0, inTransit: 0 },
      GBL: { total: 0, delivered: 0, rto: 0, inTransit: 0 },
      PATHAO: { total: 0, delivered: 0, rto: 0, inTransit: 0 },
      GAAUBESI: { total: 0, delivered: 0, rto: 0, inTransit: 0 },
    },
    total: {
      orders: orders.length,
      delivered: 0,
      rto: 0,
      inTransit: 0,
      pendingPickup: 0,
    },
    cod: {
      total: 0,
      settled: 0,
      pending: 0,
    },
  };
  
  orders.forEach(order => {
    const courier = order.courier as CourierProvider;
    metrics.byCourier[courier].total++;
    
    if (order.delivery_status === 'DELIVERED') {
      metrics.byCourier[courier].delivered++;
      metrics.total.delivered++;
    } else if (order.delivery_status === 'RTO' || order.delivery_status === 'RETURNED_TO_SELLER') {
      metrics.byCourier[courier].rto++;
      metrics.total.rto++;
    } else if (order.delivery_status === 'IN_TRANSIT' || order.delivery_status === 'OUT_FOR_DELIVERY') {
      metrics.byCourier[courier].inTransit++;
      metrics.total.inTransit++;
    } else if (order.delivery_status === 'PENDING_PICKUP') {
      metrics.total.pendingPickup++;
    }
    
    if (order.cod_amount) {
      metrics.cod.total += order.cod_amount;
    }
  });
  
  settlements.forEach(s => {
    if (s.status === 'SETTLED') {
      metrics.cod.settled += s.settled_amount || 0;
    } else {
      metrics.cod.pending += s.pending_amount || s.cod_amount || 0;
    }
  });
  
  return metrics;
}
