import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

// Nepal timezone offset: UTC+5:45
const NEPAL_TIMEZONE = 'Asia/Kathmandu';

/**
 * Get current date in Nepal timezone as YYYY-MM-DD string
 */
export function getNepalDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: NEPAL_TIMEZONE });
}

/**
 * Get start of day in Nepal timezone as ISO string (for DB queries)
 */
export function getNepalDayStart(dateStr: string): string {
  // Create date at start of day in Nepal timezone
  return `${dateStr}T00:00:00+05:45`;
}

/**
 * Get end of day in Nepal timezone as ISO string (for DB queries)
 */
export function getNepalDayEnd(dateStr: string): string {
  // Create date at end of day in Nepal timezone
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
  insideValley: number;
  outsideValley: number;
  totalSales: number;
}

/**
 * Hook to fetch lead statistics for dashboard - includes ALL leads including confirmed
 * Uses Nepal timezone for date filtering
 */
export function useLeadDashboardStats(dateFrom?: string, dateTo?: string) {
  const queryClient = useQueryClient();
  
  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('leads-dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['lead-dashboard-stats'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['lead-dashboard-stats', dateFrom, dateTo],
    queryFn: async (): Promise<LeadStatsResult> => {
      let query = supabase
        .from('leads')
        .select('id, status, is_transferred, order_id, created_at');

      // Apply date filters using Nepal timezone
      if (dateFrom) {
        query = query.gte('created_at', getNepalDayStart(dateFrom));
      }
      if (dateTo) {
        query = query.lte('created_at', getNepalDayEnd(dateTo));
      }

      const { data, error } = await query;
      if (error) throw error;

      const leads = data || [];
      
      return {
        total: leads.length,
        confirmed: leads.filter(l => l.status === 'CONFIRMED' || l.order_id !== null).length,
        callNotReceived: leads.filter(l => l.status === 'CALL_NOT_RECEIVED').length,
        followUp: leads.filter(l => l.status === 'FOLLOW_UP').length,
        cancelled: leads.filter(l => l.status === 'CANCELLED').length,
        redirect: leads.filter(l => l.status === 'REDIRECT').length,
        pendingTransfer: leads.filter(l => l.is_transferred === false).length,
        newLeads: leads.filter(l => l.status === 'NEW').length,
        assigned: leads.filter(l => l.status === 'ASSIGNED').length,
      };
    },
  });
}

/**
 * Hook to fetch order statistics for dashboard
 * Uses Nepal timezone for date filtering
 */
export function useOrderDashboardStats(dateFrom?: string, dateTo?: string) {
  const queryClient = useQueryClient();
  
  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('orders-dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['order-dashboard-stats'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['order-dashboard-stats', dateFrom, dateTo],
    queryFn: async (): Promise<OrderStatsResult> => {
      let query = supabase
        .from('orders')
        .select('id, order_status, delivery_location, amount, is_deleted')
        .eq('is_deleted', false);

      // Apply date filters using Nepal timezone
      if (dateFrom) {
        query = query.gte('order_date', getNepalDayStart(dateFrom));
      }
      if (dateTo) {
        query = query.lte('order_date', getNepalDayEnd(dateTo));
      }

      const { data, error } = await query;
      if (error) throw error;

      const orders = data || [];
      const validStatuses = ['CONFIRMED', 'DISPATCHED', 'DELIVERED', 'PACKED'];
      const salesOrders = orders.filter(o => validStatuses.includes(o.order_status || ''));
      
      return {
        total: orders.length,
        confirmed: orders.filter(o => o.order_status === 'CONFIRMED').length,
        dispatched: orders.filter(o => o.order_status === 'DISPATCHED').length,
        delivered: orders.filter(o => o.order_status === 'DELIVERED').length,
        returned: orders.filter(o => o.order_status === 'RETURNED').length,
        cancelled: orders.filter(o => o.order_status === 'CANCELLED').length,
        insideValley: salesOrders.filter(o => o.delivery_location === 'INSIDE_VALLEY').length,
        outsideValley: salesOrders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length,
        totalSales: salesOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
      };
    },
  });
}

