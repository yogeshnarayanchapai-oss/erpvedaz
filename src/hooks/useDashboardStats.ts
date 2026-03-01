import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { useLeadAssignmentCounts } from './useLeadAssignmentCounts';

// Nepal timezone offset: UTC+5:45
const NEPAL_TIMEZONE = 'Asia/Kathmandu';

export function getNepalDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: NEPAL_TIMEZONE });
}

export function getNepalDayStart(dateStr: string): string {
  return `${dateStr}T00:00:00+05:45`;
}

export function getNepalDayEnd(dateStr: string): string {
  return `${dateStr}T23:59:59+05:45`;
}

interface LeadStatsResult {
  total: number;
  confirmed: number;
  callNotReceived: number;
  followUp: number;
  cancelled: number;
  redirect: number;
  pendingTransfer: number;
  newLeads: number;
  assigned: number;
}

interface OrderStatsResult {
  total: number;
  confirmed: number;
  dispatched: number;
  delivered: number;
  returned: number;
  cancelled: number;
  redirect: number;
  insideValley: number;
  outsideValley: number;
  totalSales: number;
}

/**
 * Hook to fetch lead + order statistics via single RPC call
 * NO realtime subscriptions — uses staleTime + refetchInterval for freshness
 */
export function useLeadDashboardStats(dateFrom?: string, dateTo?: string) {
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  // NO realtime subscription — polling only

  return useQuery({
    queryKey: ['lead-dashboard-stats', dateFrom, dateTo, storeId],
    queryFn: async (): Promise<LeadStatsResult> => {
      if (!storeId || !dateFrom || !dateTo) {
        return { total: 0, confirmed: 0, callNotReceived: 0, followUp: 0, cancelled: 0, redirect: 0, pendingTransfer: 0, newLeads: 0, assigned: 0 };
      }

      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_store_id: storeId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });

      if (error) throw error;

      const leads = (data as any)?.leads;
      return {
        total: leads?.total ?? 0,
        confirmed: leads?.confirmed ?? 0,
        callNotReceived: leads?.cnr ?? 0,
        followUp: leads?.followup ?? 0,
        cancelled: leads?.cancelled ?? 0,
        redirect: leads?.redirect ?? 0,
        pendingTransfer: leads?.pending_transfer ?? 0,
        newLeads: leads?.new ?? 0,
        assigned: leads?.assigned ?? 0,
      };
    },
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60000, // Refresh every 60s
    refetchIntervalInBackground: false,
  });
}

export function useOrderDashboardStats(dateFrom?: string, dateTo?: string) {
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  // NO realtime subscription — polling only

  return useQuery({
    queryKey: ['order-dashboard-stats', dateFrom, dateTo, storeId],
    queryFn: async (): Promise<OrderStatsResult> => {
      if (!storeId || !dateFrom || !dateTo) {
        return { total: 0, confirmed: 0, dispatched: 0, delivered: 0, returned: 0, cancelled: 0, redirect: 0, insideValley: 0, outsideValley: 0, totalSales: 0 };
      }

      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_store_id: storeId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });

      if (error) throw error;

      const orders = (data as any)?.orders;
      return {
        total: orders?.total ?? 0,
        confirmed: orders?.confirmed ?? 0,
        dispatched: orders?.dispatched ?? 0,
        delivered: orders?.delivered ?? 0,
        returned: orders?.returned ?? 0,
        cancelled: orders?.cancelled ?? 0,
        redirect: orders?.redirect ?? 0,
        insideValley: orders?.inside_valley ?? 0,
        outsideValley: orders?.outside_valley ?? 0,
        totalSales: orders?.total_sales ?? 0,
      };
    },
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
}

/**
 * Staff-specific lead stats — NO realtime, uses polling
 */
