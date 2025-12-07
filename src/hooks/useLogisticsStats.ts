import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

export interface LogisticsStats {
  totalSent: number;
  delivered: number;
  inTransit: number;
  pendingPickup: number;
  rto: number;
  deliveryRate: number;
  totalCod: number;
  codSettled: number;
  codPending: number;
}

export interface CourierStats {
  courier: string;
  total: number;
  delivered: number;
  inTransit: number;
  pendingPickup: number;
  rto: number;
  cancelled: number;
  codCollected: number;
  codPending: number;
  deliveryRate: number;
}

export function useLogisticsStats(dateFrom?: Date, dateTo?: Date) {
  const from = dateFrom || subDays(new Date(), 30);
  const to = dateTo || new Date();

  return useQuery({
    queryKey: ['logistics-stats', format(from, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_orders')
        .select('*')
        .gte('created_at', format(from, 'yyyy-MM-dd'))
        .lte('created_at', format(to, 'yyyy-MM-dd') + 'T23:59:59');

      if (error) throw error;

      const totalSent = data?.length || 0;
      const delivered = data?.filter(o => o.delivery_status === 'DELIVERED').length || 0;
      const inTransit = data?.filter(o => ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.delivery_status)).length || 0;
      const pendingPickup = data?.filter(o => o.delivery_status === 'PENDING_PICKUP').length || 0;
      const rto = data?.filter(o => ['RETURNED', 'RTO'].includes(o.delivery_status)).length || 0;
      const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
      
      const totalCod = data?.reduce((sum, o) => sum + (o.cod_amount || 0), 0) || 0;
      const codSettled = data?.filter(o => o.cod_collected).reduce((sum, o) => sum + (o.cod_amount || 0), 0) || 0;
      const codPending = totalCod - codSettled;

      return {
        totalSent,
        delivered,
        inTransit,
        pendingPickup,
        rto,
        deliveryRate: Number(deliveryRate.toFixed(2)),
        totalCod,
        codSettled,
        codPending,
      } as LogisticsStats;
    },
  });
}

export function useCourierComparison(dateFrom?: Date, dateTo?: Date) {
  const from = dateFrom || subDays(new Date(), 30);
  const to = dateTo || new Date();

  return useQuery({
    queryKey: ['courier-comparison', format(from, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_orders')
        .select('*')
        .gte('created_at', format(from, 'yyyy-MM-dd'))
        .lte('created_at', format(to, 'yyyy-MM-dd') + 'T23:59:59');

      if (error) throw error;

      const courierMap = new Map<string, CourierStats>();

      data?.forEach(order => {
        const courier = order.courier || 'UNKNOWN';
        const existing = courierMap.get(courier) || {
          courier,
          total: 0,
          delivered: 0,
          inTransit: 0,
          pendingPickup: 0,
          rto: 0,
          cancelled: 0,
          codCollected: 0,
          codPending: 0,
          deliveryRate: 0,
        };

        existing.total += 1;
        if (order.delivery_status === 'DELIVERED') existing.delivered += 1;
        if (['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(order.delivery_status)) existing.inTransit += 1;
        if (order.delivery_status === 'PENDING_PICKUP') existing.pendingPickup += 1;
        if (['RETURNED', 'RTO'].includes(order.delivery_status)) existing.rto += 1;
        if (order.delivery_status === 'CANCELED') existing.cancelled += 1;
        
        if (order.cod_collected) {
          existing.codCollected += order.cod_amount || 0;
        } else if (order.cod_amount) {
          existing.codPending += order.cod_amount;
        }

        courierMap.set(courier, existing);
      });

      const stats = Array.from(courierMap.values()).map(stat => ({
        ...stat,
        deliveryRate: stat.total > 0 ? Number(((stat.delivered / stat.total) * 100).toFixed(2)) : 0,
      }));

      return stats;
    },
  });
}

export function useCourierDetail(courier: string, dateFrom?: Date, dateTo?: Date) {
  const from = dateFrom || subDays(new Date(), 30);
  const to = dateTo || new Date();

  return useQuery({
    queryKey: ['courier-detail', courier, format(from, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_orders')
        .select('*')
        .ilike('courier', `%${courier}%`)
        .gte('created_at', format(from, 'yyyy-MM-dd'))
        .lte('created_at', format(to, 'yyyy-MM-dd') + 'T23:59:59')
        .order('created_at', { ascending: false});

      if (error) throw error;

      return data || [];
    },
  });
}

export function useCourierUpdates(orderId: string) {
  return useQuery({
    queryKey: ['courier-updates', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courier_updates')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!orderId,
  });
}