/**
 * Hook for staff-specific lead stats (CallingDashboard)
 * Fetches leads assigned to a specific user
 */
export function useStaffLeadStats(userId?: string, dateFrom?: string, dateTo?: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel(`staff-leads-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        // Only invalidate if the lead is assigned to this user
        const newData = payload.new as any;
        const oldData = payload.old as any;
        if (newData?.assigned_to_user_id === userId || oldData?.assigned_to_user_id === userId) {
          queryClient.invalidateQueries({ queryKey: ['staff-lead-stats', userId] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  return useQuery({
    queryKey: ['staff-lead-stats', userId, dateFrom, dateTo],
    queryFn: async () => {
      if (!userId) return null;

      let query = supabase
        .from('leads')
        .select('id, status, order_id, assigned_at, current_team')
        .eq('assigned_to_user_id', userId);

      // Filter by assigned_at date using Nepal timezone
      if (dateFrom) {
        query = query.gte('assigned_at', getNepalDayStart(dateFrom));
      }
      if (dateTo) {
        query = query.lte('assigned_at', getNepalDayEnd(dateTo));
      }

      const { data, error } = await query;
      if (error) throw error;

      const leads = data || [];
      const callingLeads = leads.filter(l => l.current_team === 'CALLING');
      
      return {
        total: leads.length,
        callingTotal: callingLeads.length,
        confirmed: leads.filter(l => l.status === 'CONFIRMED' || l.order_id !== null).length,
        callNotReceived: leads.filter(l => l.status === 'CALL_NOT_RECEIVED').length,
        followUp: leads.filter(l => l.status === 'FOLLOW_UP').length,
        cancelled: leads.filter(l => l.status === 'CANCELLED').length,
        pending: leads.filter(l => ['NEW', 'ASSIGNED'].includes(l.status)).length,
        remainingToCall: callingLeads.filter(l => 
          !['CONFIRMED', 'CANCELLED'].includes(l.status)
        ).length,
      };
    },
    enabled: !!userId,
  });
}

/**
 * Hook for staff-specific order stats
 */
export function useStaffOrderStats(userId?: string, dateFrom?: string, dateTo?: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel(`staff-orders-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const newData = payload.new as any;
        const oldData = payload.old as any;
        if (newData?.sales_person_id === userId || oldData?.sales_person_id === userId) {
          queryClient.invalidateQueries({ queryKey: ['staff-order-stats', userId] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  return useQuery({
    queryKey: ['staff-order-stats', userId, dateFrom, dateTo],
    queryFn: async () => {
      if (!userId) return null;

      let query = supabase
        .from('orders')
        .select('id, order_status, delivery_location, inside_delivery_status, amount, is_deleted')
        .eq('sales_person_id', userId)
        .eq('is_deleted', false);

      if (dateFrom) {
        query = query.gte('order_date', getNepalDayStart(dateFrom));
      }
      if (dateTo) {
        query = query.lte('order_date', getNepalDayEnd(dateTo));
      }

      const { data, error } = await query;
      if (error) throw error;

      const orders = data || [];
      const insideValleyOrders = orders.filter(o => o.delivery_location === 'INSIDE_VALLEY');
      
      return {
        total: orders.length,
        insideValley: {
          total: insideValleyOrders.length,
          delivered: insideValleyOrders.filter(o => o.inside_delivery_status === 'DELIVERED').length,
          pending: insideValleyOrders.filter(o => !o.inside_delivery_status || o.inside_delivery_status === 'PENDING').length,
          reachedCNR: insideValleyOrders.filter(o => o.inside_delivery_status === 'REACHED_CNR').length,
          customerCancelled: insideValleyOrders.filter(o => o.inside_delivery_status === 'CUSTOMER_CANCELLED').length,
        },
        outsideValley: orders.filter(o => o.delivery_location === 'OUTSIDE_VALLEY').length,
      };
    },
    enabled: !!userId,
  });
}