export function useStaffLeadStats(userId?: string, dateFrom?: string, dateTo?: string) {
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;
  
  const { data: leadCounts } = useLeadAssignmentCounts({
    staffId: userId,
    dateFrom: dateFrom || '',
    dateTo: dateTo || '',
    excludeSelfCreated: false,
  });

  // NO realtime subscriptions — replaced with polling

  return useQuery({
    queryKey: ['staff-lead-stats', userId, dateFrom, dateTo, storeId, leadCounts?.countsByStaff],
    queryFn: async () => {
      if (!userId) return null;

      let currentQuery = supabase
        .from('leads')
        .select('id, status, order_id, date, current_team, created_by_user_id, assigned_at, store_id, first_assigned_to_user_id, created_at')
        .eq('assigned_to_user_id', userId);

      if (storeId) currentQuery = currentQuery.eq('store_id', storeId);
      if (dateFrom && dateTo) {
        currentQuery = currentQuery.gte('date', dateFrom).lte('date', dateTo);
      } else if (dateFrom) {
        currentQuery = currentQuery.gte('date', dateFrom);
      }

      let assignedCount = 0;
      if (dateFrom && dateTo && leadCounts) {
        assignedCount = leadCounts.countsByStaff[userId] || 0;
      } else {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('total_leads_ever_assigned')
          .eq('id', userId)
          .single();
        assignedCount = profileData?.total_leads_ever_assigned ?? 0;
      }

      const currentResult = await currentQuery;
      if (currentResult.error) throw currentResult.error;

      const currentLeads = currentResult.data || [];
      const callingLeads = currentLeads.filter(l => l.current_team === 'CALLING');
      const pendingStatuses = ['NEW', 'ASSIGNED', null, ''];
      
      return {
        total: currentLeads.length,
        callingTotal: callingLeads.length,
        assigned: assignedCount,
        currentAssigned: currentLeads.length,
        confirmed: currentLeads.filter(l => l.status === 'CONFIRMED' || l.order_id !== null).length,
        callNotReceived: currentLeads.filter(l => l.status === 'CALL_NOT_RECEIVED').length,
        followUp: currentLeads.filter(l => l.status === 'FOLLOW_UP').length,
        cancelled: currentLeads.filter(l => l.status === 'CANCELLED').length,
        pending: currentLeads.filter(l => pendingStatuses.includes(l.status)).length,
        remainingToCall: callingLeads.filter(l => pendingStatuses.includes(l.status) || !l.status).length,
      };
    },
    enabled: !!userId && !!storeId,
    staleTime: 30000, // 30s
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
}

/**
 * Staff-specific order stats — NO realtime, uses polling
 */
export function useStaffOrderStats(userId?: string, dateFrom?: string, dateTo?: string) {
  const { currentStore } = useCurrentStore();
  const storeId = currentStore?.id;

  // NO realtime subscription — replaced with polling

  return useQuery({
    queryKey: ['staff-order-stats', userId, dateFrom, dateTo, storeId],
    queryFn: async () => {
      if (!userId) return null;

      let query = supabase
        .from('orders')
        .select('id, order_status, delivery_location, inside_delivery_status, amount, is_deleted, store_id')
        .eq('sales_person_id', userId)
        .eq('is_deleted', false);

      if (storeId) query = query.eq('store_id', storeId);
      if (dateFrom) query = query.gte('order_date', getNepalDayStart(dateFrom));
      if (dateTo) query = query.lte('order_date', getNepalDayEnd(dateTo));

      const { data, error } = await query;
      if (error) throw error;

      const orders = data || [];
      const insideValleyOrders = orders.filter(o => o.delivery_location === 'INSIDE_VALLEY');
      
      return {
        total: orders.length,
        insideValley: {
          total: insideValleyOrders.length,
          delivered: insideValleyOrders.filter(o => o.inside_delivery_status === 'DELIVERED').length,
          pending: insideValleyOrders.filter(o => o.inside_delivery_status === 'PENDING').length,
          reachedCNR: insideValleyOrders.filter(o => o.inside_delivery_status === 'REACHED_CNR').length,
          customerCancelled: insideValleyOrders.filter(o => o.inside_delivery_status === 'CANCELLED').length,
        },
        outsideValley: orders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length,
      };
    },
    enabled: !!userId && !!storeId,
    staleTime: 30000,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
}
